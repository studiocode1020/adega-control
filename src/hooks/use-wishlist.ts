"use client";
import { useState, useEffect, useCallback } from 'react';
import { WishlistItem } from '@/types';
import { getWishlist, setWishlist } from '@/lib/storage';
import { generateId } from '@/lib/format';

export function useWishlist() {
  const [items, setItemsState] = useState<WishlistItem[]>([]);

  useEffect(() => {
    setItemsState(getWishlist());
  }, []);

  const refresh = useCallback(() => {
    setItemsState(getWishlist());
  }, []);

  const addItem = useCallback((item: Omit<WishlistItem, 'id' | 'createdAt' | 'purchased'>) => {
    const current = getWishlist();
    const newItem: WishlistItem = {
      ...item,
      id: generateId(),
      purchased: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...current];
    setWishlist(updated);
    setItemsState(updated);
    return newItem;
  }, []);

  const togglePurchased = useCallback((id: string) => {
    const current = getWishlist();
    const updated = current.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i);
    setWishlist(updated);
    setItemsState(updated);
  }, []);

  const removeItem = useCallback((id: string) => {
    const current = getWishlist();
    const updated = current.filter(i => i.id !== id);
    setWishlist(updated);
    setItemsState(updated);
  }, []);

  return { items, addItem, togglePurchased, removeItem, refresh };
}
