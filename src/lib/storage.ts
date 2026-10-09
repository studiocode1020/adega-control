import { toast } from 'sonner';
import { Wine, Movement, CellarPosition, WishlistItem, SensorNotification } from '@/types';
import { getSupabase } from '@/lib/supabase/client';

// Os dados moram no Supabase. Ao abrir o app, carregarDados() traz tudo para
// um cache em memória, e as telas leem dele de forma síncrona, como faziam
// com o localStorage. Cada set* compara com o cache anterior e envia ao banco
// só o que mudou, em fila, para respeitar a ordem (vinho antes do movimento).
//
// Notificações do sensor ainda ficam no localStorage: são simuladas até o
// portal RFID existir.

const NOTIFICATIONS_KEY = 'adega-sensor-notifications'; // chave nova: a antiga tinha as notificações de demonstração

const cache = {
  wines: [] as Wine[],
  movements: [] as Movement[],
  cellar: [] as CellarPosition[],
  wishlist: [] as WishlistItem[],
};

let fila: Promise<void> = Promise.resolve();

function isClient() {
  return typeof window !== 'undefined';
}

// --- conversão entre o app (camelCase) e o banco (snake_case) ---

type Row = Record<string, unknown>;

function wineToRow(w: Wine): Row {
  return {
    id: w.id, name: w.name, year: w.year, type: w.type, country: w.country,
    region: w.region, producer: w.producer, grape: w.grape, price: w.price,
    quantity: w.quantity, min_stock: w.minStock, image_url: w.imageUrl,
    image_data: w.imageData, location: w.location, pairing_food: w.pairingFood,
    description: w.description, created_at: w.createdAt,
  };
}

function wineFromRow(r: Row): Wine {
  return {
    id: r.id as string, name: r.name as string, year: r.year as string,
    type: r.type as Wine['type'], country: r.country as string, region: r.region as string,
    producer: r.producer as string, grape: r.grape as string, price: Number(r.price),
    quantity: r.quantity as number, minStock: r.min_stock as number,
    imageUrl: r.image_url as string | null, imageData: r.image_data as string | null,
    location: r.location as string | null, pairingFood: (r.pairing_food as string[]) ?? [],
    description: r.description as string | null, createdAt: r.created_at as string,
  };
}

function movementToRow(m: Movement): Row {
  return {
    id: m.id, wine_id: m.wineId, type: m.type, quantity: m.quantity, date: m.date,
    reason: m.reason, supplier: m.supplier, invoice_number: m.invoiceNumber,
    notes: m.notes, created_at: m.createdAt,
  };
}

function movementFromRow(r: Row): Movement {
  return {
    id: r.id as string, wineId: r.wine_id as string, type: r.type as Movement['type'],
    quantity: r.quantity as number, date: r.date as string,
    reason: r.reason as Movement['reason'], supplier: r.supplier as string | null,
    invoiceNumber: r.invoice_number as string | null, notes: r.notes as string | null,
    createdAt: r.created_at as string,
  };
}

function wishlistToRow(i: WishlistItem): Row {
  return {
    id: i.id, name: i.name, year: i.year, type: i.type, country: i.country,
    region: i.region, producer: i.producer, grape: i.grape,
    estimated_price: i.estimatedPrice, notes: i.notes, priority: i.priority,
    purchased: i.purchased, created_at: i.createdAt,
  };
}

function wishlistFromRow(r: Row): WishlistItem {
  return {
    id: r.id as string, name: r.name as string, year: r.year as string,
    type: r.type as WishlistItem['type'], country: r.country as string,
    region: r.region as string, producer: r.producer as string, grape: r.grape as string,
    estimatedPrice: Number(r.estimated_price), notes: r.notes as string | null,
    priority: r.priority as WishlistItem['priority'], purchased: r.purchased as boolean,
    createdAt: r.created_at as string,
  };
}

// --- carga inicial ---

export async function carregarDados() {
  const supabase = getSupabase();
  const [wines, movements, cellar, wishlist] = await Promise.all([
    supabase.from('wines').select('*').order('created_at'),
    supabase.from('movements').select('*').order('created_at', { ascending: false }),
    supabase.from('cellar_slots').select('row, column, wine_id').order('row').order('column'),
    supabase.from('wishlist').select('*').order('created_at', { ascending: false }),
  ]);
  const erro = wines.error ?? movements.error ?? cellar.error ?? wishlist.error;
  if (erro) throw erro;

  cache.wines = wines.data.map(wineFromRow);
  cache.movements = movements.data.map(movementFromRow);
  cache.cellar = cellar.data.map((r: Row) => ({
    row: r.row as string, column: r.column as number, wineId: r.wine_id as string | null,
  }));
  cache.wishlist = wishlist.data.map(wishlistFromRow);
}

