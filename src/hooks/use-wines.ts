"use client";
import { useState, useEffect, useCallback } from 'react';
import { Wine } from '@/types';
import { getWines, setWines } from '@/lib/storage';
import { generateId } from '@/lib/format';

export function useWines() {
  const [wines, setWinesState] = useState<Wine[]>([]);

  useEffect(() => {
    setWinesState(getWines());
  }, []);

  const refresh = useCallback(() => {
    setWinesState(getWines());
  }, []);

  const addWine = useCallback((wine: Omit<Wine, 'id' | 'createdAt'>) => {
    const current = getWines();
    const newWine: Wine = {
      ...wine,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...current, newWine];
    setWines(updated);
    setWinesState(updated);
    return newWine;
  }, []);

  const updateWine = useCallback((id: string, data: Partial<Wine>) => {
    const current = getWines();
    const updated = current.map(w => w.id === id ? { ...w, ...data } : w);
    setWines(updated);
    setWinesState(updated);
  }, []);

  const deleteWine = useCallback((id: string) => {
    const current = getWines();
    const updated = current.filter(w => w.id !== id);
    setWines(updated);
    setWinesState(updated);
  }, []);

  const getWineById = useCallback((id: string) => {
    return getWines().find(w => w.id === id) || null;
  }, []);

  return { wines, addWine, updateWine, deleteWine, getWineById, refresh };
}
