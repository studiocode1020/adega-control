"use client";
import { useCallback, useEffect, useState } from 'react';
import type { ExitReason, PortalEvent } from '@/types';
import { getSupabase } from '@/lib/supabase/client';
import { portalDisponivel, recarregarEstoque } from '@/lib/storage';

// As detecções do portal RFID que esperam o dono no sininho.
//
// Chegam ao vivo pelo Realtime do Supabase (o aparelho grava pela rota
// /api/portal/leituras e o evento aparece aqui sem recarregar). Confirmar ou
// recusar chama as funções portal_* do banco, que mudam estoque, movimento e
// estado da garrafa juntos — e depois o cache do app é recarregado.

type Row = Record<string, unknown>;

export function portalEventFromRow(r: Row): PortalEvent {
  return {
    id: r.id as string,
    epc: r.epc as string,
    bottleId: r.bottle_id as string | null,
    wineId: r.wine_id as string | null,
    kind: r.kind as PortalEvent['kind'],
    confidence: r.confidence as PortalEvent['confidence'],
    reason: r.reason as string,
    detectedAt: r.detected_at as string,
    status: r.status as PortalEvent['status'],
    resolvedAt: r.resolved_at as string | null,
  };
}

// O Postgres manda a mensagem do `raise exception` em português; ela vai
// direto para o toast.
function falha(erro: { message?: string } | null): never {
  throw new Error(erro?.message || 'Não foi possível concluir. Confira a internet.');
}

export function usePortal() {
  const [pendentes, setPendentes] = useState<PortalEvent[]>([]);
  const disponivel = portalDisponivel();

  const carregar = useCallback(async () => {
    if (!portalDisponivel()) return;
    const { data, error } = await getSupabase()
      .from('portal_events')
      .select('*')
      .eq('status', 'pending')
      .order('detected_at', { ascending: false })
      .limit(50);
    if (!error) setPendentes(data.map(portalEventFromRow));
  }, []);

  useEffect(() => {
    if (!disponivel) return;
    carregar();

    const supabase = getSupabase();
    const canal = supabase
      .channel('portal-eventos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_events' }, () => {
        carregar();
      })
      .subscribe();

    // Celular que dormiu perde o Realtime; ao voltar para o app, relê.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [disponivel, carregar]);

  const tirarDaLista = (id: string) => setPendentes((lista) => lista.filter((e) => e.id !== id));

  const confirmar = useCallback(async (id: string, motivo: ExitReason = 'consumo') => {
    const { error } = await getSupabase().rpc('portal_confirmar', { p_event_id: id, p_reason: motivo });
    if (error) falha(error);
    tirarDaLista(id);
    await recarregarEstoque();
  }, []);

  const recusar = useCallback(async (id: string) => {
    const { error } = await getSupabase().rpc('portal_recusar', { p_event_id: id });
    if (error) falha(error);
    tirarDaLista(id);
  }, []);

  const vincular = useCallback(async (id: string, wineId: string, garrafaNova: boolean) => {
    const { error } = await getSupabase().rpc('portal_vincular', {
      p_event_id: id,
      p_wine_id: wineId,
      p_nova: garrafaNova,
    });
    if (error) falha(error);
    await carregar(); // o vínculo resolve todos os avisos da mesma etiqueta
    await recarregarEstoque();
  }, [carregar]);

  return { disponivel, pendentes, confirmar, recusar, vincular };
}
