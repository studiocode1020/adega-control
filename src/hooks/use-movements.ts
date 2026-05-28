"use client";
import { useState, useEffect, useCallback } from 'react';
import { Movement } from '@/types';
import { getMovements, setMovements, getWines, setWines } from '@/lib/storage';
import { generateId } from '@/lib/format';

export function useMovements() {
  const [movements, setMovementsState] = useState<Movement[]>([]);

  useEffect(() => {
    setMovementsState(getMovements());
  }, []);

  const refresh = useCallback(() => {
    setMovementsState(getMovements());
  }, []);

  const addMovement = useCallback((movement: Omit<Movement, 'id' | 'createdAt'>) => {
    const currentMovements = getMovements();
    const newMovement: Movement = {
      ...movement,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updatedMovements = [newMovement, ...currentMovements];
    setMovements(updatedMovements);
    setMovementsState(updatedMovements);

    // Atualizar quantidade do vinho
    const wines = getWines();
    const updatedWines = wines.map(w => {
      if (w.id === movement.wineId) {
        const newQty = movement.type === 'entrada'
          ? w.quantity + movement.quantity
          : w.quantity - movement.quantity;
        return { ...w, quantity: Math.max(0, newQty) };
      }
      return w;
    });
    setWines(updatedWines);

    return newMovement;
  }, []);

  const getMovementsByWine = useCallback((wineId: string) => {
    return getMovements().filter(m => m.wineId === wineId);
  }, []);

  return { movements, addMovement, getMovementsByWine, refresh };
}
