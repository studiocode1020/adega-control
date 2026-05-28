"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Wine as WineIcon,
  MapPin,
  Grape,
  Calendar,
  DollarSign,
  Package,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wine, WineType } from "@/types";
import { getWines } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/format";

const WINE_TYPES: WineType[] = [
  "Tinto",
  "Branco",
  "Rosé",
  "Espumante",
  "Sobremesa",
  "Fortificado",
];

const WINE_TYPE_COLORS: Record<WineType, string> = {
  Tinto: "bg-wine/20 text-wine-light",
  Branco: "bg-gold/20 text-gold",
  Rosé: "bg-pink-500/20 text-pink-400",
  Espumante: "bg-amber-500/20 text-amber-400",
  Sobremesa: "bg-orange-500/20 text-orange-400",
  Fortificado: "bg-purple-500/20 text-purple-400",
};

export default function VinhosPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setWines(getWines());
  }, []);

  const countries = useMemo(() => {
    const unique = [...new Set(wines.map((w) => w.country))];
    return unique.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [wines]);

  const filteredWines = useMemo(() => {
    return wines.filter((wine) => {
      const matchesSearch = wine.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || wine.type === typeFilter;
      const matchesCountry =
        countryFilter === "all" || wine.country === countryFilter;
      return matchesSearch && matchesType && matchesCountry;
    });
  }, [wines, search, typeFilter, countryFilter]);

  const handleRowClick = (wine: Wine) => {
    setSelectedWine(wine);
    setDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCountryFilter("all");
  };

  const hasActiveFilters =
    search !== "" || typeFilter !== "all" || countryFilter !== "all";

  if (wines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-wine/30 border-t-wine rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vinhos</h1>
          <p className="text-sm text-muted-foreground">
            {filteredWines.length} de {wines.length} rótulos cadastrados
          </p>
        </div>
        <Link href="/vinhos/novo">
          <Button className="bg-wine hover:bg-wine/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Vinho
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {WINE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os países</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {filteredWines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <WineIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum vinho encontrado
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Tente ajustar os filtros de busca
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Safra</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">País</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWines.map((wine) => {
                  const isLowStock = wine.quantity <= wine.minStock;
                  return (
                    <TableRow
                      key={wine.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(wine)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {wine.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {wine.year}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${WINE_TYPE_COLORS[wine.type]} border-0 text-[10px]`}
                        >
                          {wine.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {wine.country}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(wine.price)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {wine.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {isLowStock ? (
                          <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">
                            Baixo
                          </Badge>
                        ) : (
                          <Badge className="bg-success/20 text-success border-0 text-[10px]">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wine Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedWine && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-foreground">
                  {selectedWine.name}
                </DialogTitle>
                <DialogDescription>
                  Detalhes do vinho cadastrado em{" "}
                  {formatDate(selectedWine.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                {/* Type and Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`${WINE_TYPE_COLORS[selectedWine.type]} border-0`}
                  >
                    {selectedWine.type}
                  </Badge>
                  {selectedWine.quantity <= selectedWine.minStock ? (
                    <Badge className="bg-destructive/20 text-destructive border-0">
                      Estoque Baixo
                    </Badge>
                  ) : (
                    <Badge className="bg-success/20 text-success border-0">
                      Estoque OK
                    </Badge>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    icon={Calendar}
                    label="Safra"
                    value={selectedWine.year}
                  />
                  <DetailItem
                    icon={MapPin}
                    label="País / Região"
                    value={`${selectedWine.country} - ${selectedWine.region}`}
                  />
                  <DetailItem
                    icon={User}
                    label="Produtor"
                    value={selectedWine.producer}
                  />
                  <DetailItem
                    icon={Grape}
                    label="Uva"
                    value={selectedWine.grape}
                  />
                  <DetailItem
                    icon={DollarSign}
                    label="Preço"
                    value={formatCurrency(selectedWine.price)}
                  />
                  <DetailItem
                    icon={Package}
                    label="Estoque"
                    value={`${selectedWine.quantity} garrafas (min: ${selectedWine.minStock})`}
                  />
                </div>

                {selectedWine.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 border-t border-border/50">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      Localização na adega:{" "}
                      <span className="text-foreground font-medium">
                        {selectedWine.location}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
