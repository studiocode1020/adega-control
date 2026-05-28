"use client";

import { useState, useMemo } from "react";
import { Heart, Plus, ShoppingCart, Star, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWishlist } from "@/hooks/use-wishlist";
import { formatCurrency } from "@/lib/format";
import type { WineType, WishlistItem } from "@/types";

const wineTypes: WineType[] = [
  "Tinto",
  "Branco",
  "Rosé",
  "Espumante",
  "Sobremesa",
  "Fortificado",
];

const typeColors: Record<WineType, string> = {
  Tinto: "bg-[#722F37]/40 border-[#722F37] text-[#f0d0d4]",
  Branco: "bg-[#C9A84C]/30 border-[#C9A84C] text-[#e8dbb0]",
  Rosé: "bg-[#DB7093]/30 border-[#DB7093] text-[#f0c0d0]",
  Espumante: "bg-[#A8B5C8]/30 border-[#A8B5C8] text-[#d0d8e4]",
  Sobremesa: "bg-[#D4A574]/30 border-[#D4A574] text-[#e8d4b8]",
  Fortificado: "bg-[#8B6914]/30 border-[#8B6914] text-[#d4c080]",
};

const priorityConfig: Record<
  WishlistItem["priority"],
  { label: string; className: string }
> = {
  alta: { label: "Alta", className: "bg-destructive/20 text-destructive border-destructive/30" },
  media: { label: "Media", className: "bg-gold/20 text-gold border-gold/30" },
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

const defaultForm = {
  name: "",
  year: "",
  type: "Tinto" as WineType,
  country: "",
  region: "",
  producer: "",
  grape: "",
  estimatedPrice: 0,
  priority: "media" as WishlistItem["priority"],
  notes: "",
};

export default function WishlistPage() {
  const { items, addItem, togglePurchased, removeItem } = useWishlist();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const stats = useMemo(() => {
    const total = items.length;
    const estimatedInvestment = items
      .filter((i) => !i.purchased)
      .reduce((sum, i) => sum + i.estimatedPrice, 0);
    const highPriority = items.filter(
      (i) => i.priority === "alta" && !i.purchased
    ).length;
    return { total, estimatedInvestment, highPriority };
  }, [items]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.year.trim()) {
      toast.error("Preencha pelo menos o nome e a safra.");
      return;
    }

    addItem({
      name: form.name.trim(),
      year: form.year.trim(),
      type: form.type,
      country: form.country.trim(),
      region: form.region.trim(),
      producer: form.producer.trim(),
      grape: form.grape.trim(),
      estimatedPrice: form.estimatedPrice,
      priority: form.priority,
      notes: form.notes.trim() || null,
    });

    toast.success(`"${form.name}" adicionado a lista de desejos!`);
    setForm(defaultForm);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-wine-light" />
          <div>
            <h1 className="text-2xl font-bold">Lista de Desejos</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "vinho" : "vinhos"} na lista
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="bg-wine hover:bg-wine-light text-white">
                <Plus className="h-4 w-4" />
                Adicionar Vinho
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-wine-light" />
                Adicionar a Lista de Desejos
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wl-name">Nome</Label>
                  <Input
                    id="wl-name"
                    placeholder="Nome do vinho"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-year">Safra</Label>
                  <Input
                    id="wl-year"
                    placeholder="Ex: 2020"
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, year: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wl-type">Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      v && setForm((f) => ({ ...f, type: v as WineType }))
                    }
                  >
                    <SelectTrigger id="wl-type" className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {wineTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-country">Pais</Label>
                  <Input
                    id="wl-country"
                    placeholder="Ex: Franca"
                    value={form.country}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, country: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wl-region">Regiao</Label>
                  <Input
                    id="wl-region"
                    placeholder="Ex: Bordeaux"
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-producer">Produtor</Label>
                  <Input
                    id="wl-producer"
                    placeholder="Ex: Chateau Margaux"
                    value={form.producer}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, producer: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wl-grape">Uva</Label>
                  <Input
                    id="wl-grape"
                    placeholder="Ex: Cabernet Sauvignon"
                    value={form.grape}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, grape: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-price">Preco estimado (R$)</Label>
                  <Input
                    id="wl-price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    value={form.estimatedPrice || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        estimatedPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-priority">Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    v &&
                    setForm((f) => ({
                      ...f,
                      priority: v as WishlistItem["priority"],
                    }))
                  }
                >
                  <SelectTrigger id="wl-priority" className="w-full">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-notes">Notas</Label>
                <textarea
                  id="wl-notes"
                  className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 min-h-[80px] resize-y"
                  placeholder="Observacoes sobre o vinho..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-wine hover:bg-wine-light text-white"
              >
                <Plus className="h-4 w-4" />
                Adicionar a Lista
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Heart className="h-5 w-5 text-wine-light mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total de desejos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-5 w-5 text-gold mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              Investimento estimado
            </p>
            <p className="text-2xl font-bold text-gold">
              {formatCurrency(stats.estimatedInvestment)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Prioridade alta</p>
            <p className="text-2xl font-bold text-destructive">
              {stats.highPriority}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wishlist Cards Grid */}
      {items.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Sua lista de desejos esta vazia.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione vinhos que voce deseja adquirir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`border-border/50 relative overflow-hidden transition-all ${
                item.purchased ? "opacity-75" : ""
              }`}
            >
              {item.purchased && (
                <div className="absolute inset-0 bg-success/10 z-0" />
              )}
              <CardContent className="p-4 space-y-3 relative z-10">
                {/* Top row: name + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base leading-tight truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Safra {item.year}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      className={`border text-xs ${typeColors[item.type]}`}
                    >
                      {item.type}
                    </Badge>
                    <Badge
                      className={`border text-xs ${priorityConfig[item.priority].className}`}
                    >
                      {priorityConfig[item.priority].label}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {item.country && (
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Pais/Regiao
                      </span>
                      <p className="truncate">
                        {item.country}
                        {item.region ? ` - ${item.region}` : ""}
                      </p>
                    </div>
                  )}
                  {item.producer && (
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Produtor
                      </span>
                      <p className="truncate">{item.producer}</p>
                    </div>
                  )}
                  {item.grape && (
                    <div>
                      <span className="text-muted-foreground text-xs">Uva</span>
                      <p className="truncate">{item.grape}</p>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <p className="text-gold font-semibold">
                    {formatCurrency(item.estimatedPrice)}
                  </p>
                  {item.purchased && (
                    <Badge className="bg-success/20 text-success border-success/30 border text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Comprado!
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                {item.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant={item.purchased ? "outline" : "default"}
                    size="sm"
                    className={
                      item.purchased
                        ? ""
                        : "bg-wine hover:bg-wine-light text-white"
                    }
                    onClick={() => togglePurchased(item.id)}
                  >
                    {item.purchased ? (
                      <>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Desfazer compra
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Marcar como comprado
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => {
                      removeItem(item.id);
                      toast.success(`"${item.name}" removido da lista.`);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
