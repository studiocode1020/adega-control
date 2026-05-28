import { Wine, Movement, CellarPosition } from '@/types';
import { mockWines } from '@/data/mock-wines';
import { mockMovements } from '@/data/mock-movements';
import { mockCellarPositions } from '@/data/mock-cellar';

const KEYS = {
  wines: 'adega-wines',
  movements: 'adega-movements',
  cellar: 'adega-cellar',
  initialized: 'adega-initialized',
} as const;

function isClient() {
  return typeof window !== 'undefined';
}

export function initializeData() {
  if (!isClient()) return;
  if (localStorage.getItem(KEYS.initialized)) return;
  localStorage.setItem(KEYS.wines, JSON.stringify(mockWines));
  localStorage.setItem(KEYS.movements, JSON.stringify(mockMovements));
  localStorage.setItem(KEYS.cellar, JSON.stringify(mockCellarPositions));
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
