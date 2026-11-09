"use client";
import { useCallback, useEffect, useState } from 'react';
import { EVENTO_DADOS } from '@/lib/storage';

// Chama `aoMudar` quando os dados mudam por fora da tela aberta — hoje, quando
// uma detecção do portal RFID é confirmada no sininho e o estoque muda.
export function useAoMudarDados(aoMudar: () => void) {
  useEffect(() => {
    window.addEventListener(EVENTO_DADOS, aoMudar);
    return () => window.removeEventListener(EVENTO_DADOS, aoMudar);
  }, [aoMudar]);
}

// Número que muda a cada alteração externa: telas que leem o cache num
// useEffect põem `versao` nas dependências para reler.
export function useVersaoDados() {
  const [versao, setVersao] = useState(0);
  useAoMudarDados(useCallback(() => setVersao((v) => v + 1), []));
  return versao;
}
