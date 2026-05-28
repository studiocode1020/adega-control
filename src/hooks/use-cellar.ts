"use client";
import { useState, useEffect, useCallback } from 'react';
import { CellarPosition } from '@/types';
import { getCellarPositions, setCellarPositions } from '@/lib/storage';

export function useCellar() {
  const [positions, setPositionsState] = useState<CellarPosition[]>([]);

  useEffect(() => {
    setPositionsState(getCellarPositions());
  }, []);

  const refresh = useCallback(() => {
    setPositionsState(getCellarPositions());
  }, []);

  const assignWine = useCallback((row: string, column: number, wineId: string) => {
    const current = getCellarPositions();
    const updated = current.map(p =>
      p.row === row && p.column === column ? { ...p, wineId } : p
    );
    setCellarPositions(updated);
    setPositionsState(updated);
  }, []);

  const removeWine = useCallback((row: string, column: number) => {
    const current = getCellarPositions();
    const updated = current.map(p =>
      p.row === row && p.column === column ? { ...p, wineId: null } : p
    );
    setCellarPositions(updated);
    setPositionsState(updated);
  }, []);

  const getOccupancy = useCallback(() => {
    const total = positions.length;
    const occupied = positions.filter(p => p.wineId !== null).length;
    return { total, occupied, free: total - occupied, percentage: total > 0 ? Math.round((occupied / total) * 100) : 0 };
  }, [positions]);

  return { positions, assignWine, removeWine, getOccupancy, refresh };
}
