import { Wine, Movement, CellarPosition, WishlistItem } from '@/types';
import { mockWines } from '@/data/mock-wines';
import { mockMovements } from '@/data/mock-movements';
import { mockCellarPositions } from '@/data/mock-cellar';
import { mockWishlist } from '@/data/mock-wishlist';

const KEYS = {
  wines: 'adega-wines',
  movements: 'adega-movements',
  cellar: 'adega-cellar',
  wishlist: 'adega-wishlist',
  initialized: 'adega-initialized-v2',
} as const;

function isClient() {
  return typeof window !== 'undefined';
}

export function initializeData() {
  if (!isClient()) return;
  if (localStorage.getItem(KEYS.initialized)) return;
  // Limpar versão anterior
  localStorage.removeItem('adega-initialized');
  localStorage.setItem(KEYS.wines, JSON.stringify(mockWines));
  localStorage.setItem(KEYS.movements, JSON.stringify(mockMovements));
  localStorage.setItem(KEYS.cellar, JSON.stringify(mockCellarPositions));
  localStorage.setItem(KEYS.wishlist, JSON.stringify(mockWishlist));
  localStorage.setItem(KEYS.initialized, 'true');
}

export function getWines(): Wine[] {
  if (!isClient()) return [];
  initializeData();
  const data = localStorage.getItem(KEYS.wines);
  return data ? JSON.parse(data) : [];
}

export function setWines(wines: Wine[]) {
  if (!isClient()) return;
  localStorage.setItem(KEYS.wines, JSON.stringify(wines));
}

export function getMovements(): Movement[] {
  if (!isClient()) return [];
  initializeData();
  const data = localStorage.getItem(KEYS.movements);
  return data ? JSON.parse(data) : [];
}

export function setMovements(movements: Movement[]) {
  if (!isClient()) return;
  localStorage.setItem(KEYS.movements, JSON.stringify(movements));
}

export function getCellarPositions(): CellarPosition[] {
  if (!isClient()) return [];
  initializeData();
  const data = localStorage.getItem(KEYS.cellar);
  return data ? JSON.parse(data) : [];
}

export function setCellarPositions(positions: CellarPosition[]) {
  if (!isClient()) return;
  localStorage.setItem(KEYS.cellar, JSON.stringify(positions));
}

export function getWishlist(): WishlistItem[] {
  if (!isClient()) return [];
  initializeData();
  const data = localStorage.getItem(KEYS.wishlist);
  return data ? JSON.parse(data) : [];
}

export function setWishlist(items: WishlistItem[]) {
  if (!isClient()) return;
  localStorage.setItem(KEYS.wishlist, JSON.stringify(items));
}
