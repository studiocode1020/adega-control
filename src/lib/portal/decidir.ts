/**
 * O cérebro do portal RFID: o que uma passagem de etiqueta pela porta significa.
 *
 * O leitor responde só "QUAL garrafa passou". O sentido (entrou ou saiu) vem
 * do ESTADO da garrafa: se ela constava na adega, só pode estar saindo; se
 * constava fora, está voltando. É a lógica da catraca com cartão: o cartão
 * não diz o sentido, o sistema é que sabe se você já tinha entrado.
 *
 * O ponto fraco é a leitura perdida: se a saída não foi lida, a volta parece
 * saída. Por isso nada aqui mexe no estoque — tudo vira evento PENDENTE, que o
 * dono confirma no app com um toque, e o erro aparece em vez de ficar escondido.
 * Se um dia houver sensor de passagem no batente (par de infravermelhos), o
 * sentido medido entra em `direcao` e a confiança sobe.
 *
 * Este arquivo não importa nada de propósito: roda igual no servidor e no
 * teste (`npm run test:portal`), sem banco e sem hardware.
 */

export type Direcao = 'entrada' | 'saida';
export type StatusGarrafa = 'na_adega' | 'fora';
export type Confianca = 'alta' | 'media' | 'baixa';
export type TipoEvento = Direcao | 'etiqueta_nova';

/**
 * Uma passagem: a etiqueta foi lida de `inicio` até `fim` e depois sumiu.
 * O aparelho junta as leituras seguidas da mesma etiqueta numa passagem só.
 */
export interface Avistamento {
  /** id gerado pelo aparelho; o mesmo id reenviado é a mesma passagem */
  id: string;
  epc: string;
  /** ms desde 1970 (Date.now) */
  inicio: number;
  fim: number;
  leituras: number;
  /** sentido medido por sensor de passagem; null = ninguém mediu */
  direcao: Direcao | null;
}

/** O que o banco sabe sobre esta etiqueta no momento da passagem. */
export interface Contexto {
  garrafa: { id: string; wineId: string; status: StatusGarrafa } | null;
  /** evento ainda não confirmado mais recente desta etiqueta */
  pendente: { tipo: TipoEvento } | null;
  /** quando terminou a passagem anterior desta etiqueta (ms), se houve */
  passagemAnteriorFim: number | null;
}

export const REGRAS = {
  /**
   * Passagem que começa menos de 30 s depois da anterior é a mesma pessoa
   * parada na porta, ou garrafa esquecida na beira do alcance — não é uma
   * segunda travessia.
   */
  continuacaoMs: 30_000,
  /**
   * Quem atravessa a porta fica poucos segundos no alcance do leitor. Lida
   * por mais tempo que isso, a garrafa provavelmente foi só deixada perto.
   */
  permanenciaLongaMs: 30_000,
};

export type Decisao =
  | { acao: 'ignorar'; motivo: string }
  | { acao: 'evento'; tipo: TipoEvento; confianca: Confianca; motivo: string };

function statusApos(tipo: Direcao): StatusGarrafa {
  return tipo === 'saida' ? 'fora' : 'na_adega';
}

function segundos(ms: number) {
  return Math.round(ms / 1000);
}

export function decidir(av: Avistamento, ctx: Contexto, regras = REGRAS): Decisao {
  if (ctx.passagemAnteriorFim !== null) {
    const intervalo = av.inicio - ctx.passagemAnteriorFim;
    if (intervalo < regras.continuacaoMs) {
      return {
        acao: 'ignorar',
        motivo: `mesma passagem: a etiqueta tinha sido lida ${segundos(Math.max(intervalo, 0))} s antes`,
      };
    }
  }

  if (!ctx.garrafa) {
    if (ctx.pendente?.tipo === 'etiqueta_nova') {
      return { acao: 'ignorar', motivo: 'etiqueta nova já avisada, aguardando vínculo' };
    }
    return {
      acao: 'evento',
      tipo: 'etiqueta_nova',
      confianca: 'media',
      motivo: 'Etiqueta que ainda não está ligada a nenhum vinho.',
    };
  }

  // Um evento pendente é o que provavelmente aconteceu e ainda não foi
  // confirmado: a garrafa que "saiu" e não foi confirmada e passou de novo
  // está voltando, não saindo outra vez.
  const pendente = ctx.pendente && ctx.pendente.tipo !== 'etiqueta_nova' ? ctx.pendente.tipo : null;
  const status = pendente ? statusApos(pendente) : ctx.garrafa.status;
  const esperada: Direcao = status === 'na_adega' ? 'saida' : 'entrada';
  const ficou = av.fim - av.inicio;
  const longa = ficou > regras.permanenciaLongaMs;
  const avisoLonga = longa
    ? ` Ficou ${segundos(ficou)} s ao alcance do leitor: pode ter sido só deixada perto da porta.`
    : '';

  if (av.direcao) {
    if (av.direcao === esperada) {
      return {
        acao: 'evento',
        tipo: esperada,
        confianca: longa ? 'media' : 'alta',
        motivo: 'O sensor da porta e o estoque concordam.' + avisoLonga,
      };
    }
    // O sensor acabou de medir; a nossa memória pode ter perdido uma passagem.
    return {
      acao: 'evento',
      tipo: av.direcao,
      confianca: 'baixa',
      motivo:
        `O sensor da porta viu ${av.direcao === 'saida' ? 'saída' : 'entrada'}, mas a garrafa ` +
        `constava ${status === 'na_adega' ? 'na adega' : 'fora'}. Provavelmente uma passagem ` +
        'anterior não foi lida.' + avisoLonga,
    };
  }

  const base =
    esperada === 'saida'
      ? 'Constava na adega, então está saindo.'
      : 'Constava fora da adega, então está voltando.';
  const avisoPendente = pendente ? ' Há uma detecção anterior desta garrafa ainda sem confirmar.' : '';
  return {
    acao: 'evento',
    tipo: esperada,
    confianca: longa ? 'baixa' : 'media',
    motivo: base + avisoPendente + avisoLonga,
  };
}

