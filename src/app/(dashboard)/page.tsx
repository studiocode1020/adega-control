"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wine,
  Package,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  History,
  Gem,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return {
    totalLabels: wines.length,
    totalBottles: wines.reduce((sum, w) => sum + w.quantity, 0),
    stockValue: wines.reduce((sum, w) => sum + w.price * w.quantity, 0),
    monthEntries,
    monthExits,
    lowStockCount: lowStockWines.length,
    lowStockWines,
    recentMovements,
  };
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);

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
    },
    {
      title: "Garrafas em Estoque",
      value: kpis.totalBottles.toString(),
      icon: Package,
      color: "text-gold",
      bgColor: "bg-gold/10",
    },
    {
      title: "Valor do Estoque",
      value: formatCurrency(kpis.stockValue),
      icon: DollarSign,
      color: "text-gold-light",
      bgColor: "bg-gold/10",
    },
    {
      title: "Entradas do Mês",
      value: kpis.monthEntries.toString(),
      subtitle: "garrafas",
      icon: ArrowDownToLine,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Saídas do Mês",
      value: kpis.monthExits.toString(),
      subtitle: "garrafas",
      icon: ArrowUpFromLine,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Estoque Baixo",
      value: kpis.lowStockCount.toString(),
      subtitle: "rótulos",
      icon: AlertTriangle,
      color: kpis.lowStockCount > 0 ? "text-destructive" : "text-success",
      bgColor: kpis.lowStockCount > 0 ? "bg-destructive/10" : "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-[10px] text-muted-foreground">{kpi.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Patrimônio em Vinhos */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-wine/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gold/10">
              <Gem className="h-7 w-7 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Patrimônio Total da Coleção</p>
              <p className="text-3xl font-bold text-gold">
                {formatCurrency(kpis.stockValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalLabels} rótulos | {kpis.totalBottles} garrafas | Média de {formatCurrency(kpis.totalBottles > 0 ? kpis.stockValue / kpis.totalBottles : 0)} por garrafa
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-center">
              {(() => {
                const wines = getWines();
                const byType = new Map<string, number>();
                wines.forEach(w => byType.set(w.type, (byType.get(w.type) || 0) + w.price * w.quantity));
                const sorted = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
                return sorted.map(([type, value]) => (
                  <div key={type} className="min-w-[80px]">
                    <p className="text-[10px] text-muted-foreground">{type}</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(value)}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de Estoque Baixo */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.lowStockWines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos os vinhos estão com estoque adequado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vinho</TableHead>
                    <TableHead className="text-center">Atual</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Mínimo</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.lowStockWines.map((wine) => (
                    <TableRow key={wine.id}>
                      <TableCell className="font-medium text-sm">
                        {wine.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-destructive font-bold">{wine.quantity}</span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                        {wine.minStock}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-[10px]">
                          {wine.quantity === 0 ? "Esgotado" : "Baixo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Movimentações Recentes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-gold" />
                Movimentações Recentes
              </CardTitle>
              <Link
                href="/movimentacoes"
                className="text-xs text-wine-light hover:text-wine transition-colors"
              >
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vinho</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.recentMovements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(mov.date)}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[150px] truncate">
                      {mov.wineName}
                    </TableCell>
                    <TableCell className="text-center">
                      {mov.type === "entrada" ? (
                        <Badge className="bg-success/20 text-success-light border-0 text-[10px]">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Saída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {mov.type === "entrada" ? "+" : "-"}{mov.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

