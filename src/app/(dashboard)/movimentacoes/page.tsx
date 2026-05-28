"use client";

import { useEffect, useState, useMemo } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-wine/10">
              <History className="h-5 w-5 text-wine-light" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Registros</p>
              <p className="text-xl font-bold">{filtered.length}</p>
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
        <Card className="border-border/50">
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
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vinho, fornecedor, NF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterWine} onValueChange={(v) => setFilterWine(v ?? "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Vinho" />
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vinho</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="hidden sm:table-cell">Fornecedor / Motivo</TableHead>
                <TableHead className="hidden md:table-cell">NF</TableHead>
                <TableHead className="hidden lg:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((mov) => {
                  const wine = wineMap.get(mov.wineId);
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(mov.date)}
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">
                        {wine?.name || "—"}
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
                      <TableCell className="text-center font-bold">
                        <span className={mov.type === "entrada" ? "text-success" : "text-destructive"}>
                          {mov.type === "entrada" ? "+" : "-"}{mov.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {mov.type === "entrada"
                          ? mov.supplier || "—"
                          : mov.reason
                          ? reasonLabels[mov.reason]
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {mov.invoiceNumber || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate hidden lg:table-cell">
                        {mov.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
