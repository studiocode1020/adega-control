export type WineType = 'Tinto' | 'Branco' | 'Rosé' | 'Espumante' | 'Sobremesa' | 'Fortificado';
export type MovementType = 'entrada' | 'saida';
export type ExitReason = 'venda' | 'consumo' | 'perda' | 'devolucao';

export interface Wine {
  id: string;
  name: string;
  year: string;
  type: WineType;
  country: string;
  region: string;
  producer: string;
  grape: string;
  price: number;
  quantity: number;
  minStock: number;
  imageUrl: string | null;
  imageData: string | null; // base64 da foto do rótulo
  location: string | null;
  pairingFood: string[]; // harmonização
  description: string | null; // descrição do vinho
  createdAt: string;
}

export interface Movement {
  id: string;
  wineId: string;
  type: MovementType;
  quantity: number;
  date: string;
  reason: ExitReason | null;
  supplier: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CellarPosition {
  row: string;
  column: number;
  wineId: string | null;
}

export interface WishlistItem {
  id: string;
  name: string;
  year: string;
  type: WineType;
  country: string;
  region: string;
  producer: string;
  grape: string;
  estimatedPrice: number;
  notes: string | null;
  priority: 'alta' | 'media' | 'baixa';
  purchased: boolean;
  createdAt: string;
}

// Sensor notification - detection from RFID sensor
export interface SensorNotification {
  id: string;
  tagId: string;           // RFID tag ID (will be mapped to wine later)
  wineId: string | null;   // mapped wine ID (null if unknown tag)
  wineName: string | null;  // wine name for display
  type: 'entrada' | 'saida'; // detected direction
  quantity: number;         // always 1 (individual detection)
  detectedAt: string;       // ISO timestamp
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt: string | null;
}