// ------------------------------------------------------- corpo do aparelho
//
// O aparelho não tem relógio confiável (sem NTP ele não sabe a hora), então
// manda "há quantos ms" cada passagem começou e terminou, contados no momento
// do envio. O servidor converte para hora absoluta com o próprio relógio.
//
//   { "firmware": "portal-adega 0.4",
//     "avistamentos": [
//       { "id": "a1b2c3d4-17", "epc": "E280...", "idade_inicio_ms": 5400,
//         "idade_fim_ms": 2600, "leituras": 9, "direcao": null } ] }

export const LIMITE_AVISTAMENTOS = 100;
/** Passagem mais velha que isto é descartada (aparelho travado reenviando lixo). */
const IDADE_MAXIMA_MS = 7 * 24 * 3600 * 1000;

export interface CorpoLido {
  firmware: string | null;
  avistamentos: Avistamento[];
  /** avistamentos recusados, com o motivo, para o aparelho saber */
  recusados: { indice: number; motivo: string }[];
}

function inteiro(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

export function lerCorpo(corpo: unknown, agora: number): CorpoLido | { erro: string } {
  if (typeof corpo !== 'object' || corpo === null) return { erro: 'corpo deve ser um objeto JSON' };
  const c = corpo as Record<string, unknown>;
  if (!Array.isArray(c.avistamentos)) return { erro: 'faltou a lista "avistamentos"' };
  if (c.avistamentos.length > LIMITE_AVISTAMENTOS) {
    return { erro: `no máximo ${LIMITE_AVISTAMENTOS} avistamentos por envio` };
  }

  const firmware = typeof c.firmware === 'string' ? c.firmware.slice(0, 64) : null;
  const avistamentos: Avistamento[] = [];
  const recusados: CorpoLido['recusados'] = [];

  c.avistamentos.forEach((item: unknown, indice: number) => {
    const a = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const id = typeof a.id === 'string' ? a.id.trim() : '';
    const epc = typeof a.epc === 'string' ? a.epc.trim().toUpperCase() : '';
    const idadeInicio = inteiro(a.idade_inicio_ms);
    const idadeFim = inteiro(a.idade_fim_ms);
    const leituras = inteiro(a.leituras) ?? 1;
    const direcao = a.direcao === 'entrada' || a.direcao === 'saida' ? a.direcao : null;

    let motivo: string | null = null;
    if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(id)) motivo = 'id inválido';
    else if (!/^[0-9A-F]{8,64}$/.test(epc)) motivo = 'epc deve ser hexadecimal (8 a 64 dígitos)';
    else if (idadeInicio === null || idadeFim === null) motivo = 'faltou idade_inicio_ms/idade_fim_ms';
    else if (idadeFim < 0 || idadeInicio < idadeFim) motivo = 'idades incoerentes';
    else if (idadeInicio > IDADE_MAXIMA_MS) motivo = 'passagem velha demais';

    if (motivo) {
      recusados.push({ indice, motivo });
      return;
    }
    avistamentos.push({
      id,
      epc,
      inicio: agora - idadeInicio!,
      fim: agora - idadeFim!,
      leituras: Math.max(1, leituras),
      direcao,
    });
  });

  // Ordem do mundo real, não a de chegada: a decisão de cada passagem
  // depende das anteriores.
  avistamentos.sort((a, b) => a.inicio - b.inicio);
  return { firmware, avistamentos, recusados };
}
