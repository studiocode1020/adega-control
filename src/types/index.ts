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

// --- Portal RFID (tabelas da migration 0004) ---

export type BottleStatus = 'na_adega' | 'fora';

// Uma garrafa com etiqueta RFID. Wine.quantity continua sendo o estoque; as
// garrafas etiquetadas são um subconjunto dele.
export interface Bottle {
  id: string;
  wineId: string;
  epc: string;
  status: BottleStatus;
  createdAt: string;
}

export type PortalEventKind = 'saida' | 'entrada' | 'etiqueta_nova';

// Uma passagem pela porta que virou aviso no sininho. Só mexe no estoque
// quando o dono confirma.
export interface PortalEvent {
  id: string;
  epc: string;
  bottleId: string | null;
  wineId: string | null;
  kind: PortalEventKind;
  confidence: 'alta' | 'media' | 'baixa';
  reason: string;
  detectedAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
  resolvedAt: string | null;
}

export interface PortalDevice {
  id: string;
  name: string;
  firmware: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}