// --- envio das alterações ---

function enfileirar(tarefa: () => Promise<void>) {
  fila = fila.then(tarefa).catch((erro) => {
    console.error('[storage] falha ao salvar no Supabase', erro);
    toast.error('Não foi possível salvar. Confira a internet e tente de novo.');
  });
}

function sincronizar<T extends { id: string }>(
  tabela: string, antes: T[], depois: T[], toRow: (item: T) => Row,
) {
  const anterior = new Map(antes.map((i) => [i.id, JSON.stringify(i)]));
  const mudados = depois.filter((i) => anterior.get(i.id) !== JSON.stringify(i));
  const ficam = new Set(depois.map((i) => i.id));
  const removidos = antes.filter((i) => !ficam.has(i.id)).map((i) => i.id);
  if (!mudados.length && !removidos.length) return;

  enfileirar(async () => {
    const supabase = getSupabase();
    if (mudados.length) {
      const { error } = await supabase.from(tabela).upsert(mudados.map(toRow));
      if (error) throw error;
    }
    if (removidos.length) {
      const { error } = await supabase.from(tabela).delete().in('id', removidos);
      if (error) throw error;
    }
  });
}

// --- API usada pelos hooks ---

export function getWines(): Wine[] {
  return cache.wines;
}

export function setWines(wines: Wine[]) {
  const antes = cache.wines;
  cache.wines = wines;
  sincronizar('wines', antes, wines, wineToRow);
}

export function getMovements(): Movement[] {
  return cache.movements;
}

export function setMovements(movements: Movement[]) {
  const antes = cache.movements;
  cache.movements = movements;
  sincronizar('movements', antes, movements, movementToRow);
}

export function getCellarPositions(): CellarPosition[] {
  return cache.cellar;
}

export function setCellarPositions(positions: CellarPosition[]) {
  const antes = new Map(cache.cellar.map((p) => [`${p.row}${p.column}`, p.wineId]));
  cache.cellar = positions;
  const mudados = positions.filter((p) => antes.get(`${p.row}${p.column}`) !== p.wineId);
  if (!mudados.length) return;

  enfileirar(async () => {
    const supabase = getSupabase();
    for (const p of mudados) {
      const { error } = await supabase
        .from('cellar_slots')
        .update({ wine_id: p.wineId })
        .eq('row', p.row)
        .eq('column', p.column);
      if (error) throw error;
    }
  });
}

// Fileiras viram letras (A, B, C...) e colunas números, como na adega física.
// Serve para criar a grade e para mudar o tamanho: posições que continuam
// mantêm o vinho; as que saem da grade são apagadas.
export function letraDaFileira(indice: number) {
  return String.fromCharCode(65 + indice);
}

export async function definirGrade(fileiras: number, colunas: number) {
  const letras = Array.from({ length: fileiras }, (_, i) => letraDaFileira(i));
  const atuais = new Map(cache.cellar.map((p) => [`${p.row}${p.column}`, p]));

  const nova: CellarPosition[] = letras.flatMap((row) =>
    Array.from({ length: colunas }, (_, i) => {
      const column = i + 1;
      return atuais.get(`${row}${column}`) ?? { row, column, wineId: null };
    }),
  );
  const novas = nova.filter((p) => !atuais.has(`${p.row}${p.column}`));

  const supabase = getSupabase();
  if (novas.length) {
    const { error } = await supabase
      .from('cellar_slots')
      .insert(novas.map((p) => ({ row: p.row, column: p.column })));
    if (error) throw error;
  }
  const foraDasFileiras = await supabase
    .from('cellar_slots')
    .delete()
    .not('row', 'in', `(${letras.join(',')})`);
  if (foraDasFileiras.error) throw foraDasFileiras.error;
  const foraDasColunas = await supabase.from('cellar_slots').delete().gt('column', colunas);
  if (foraDasColunas.error) throw foraDasColunas.error;

  cache.cellar = nova;
}

export function getWishlist(): WishlistItem[] {
  return cache.wishlist;
}

export function setWishlist(items: WishlistItem[]) {
  const antes = cache.wishlist;
  cache.wishlist = items;
  sincronizar('wishlist', antes, items, wishlistToRow);
}

export function getNotifications(): SensorNotification[] {
  if (!isClient()) return [];
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function setNotifications(notifications: SensorNotification[]) {
  if (!isClient()) return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}
