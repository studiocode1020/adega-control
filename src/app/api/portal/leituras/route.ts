import { createHash } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { decidir, lerCorpo, type Contexto, type TipoEvento } from '@/lib/portal/decidir';

// O aparelho da porta (ESP32) manda para cá as passagens de etiqueta que viu.
//
//   POST /api/portal/leituras
//   Authorization: Bearer <chave do aparelho, gerada na tela Portal RFID>
//   { "firmware": "...", "avistamentos": [ ... ] }   (formato em lib/portal/decidir.ts)
//
// Não há sessão de usuário aqui: o aparelho se identifica pela chave, e a
// rota grava em nome do dono dele com a secret key. Nada muda no estoque —
// cada passagem vira, no máximo, um evento pendente para o dono confirmar.
//
// Responde 200 quando terminou de processar; o aparelho só apaga do buffer
// dele o que recebeu 200, e reenvia o resto. Reenvio não duplica nada: a
// passagem repetida é reconhecida pelo id que o próprio aparelho deu.
//
// Lista vazia é válida e serve de "estou vivo" (atualiza o último contato).

function hashDaChave(chave: string) {
  return createHash('sha256').update(chave).digest('hex');
}

function json(corpo: unknown, status = 200) {
  return Response.json(corpo, { status });
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const chave = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (chave.length < 20) return json({ erro: 'faltou a chave do aparelho' }, 401);
  if (!process.env.SUPABASE_SECRET_KEY) return json({ erro: 'servidor sem SUPABASE_SECRET_KEY' }, 500);

  const supabase = adminClient();
  const { data: aparelho, error: erroAparelho } = await supabase
    .from('portal_devices')
    .select('id, owner_id')
    .eq('token_hash', hashDaChave(chave))
    .maybeSingle();
  if (erroAparelho) return json({ erro: 'falha ao consultar o aparelho' }, 500);
  if (!aparelho) return json({ erro: 'chave recusada' }, 401);

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'corpo não é JSON' }, 400);
  }

  const agora = Date.now();
  const lido = lerCorpo(corpo, agora);
  if ('erro' in lido) return json({ erro: lido.erro }, 400);

  await supabase
    .from('portal_devices')
    .update({ last_seen_at: new Date(agora).toISOString(), ...(lido.firmware ? { firmware: lido.firmware } : {}) })
    .eq('id', aparelho.id);

  const dono = aparelho.owner_id as string;
  let repetidos = 0;
  const eventos: { epc: string; tipo: TipoEvento }[] = [];
  const ignorados: { epc: string; motivo: string }[] = [];

  try {
    for (const av of lido.avistamentos) {
      // 1. registra a passagem crua; se já existia, é reenvio e para aqui
      const { data: novos, error: erroLeitura } = await supabase
        .from('portal_reads')
        .upsert(
          {
            owner_id: dono,
            device_id: aparelho.id,
            sighting_id: av.id,
            epc: av.epc,
            started_at: new Date(av.inicio).toISOString(),
            ended_at: new Date(av.fim).toISOString(),
            reads: av.leituras,
            direction: av.direcao,
          },
          { onConflict: 'device_id,sighting_id', ignoreDuplicates: true },
        )
        .select('id');
      if (erroLeitura) throw erroLeitura;
      if (!novos?.length) {
        repetidos++;
        continue;
      }
      const leituraId = novos[0].id as string;

      // 2. o que o banco sabe desta etiqueta
      const [garrafa, pendente, anterior] = await Promise.all([
        supabase.from('bottles').select('id, wine_id, status').eq('owner_id', dono).eq('epc', av.epc).maybeSingle(),
        supabase
          .from('portal_events')
          .select('kind')
          .eq('owner_id', dono)
          .eq('epc', av.epc)
          .eq('status', 'pending')
          .order('detected_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('portal_reads')
          .select('ended_at')
          .eq('owner_id', dono)
          .eq('epc', av.epc)
          .neq('id', leituraId)
          .lte('started_at', new Date(av.inicio).toISOString())
          .order('ended_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const erro = garrafa.error ?? pendente.error ?? anterior.error;
      if (erro) throw erro;

      const ctx: Contexto = {
        garrafa: garrafa.data
          ? { id: garrafa.data.id, wineId: garrafa.data.wine_id, status: garrafa.data.status }
          : null,
        pendente: pendente.data ? { tipo: pendente.data.kind as TipoEvento } : null,
        passagemAnteriorFim: anterior.data ? new Date(anterior.data.ended_at).getTime() : null,
      };

      // 3. decide e registra
      const d = decidir(av, ctx);
      if (d.acao === 'evento') {
        const { error: erroEvento } = await supabase.from('portal_events').insert({
          owner_id: dono,
          device_id: aparelho.id,
          read_id: leituraId,
          epc: av.epc,
          bottle_id: ctx.garrafa?.id ?? null,
          wine_id: ctx.garrafa?.wineId ?? null,
          kind: d.tipo,
          confidence: d.confianca,
          reason: d.motivo,
          detected_at: new Date(av.fim).toISOString(),
        });
        if (erroEvento) throw erroEvento;
        eventos.push({ epc: av.epc, tipo: d.tipo });
      } else {
        ignorados.push({ epc: av.epc, motivo: d.motivo });
      }
      await supabase
        .from('portal_reads')
        .update({ decision: d.acao === 'evento' ? `evento:${d.tipo}` : `ignorado: ${d.motivo}` })
        .eq('id', leituraId);
    }
  } catch (erro) {
    // O aparelho vai reenviar o lote inteiro; o que já foi gravado vira
    // "repetido" e não se duplica.
    console.error('[portal] falha ao processar leituras', erro);
    return json({ erro: 'falha ao gravar; reenvie' }, 500);
  }

  return json({
    ok: true,
    recebidos: lido.avistamentos.length,
    repetidos,
    eventos,
    ignorados,
    recusados: lido.recusados,
  });
}
