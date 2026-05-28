import { CellarPosition } from '@/types';

const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const columns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const occupiedPositions: Record<string, string> = {
  'A1': 'w1', 'A2': 'w1', 'A3': 'w2', 'A4': 'w2', 'A5': 'w5', 'A6': 'w5', 'A7': 'w5', 'A8': 'w5',
  'B1': 'w3', 'B2': 'w3', 'B3': 'w4', 'B4': 'w4', 'B5': 'w4', 'B7': 'w16', 'B8': 'w16',
  'C1': 'w19', 'C2': 'w19', 'C3': 'w8', 'C4': 'w8', 'C7': 'w20', 'C8': 'w20', 'C9': 'w20',
  'D1': 'w9', 'D2': 'w9', 'D3': 'w10', 'D4': 'w10', 'D5': 'w10', 'D6': 'w18',
  'E1': 'w11', 'E2': 'w11', 'E3': 'w11', 'E4': 'w17',
  'F1': 'w12', 'F2': 'w12', 'F3': 'w13', 'F4': 'w13',
  'G1': 'w7', 'G2': 'w7', 'G5': 'w14',
  'H1': 'w6', 'H2': 'w6', 'H3': 'w15',
};

export const mockCellarPositions: CellarPosition[] = rows.flatMap((row) =>
  columns.map((column) => ({
    row,
    column,
    wineId: occupiedPositions[`${row}${column}`] || null,
  }))
);
