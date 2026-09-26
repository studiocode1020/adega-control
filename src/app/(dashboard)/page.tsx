"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wine,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  History,
  Gem,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wine as WineType, Movement } from "@/types";
import { getWines, getMovements } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";

interface KpiData {
  totalLabels: number;
  totalBottles: number;
  stockValue: number;
  monthEntries: number;
  monthExits: number;
  lowStockCount: number;
  lowStockWines: WineType[];
  recentMovements: (Movement & { wineName: string })[];
  winesByType: Record<string, number>;
  bottlesByType: Record<string, number>;
  monthEntryDetails: (Movement & { wineName: string })[];
  monthExitDetails: (Movement & { wineName: string })[];
}

function computeKpis(wines: WineType[], movements: Movement[]): KpiData {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthMovements = movements.filter((m) => {
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthEntries = monthMovements
    .filter((m) => m.type === "entrada")
    .reduce((sum, m) => sum + m.quantity, 0);

  const monthExits = monthMovements
    .filter((m) => m.type === "saida")
    .reduce((sum, m) => sum + m.quantity, 0);

  const lowStockWines = wines.filter((w) => w.quantity <= w.minStock);

  const wineMap = new Map(wines.map((w) => [w.id, w.name]));
  const recentMovements = movements
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
    .map((m) => ({ ...m, wineName: wineMap.get(m.wineId) || "Desconhecido" }));

  // Wines grouped by type (count of labels per type)
  const winesByType: Record<string, number> = {};
  wines.forEach((w) => {
    winesByType[w.type] = (winesByType[w.type] || 0) + 1;
  });

  // Total bottles grouped by type
  const bottlesByType: Record<string, number> = {};
  wines.forEach((w) => {
    bottlesByType[w.type] = (bottlesByType[w.type] || 0) + w.quantity;
  });

  // Month entry details
  const monthEntryDetails = monthMovements
    .filter((m) => m.type === "entrada")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((m) => ({ ...m, wineName: wineMap.get(m.wineId) || "Desconhecido" }));

  // Month exit details
  const monthExitDetails = monthMovements
    .filter((m) => m.type === "saida")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((m) => ({ ...m, wineName: wineMap.get(m.wineId) || "Desconhecido" }));

  return {
    totalLabels: wines.length,
    totalBottles: wines.reduce((sum, w) => sum + w.quantity, 0),
    stockValue: wines.reduce((sum, w) => sum + w.price * w.quantity, 0),
    monthEntries,
    monthExits,
    lowStockCount: lowStockWines.length,
    lowStockWines,
    recentMovements,
    winesByType,
    bottlesByType,
    monthEntryDetails,
    monthExitDetails,
  };
}

const exitReasonLabels: Record<string, string> = {
  venda: "Venda",
  consumo: "Consumo",
  perda: "Perda",
  devolucao: "Devolução",
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(true);

  useEffect(() => {
    const wines = getWines();
    const movements = getMovements();
    setKpis(computeKpis(wines, movements));
  }, []);

  if (!kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total de Rótulos",
      value: kpis.totalLabels.toString(),
      icon: Wine,
      color: "text-wine-light",
      bgColor: "bg-wine/10",
      detailKey: "labels",
    },
    {
      title: "Garrafas em Estoque",
      value: kpis.totalBottles.toString(),
      icon: Package,
      color: "text-gold",
      bgColor: "bg-gold/10",
      detailKey: "bottles",
    },
    {
      title: "Entradas do Mês",
      value: kpis.monthEntries.toString(),
      subtitle: "garrafas",
      icon: ArrowDownToLine,
      color: "text-success",
      bgColor: "bg-success/10",
      detailKey: "entries",
    },
    {
      title: "Saídas do Mês",
      value: kpis.monthExits.toString(),
      subtitle: "garrafas",
      icon: ArrowUpFromLine,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      detailKey: "exits",
    },
  ];

  function renderKpiDialogContent() {
    if (!kpis || !activeKpi) return null;

    switch (activeKpi) {
      case "labels": {
        const entries = Object.entries(kpis.winesByType).sort((a, b) => b[1] - a[1]);
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {kpis.totalLabels} rótulos no total
            </p>
            <div className="space-y-2">
              {entries.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                  <span className="text-sm font-medium">{type}</span>
                  <span className="text-sm text-muted-foreground">{count} {count === 1 ? "rótulo" : "rótulos"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "bottles": {
        const entries = Object.entries(kpis.bottlesByType).sort((a, b) => b[1] - a[1]);
        const maxBottles = Math.max(...entries.map(([, v]) => v), 1);
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {kpis.totalBottles} garrafas no total
            </p>
            <div className="space-y-2.5">
              {entries.map(([type, count]) => {
                const pct = Math.round((count / maxBottles) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-wine"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "entries": {
        const details = kpis.monthEntryDetails;
        if (details.length === 0) {
          return (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma entrada registrada este mês.
            </p>
          );
        }
        return (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {details.map((mov) => (
              <div key={mov.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mov.wineName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(mov.date)}</p>
                </div>
                <span className="text-sm font-bold text-success shrink-0">+{mov.quantity}</span>
              </div>
            ))}
          </div>
        );
      }

      case "exits": {
        const details = kpis.monthExitDetails;
        if (details.length === 0) {
          return (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma saída registrada este mês.
            </p>
          );
        }
        return (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {details.map((mov) => (
              <div key={mov.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mov.wineName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(mov.date)}
                    {mov.reason ? ` \u00b7 ${exitReasonLabels[mov.reason] || mov.reason}` : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-destructive shrink-0">-{mov.quantity}</span>
              </div>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  }

  const dialogTitles: Record<string, string> = {
    labels: "Total de Rótulos",
    bottles: "Garrafas em Estoque",
    entries: "Entradas do Mês",
    exits: "Saídas do Mês",
  };

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
          Olá, Administrador
        </h2>
        <p className="text-sm text-muted-foreground">
          Sua adega em dia
        </p>
      </div>

      {/* Patrimônio da Coleção */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-wine/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10">
                <Gem className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Patrimônio da Coleção</p>
                  <button
                    type="button"
                    onClick={() => setShowValues(v => !v)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-90 transition-all"
                    aria-label={showValues ? "Ocultar valores" : "Mostrar valores"}
                  >
                    {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-3xl font-bold text-gold mt-0.5">
                  {showValues ? formatCurrency(kpis.stockValue) : "R$ ••••••"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.totalLabels} rótulos | {kpis.totalBottles} garrafas{showValues ? ` | Média de ${formatCurrency(kpis.totalBottles > 0 ? kpis.stockValue / kpis.totalBottles : 0)} por garrafa` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-center">
              {(() => {
                const wines = getWines();
                const byType = new Map<string, number>();
                wines.forEach(w => byType.set(w.type, (byType.get(w.type) || 0) + w.price * w.quantity));
                const sorted = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
                return sorted.map(([type, value]) => (
                  <div key={type} className="min-w-[80px]">
                    <p className="text-xs text-muted-foreground">{type}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {showValues ? formatCurrency(value) : "••••"}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpiCards.map((kpi, index) => (
          <Card
            key={kpi.title}
            className={`border-border/50 cursor-pointer hover:bg-muted/30 transition-all active:scale-[0.97] ${
              kpiCards.length % 2 !== 0 && index === kpiCards.length - 1 ? "col-span-2" : ""
            }`}
            onClick={() => setActiveKpi(kpi.detailKey)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Detail Dialog */}
      <Dialog open={activeKpi !== null} onOpenChange={(open) => { if (!open) setActiveKpi(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeKpi ? dialogTitles[activeKpi] : ""}</DialogTitle>
          </DialogHeader>
          {renderKpiDialogContent()}
        </DialogContent>
      </Dialog>

      {/* Links rápidos */}
      <div className="space-y-3">
        <Link href="/vinhos" className="block">
          <Card className="border-border/50 hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Alertas de Estoque Baixo</p>
                {kpis.lowStockCount > 0 ? (
                  <p className="text-xs text-destructive">{kpis.lowStockCount} {kpis.lowStockCount === 1 ? "vinho abaixo do mínimo" : "vinhos abaixo do mínimo"}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Estoque adequado</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/movimentacoes" className="block">
          <Card className="border-border/50 hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                <History className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Movimentações Recentes</p>
                <p className="text-xs text-muted-foreground">{kpis.recentMovements.length > 0 ? `${kpis.recentMovements.length} últimas movimentações` : "Nenhuma movimentação"}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
