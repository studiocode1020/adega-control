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
  UtensilsCrossed,
  Camera as CameraIcon,
  Lightbulb,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { wineCuriosities } from "@/data/mock-curiosities";

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
                <span className="flex flex-1 text-left truncate text-sm">
                  {typeFilter === "all" ? "Todos os tipos" : typeFilter}
                </span>
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
                <span className="flex flex-1 text-left truncate text-sm">
                  {countryFilter === "all" ? "Todos os países" : countryFilter}
                </span>
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

      {/* Wine Cards */}
      {filteredWines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-border/50 bg-card">
          <WineIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum vinho encontrado
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Tente ajustar os filtros de busca
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWines.map((wine) => {
            const isLowStock = wine.quantity <= wine.minStock;
            return (
              <div
                key={wine.id}
                onClick={() => handleRowClick(wine)}
                className="p-3 rounded-lg bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{wine.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {wine.year} &middot; {wine.country}
                    </p>
                  </div>
                  <Badge className={`${WINE_TYPE_COLORS[wine.type]} border-0 text-[10px] shrink-0`}>
                    {wine.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                  <span className="text-sm text-gold font-medium">{formatCurrency(wine.price)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{wine.quantity} garrafas</span>
                    <Badge className={`${isLowStock ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'} border-0 text-[10px]`}>
                      {isLowStock ? "Baixo" : "OK"}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

                {/* Descrição */}
                {selectedWine.description && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Descrição</p>
                    <p className="text-sm text-foreground/80 italic">{selectedWine.description}</p>
                  </div>
                )}

                {/* Harmonização */}
                {selectedWine.pairingFood && selectedWine.pairingFood.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <UtensilsCrossed className="h-3 w-3" />
                      Harmonização
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWine.pairingFood.map((food, idx) => (
                        <Badge key={idx} variant="outline" className="text-[11px] font-normal">
                          {food}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Foto do Rótulo */}
                {selectedWine.imageData && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <CameraIcon className="h-3 w-3" />
                      Foto do Rótulo
                    </p>
                    <img
                      src={selectedWine.imageData}
                      alt={`Rótulo ${selectedWine.name}`}
                      className="rounded-lg max-h-48 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Curiosidades IA */}
                {wineCuriosities[selectedWine.id] && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-gold" />
                      Curiosidades
                      <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-full ml-1">IA</span>
                    </p>
                    <ul className="space-y-2">
                      {wineCuriosities[selectedWine.id].map((curiosity, idx) => (
                        <li key={idx} className="text-sm text-foreground/80 flex gap-2">
                          <span className="text-gold shrink-0 mt-0.5">&bull;</span>
                          <span>{curiosity}</span>
                        </li>
                      ))}
                    </ul>
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
