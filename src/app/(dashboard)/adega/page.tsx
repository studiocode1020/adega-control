"use client";

import { useEffect, useState, useMemo } from "react";
import { Grid3X3, Wine as WineIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wine, CellarPosition, WineType } from "@/types";
import { getWines, getCellarPositions } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";

const typeColors: Record<WineType, { bg: string; border: string; glow: string; label: string }> = {
  Tinto: { bg: "bg-[#722F37]/40", border: "border-[#722F37]", glow: "shadow-[0_0_8px_rgba(114,47,55,0.3)]", label: "Tinto" },
  Branco: { bg: "bg-[#C9A84C]/30", border: "border-[#C9A84C]", glow: "shadow-[0_0_8px_rgba(201,168,76,0.3)]", label: "Branco" },
  Rosé: { bg: "bg-[#DB7093]/30", border: "border-[#DB7093]", glow: "shadow-[0_0_8px_rgba(219,112,147,0.3)]", label: "Rosé" },
  Espumante: { bg: "bg-[#A8B5C8]/30", border: "border-[#A8B5C8]", glow: "shadow-[0_0_8px_rgba(168,181,200,0.3)]", label: "Espumante" },
  Sobremesa: { bg: "bg-[#D4A574]/30", border: "border-[#D4A574]", glow: "shadow-[0_0_8px_rgba(212,165,116,0.3)]", label: "Sobremesa" },
  Fortificado: { bg: "bg-[#8B6914]/30", border: "border-[#8B6914]", glow: "shadow-[0_0_8px_rgba(139,105,20,0.3)]", label: "Fortificado" },
};

const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const columns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function AdegaPage() {
  const [positions, setPositions] = useState<CellarPosition[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  useEffect(() => {
    setPositions(getCellarPositions());
    setWines(getWines());
  }, []);

  const wineMap = useMemo(
    () => new Map(wines.map((w) => [w.id, w])),
    [wines]
  );

  const positionMap = useMemo(
    () => new Map(positions.map((p) => [`${p.row}${p.column}`, p])),
    [positions]
  );

  const occupied = positions.filter((p) => p.wineId !== null).length;
  const total = positions.length;
  const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Posições Totais</p>
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
            <p className="text-xs text-muted-foreground">Ocupação</p>
            <p className="text-2xl font-bold text-gold">{percentage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground font-medium">Legenda:</span>
            {Object.entries(typeColors).map(([type, colors]) => (
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
            Matriz da Adega
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {rows.length} linhas x {columns.length} colunas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3 sm:hidden flex items-center gap-1">
            <span>↔</span> Deslize para ver a matriz completa
          </p>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            <div className="min-w-[600px]">
              {/* Column Headers */}
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `40px repeat(${columns.length}, 1fr)` }}>
                <div />
                {columns.map((col) => (
                  <div key={col} className="text-center text-xs text-muted-foreground font-medium py-1">
                    {col}
                  </div>
                ))}

                {/* Rows */}
                {rows.map((row) => (
                  <>
                    <div key={`label-${row}`} className="flex items-center justify-center text-xs text-muted-foreground font-medium">
                      {row}
                    </div>
                    {columns.map((col) => {
                      const pos = positionMap.get(`${row}${col}`);
                      const wine = pos?.wineId ? wineMap.get(pos.wineId) : null;
                      const colors = wine ? typeColors[wine.type] : null;

                      return (
                        <Tooltip key={`${row}${col}`}>
                          <TooltipTrigger
                            onClick={() => wine && setSelectedWine(wine)}
                            className={`
                              aspect-square rounded-md border transition-all duration-200 flex items-center justify-center
                              ${wine
                                ? `${colors!.bg} ${colors!.border} ${colors!.glow} hover:scale-105 cursor-pointer`
                                : "border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
                              }
                            `}
                          >
                            {wine && (
                              <WineIcon className="h-4 w-4 text-foreground/70" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="font-medium text-xs">
                              Posição {row}{col}
                            </p>
                            {wine ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                <p>{wine.name}</p>
                                <p>{wine.type} - {wine.year}</p>
                                <p>{wine.quantity} garrafas</p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Vazio</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wine Detail Dialog */}
      <Dialog open={!!selectedWine} onOpenChange={() => setSelectedWine(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WineIcon className="h-5 w-5 text-wine-light" />
              {selectedWine?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedWine && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Safra</p>
                  <p className="font-medium">{selectedWine.year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <Badge
                    className={`${typeColors[selectedWine.type].bg} ${typeColors[selectedWine.type].border} border text-foreground text-xs`}
                  >
                    {selectedWine.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">País</p>
                  <p className="font-medium">{selectedWine.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Região</p>
                  <p className="font-medium">{selectedWine.region}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Produtor</p>
                  <p className="font-medium">{selectedWine.producer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Uva</p>
                  <p className="font-medium">{selectedWine.grape}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Preço</p>
                  <p className="font-medium text-gold">{formatCurrency(selectedWine.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estoque</p>
                  <p className="font-medium">
                    {selectedWine.quantity} garrafas
                    {selectedWine.quantity <= selectedWine.minStock && (
                      <Badge variant="destructive" className="ml-2 text-[10px]">Baixo</Badge>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Localização</p>
                <p className="font-medium">{selectedWine.location || "Não definida"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
