"use client";

import { Fragment, useMemo, useState } from "react";
import { Grid3X3, Ruler, Search, Wine as WineIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CellarPosition, Wine } from "@/types";
import { useWines } from "@/hooks/use-wines";
import { useCellar } from "@/hooks/use-cellar";
import { formatCurrency } from "@/lib/format";
import { definirGrade, letraDaFileira } from "@/lib/storage";
import { WINE_TYPE_SLOT, WINE_TYPE_BADGE } from "@/lib/colors";

type Slot = { row: string; column: number };

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export default function AdegaPage() {
  const { wines } = useWines();
  const { positions, assignWine, removeWine, refresh } = useCellar();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState("");
  const [resizing, setResizing] = useState(false);

  const wineMap = useMemo(() => new Map(wines.map((w) => [w.id, w])), [wines]);

  const positionMap = useMemo(
    () => new Map(positions.map((p) => [`${p.row}${p.column}`, p])),
    [positions]
  );

  // A grade vem do banco: cada adega tem o seu tamanho
  const rows = useMemo(
    () => [...new Set(positions.map((p) => p.row))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [positions]
  );
  const columns = useMemo(
    () => [...new Set(positions.map((p) => p.column))].sort((a, b) => a - b),
    [positions]
  );

  const placedCount = useMemo(() => {
    const count = new Map<string, number>();
    positions.forEach((p) => {
      if (p.wineId) count.set(p.wineId, (count.get(p.wineId) ?? 0) + 1);
    });
    return count;
  }, [positions]);

  const unplaced = (wine: Wine) => Math.max(0, wine.quantity - (placedCount.get(wine.id) ?? 0));

  const occupied = positions.filter((p) => p.wineId !== null).length;
  const total = positions.length;
  const bottlesWithoutSlot = wines.reduce((sum, w) => sum + unplaced(w), 0);

  // Na escolha, primeiro os vinhos que ainda têm garrafa sem posição
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const remaining = (w: Wine) => Math.max(0, w.quantity - (placedCount.get(w.id) ?? 0));
    return wines
      .filter((w) => !term || `${w.name} ${w.year} ${w.country}`.toLowerCase().includes(term))
      .sort((a, b) => Number(remaining(b) > 0) - Number(remaining(a) > 0) || a.name.localeCompare(b.name, "pt-BR"));
  }, [wines, search, placedCount]);

  const slotPos = slot ? positionMap.get(`${slot.row}${slot.column}`) : null;
  const slotWine = slotPos?.wineId ? wineMap.get(slotPos.wineId) ?? null : null;
  const slotLabel = slot ? `${slot.row}${slot.column}` : "";

  const openSlot = (s: Slot) => {
    setSlot(s);
    setChoosing(false);
    setSearch("");
  };

  const closeDialog = () => {
    setSlot(null);
    setChoosing(false);
  };

  const handleAssign = (wine: Wine) => {
    if (!slot) return;
    assignWine(slot.row, slot.column, wine.id);
    toast.success(`${wine.name} em ${slotLabel}`);
    closeDialog();
  };

  const handleRemove = () => {
    if (!slot) return;
    removeWine(slot.row, slot.column);
    toast(`Posição ${slotLabel} liberada`);
    closeDialog();
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Grid3X3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-sm font-medium">Monte a grade da adega</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Conte as fileiras (de cima para baixo) e quantas garrafas cabem em cada uma.
        </p>
        <div className="w-full max-w-xs mt-6">
          <GridSizeForm positions={positions} wineMap={wineMap} onDone={refresh} />
        </div>
      </div>
    );
  }

  const showPicker = choosing || !slotWine;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Posições</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Ocupadas</p>
            <p className="text-2xl font-bold text-wine-light">{occupied}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Livres</p>
            <p className="text-2xl font-bold text-success">{total - occupied}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Garrafas sem posição</p>
            <p className="text-2xl font-bold text-gold">{bottlesWithoutSlot}</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground font-medium">Legenda:</span>
            {Object.entries(WINE_TYPE_SLOT).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded ${colors.bg} border ${colors.border}`} />
                <span className="text-xs text-muted-foreground">{colors.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded border border-dashed border-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Vazio</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-gold" />
            Mapa da Adega
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {rows.length} fileiras x {columns.length} posições
            </span>
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => setResizing(true)}>
              <Ruler className="h-4 w-4 mr-1" />
              Ajustar tamanho
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Toque numa posição para colocar ou trocar o vinho.
          </p>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            <div style={{ minWidth: `${40 + columns.length * 44}px` }}>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `40px repeat(${columns.length}, 1fr)` }}>
                <div />
                {columns.map((col) => (
                  <div key={col} className="text-center text-xs text-muted-foreground font-medium py-1">
                    {col}
                  </div>
                ))}

                {rows.map((row) => (
                  <Fragment key={row}>
                    <div className="flex items-center justify-center text-xs text-muted-foreground font-medium">
                      {row}
                    </div>
                    {columns.map((col) => {
                      const pos = positionMap.get(`${row}${col}`);
                      if (!pos) return <div key={`${row}${col}`} />;
                      const wine = pos.wineId ? wineMap.get(pos.wineId) : null;
                      const colors = wine ? WINE_TYPE_SLOT[wine.type] : null;

                      return (
                        <button
                          key={`${row}${col}`}
                          type="button"
                          aria-label={wine ? `${row}${col}: ${wine.name}` : `${row}${col}: vazia`}
                          onClick={() => openSlot({ row, column: col })}
                          className={`
                            aspect-square rounded-md border transition-all duration-200 flex items-center justify-center min-h-[36px] min-w-[36px] active:scale-95
                            ${wine
                              ? `${colors!.bg} ${colors!.border} ${colors!.glow}`
                              : "border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
                            }
                          `}
                        >
                          {wine && <WineIcon className="h-4 w-4 text-foreground/70" />}
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resize Dialog */}
      <Dialog open={resizing} onOpenChange={setResizing}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tamanho da adega</DialogTitle>
            <DialogDescription>
              Os vinhos já posicionados continuam no lugar, desde que a posição exista no tamanho novo.
            </DialogDescription>
          </DialogHeader>
          <GridSizeForm
            positions={positions}
            wineMap={wineMap}
            initialRows={rows.length}
            initialColumns={columns.length}
            onDone={() => {
              setResizing(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Slot Dialog */}
      <Dialog open={!!slot} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WineIcon className="h-5 w-5 text-wine-light" />
              {showPicker ? `Posição ${slotLabel}` : slotWine?.name}
            </DialogTitle>
            <DialogDescription>
              {showPicker
                ? slotWine
                  ? `Escolha o vinho que vai substituir ${slotWine.name}.`
                  : "Escolha o vinho desta posição."
                : `Posição ${slotLabel}`}
            </DialogDescription>
          </DialogHeader>

          {showPicker ? (
            <div className="flex flex-col gap-3 min-h-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vinho..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-muted/40 border-border/30"
                />
              </div>
              <div className="overflow-y-auto -mx-1 px-1 space-y-2 max-h-[50vh]">
                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum vinho encontrado</p>
                ) : (
                  candidates.map((wine) => {
                    const remaining = unplaced(wine);
                    return (
                      <button
                        key={wine.id}
                        type="button"
                        onClick={() => handleAssign(wine)}
                        className="w-full text-left p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors active:scale-[0.99]"
                      >
                        <p className="text-sm font-medium truncate">{wine.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[wine.year, wine.country].filter(Boolean).join(" · ")}
                          {" · "}
                          {remaining > 0 ? (
                            <span className="text-gold">{remaining} sem posição</span>
                          ) : (
                            "todas posicionadas"
                          )}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
              {slotWine && (
                <Button variant="ghost" onClick={() => setChoosing(false)}>
                  Voltar
                </Button>
              )}
            </div>
          ) : (
            slotWine && (
              <div className="space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Safra</p>
                    <p className="font-medium">{slotWine.year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <Badge className={`${WINE_TYPE_BADGE[slotWine.type]} border text-xs`}>
                      {slotWine.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">País</p>
                    <p className="font-medium">{slotWine.country || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Uva</p>
                    <p className="font-medium">{slotWine.grape || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Preço</p>
                    <p className="font-medium text-gold">{formatCurrency(slotWine.price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estoque</p>
                    <p className="font-medium">{plural(slotWine.quantity, "garrafa", "garrafas")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setChoosing(true)}>
                    Trocar vinho
                  </Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={handleRemove}>
                    Liberar posição
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MAX_FILEIRAS = 26; // uma letra por fileira
const MAX_COLUNAS = 50;

function GridSizeForm({
  positions,
  wineMap,
  initialRows,
  initialColumns,
  onDone,
}: {
  positions: CellarPosition[];
  wineMap: Map<string, Wine>;
  initialRows?: number;
  initialColumns?: number;
  onDone: () => void;
}) {
  const [fileiras, setFileiras] = useState(initialRows ? String(initialRows) : "");
  const [colunas, setColunas] = useState(initialColumns ? String(initialColumns) : "");
  const [saving, setSaving] = useState(false);

  const f = parseInt(fileiras) || 0;
  const c = parseInt(colunas) || 0;
  const valid = f >= 1 && f <= MAX_FILEIRAS && c >= 1 && c <= MAX_COLUNAS;
  const unchanged = f === initialRows && c === initialColumns;

  // Vinhos que estão em posições que deixariam de existir
  const lost = useMemo(() => {
    if (!valid) return [];
    const letras = new Set(Array.from({ length: f }, (_, i) => letraDaFileira(i)));
    return positions.filter((p) => p.wineId && (!letras.has(p.row) || p.column > c));
  }, [positions, f, c, valid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || unchanged) return;
    setSaving(true);
    try {
      await definirGrade(f, c);
      toast.success(`Adega com ${f * c} posições`);
      onDone();
    } catch (erro) {
      console.error("[adega] falha ao definir grade", erro);
      toast.error("Não foi possível salvar o tamanho. Confira a internet.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <label className="flex-1 text-left space-y-1.5">
          <span className="text-xs text-muted-foreground">Fileiras</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_FILEIRAS}
            value={fileiras}
            onChange={(e) => setFileiras(e.target.value)}
            className="h-11 rounded-xl bg-muted/40 border-border/30"
          />
        </label>
        <label className="flex-1 text-left space-y-1.5">
          <span className="text-xs text-muted-foreground">Por fileira</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_COLUNAS}
            value={colunas}
            onChange={(e) => setColunas(e.target.value)}
            className="h-11 rounded-xl bg-muted/40 border-border/30"
          />
        </label>
      </div>
      {valid && (
        <p className="text-xs text-muted-foreground">
          {f * c} posições · fileiras A a {letraDaFileira(f - 1)}
        </p>
      )}
      {lost.length > 0 && (
        <div className="text-left text-xs rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          {lost.length === 1 ? "1 garrafa vai perder a posição" : `${lost.length} garrafas vão perder a posição`}:{" "}
          {lost.slice(0, 3).map((p) => `${wineMap.get(p.wineId!)?.name ?? "?"} (${p.row}${p.column})`).join(", ")}
          {lost.length > 3 && ` e mais ${lost.length - 3}`}. Elas continuam no estoque, só sem lugar.
        </div>
      )}
      <Button
        type="submit"
        className="w-full h-11 bg-wine hover:bg-wine-light text-white"
        disabled={!valid || unchanged || saving}
      >
        {saving ? "Salvando..." : lost.length > 0 ? "Diminuir mesmo assim" : initialRows ? "Salvar tamanho" : "Criar grade"}
      </Button>
    </form>
  );
}
