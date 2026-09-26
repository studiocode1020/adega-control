"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Search,
  History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Wine, Movement } from "@/types";
import { getWines, getMovements } from "@/lib/storage";
import { formatDate } from "@/lib/format";

export default function MovimentacoesPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterWine, setFilterWine] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMovements(getMovements());
    setWines(getWines());
  }, []);

  const wineMap = useMemo(
    () => new Map(wines.map((w) => [w.id, w])),
    [wines]
  );

  const filtered = useMemo(() => {
    let result = [...movements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (filterType !== "all") {
      result = result.filter((m) => m.type === filterType);
    }

    if (filterWine !== "all") {
      result = result.filter((m) => m.wineId === filterWine);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((m) => {
        const wine = wineMap.get(m.wineId);
        return (
          wine?.name.toLowerCase().includes(s) ||
          m.supplier?.toLowerCase().includes(s) ||
          m.invoiceNumber?.toLowerCase().includes(s) ||
          m.notes?.toLowerCase().includes(s)
        );
      });
    }

    return result;
  }, [movements, filterType, filterWine, search, wineMap]);

  const totalEntradas = filtered
    .filter((m) => m.type === "entrada")
    .reduce((s, m) => s + m.quantity, 0);
  const totalSaidas = filtered
    .filter((m) => m.type === "saida")
    .reduce((s, m) => s + m.quantity, 0);

  const reasonLabels: Record<string, string> = {
    venda: "Venda",
    consumo: "Consumo",
    perda: "Perda",
    devolucao: "Devolução",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${totalEntradas - totalSaidas >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
              <Scale className={`h-5 w-5 ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo do Período</p>
              <p className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`}>
                {totalEntradas - totalSaidas >= 0 ? "+" : ""}{totalEntradas - totalSaidas} un.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Entradas</p>
              <p className="text-xl font-bold text-success">{totalEntradas} un.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Saídas</p>
              <p className="text-xl font-bold text-destructive">{totalSaidas} un.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-muted/40 border-border/30"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
            <SelectTrigger className="flex-1 rounded-xl bg-muted/40 border-border/30">
              <span className="flex flex-1 text-left truncate text-sm">
                {filterType === "all" ? "Tipo" : filterType === "entrada" ? "Entradas" : "Saídas"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterWine} onValueChange={(v) => setFilterWine(v ?? "all")}>
            <SelectTrigger className="flex-1 rounded-xl bg-muted/40 border-border/30">
              <span className="flex flex-1 text-left truncate text-sm">
                {filterWine === "all" ? "Vinho" : (wineMap.get(filterWine)?.name ?? "Vinho")}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vinhos</SelectItem>
              {wines.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Movement Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma movimentacao encontrada.</p>
          </div>
        ) : (
          filtered.map((mov) => {
            const wine = wineMap.get(mov.wineId);
            const isEntry = mov.type === "entrada";
            return (
              <div key={mov.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 active:scale-[0.99] transition-transform">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isEntry ? "bg-success/15" : "bg-destructive/15"
                }`}>
                  {isEntry
                    ? <TrendingUp className="h-4 w-4 text-success" />
                    : <TrendingDown className="h-4 w-4 text-destructive" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{wine?.name || "\u2014"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(mov.date)}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${
                      isEntry ? "text-success" : "text-destructive"
                    }`}>
                      {isEntry ? "+" : "-"}{mov.quantity}
                    </span>
                  </div>
                  {/* Additional details row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={`${isEntry ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'} border-0 text-xs`}>
                      {isEntry ? "Entrada" : "Saida"}
                    </Badge>
                    {mov.type === "entrada" && mov.supplier && (
                      <span className="text-xs text-muted-foreground truncate">{mov.supplier}</span>
                    )}
                    {mov.type === "saida" && mov.reason && (
                      <span className="text-xs text-muted-foreground">{reasonLabels[mov.reason]}</span>
                    )}
                    {mov.invoiceNumber && (
                      <span className="text-xs text-muted-foreground">NF: {mov.invoiceNumber}</span>
                    )}
                  </div>
                  {mov.notes && (
                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">{mov.notes}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
