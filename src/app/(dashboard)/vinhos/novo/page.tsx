"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWines } from "@/hooks/use-wines";
import type { WineType } from "@/types";

const WINE_TYPES: WineType[] = [
  "Tinto",
  "Branco",
  "Ros\u00e9",
  "Espumante",
  "Sobremesa",
  "Fortificado",
];

const COUNTRIES = [
  "Brasil",
  "Portugal",
  "Argentina",
  "Chile",
  "Fran\u00e7a",
  "It\u00e1lia",
  "Espanha",
  "Austr\u00e1lia",
  "Nova Zel\u00e2ndia",
  "\u00c1frica do Sul",
  "Estados Unidos",
];

export default function NovoVinhoPage() {
  const router = useRouter();
  const { addWine } = useWines();

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState<WineType | "">("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [producer, setProducer] = useState("");
  const [grape, setGrape] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minStock, setMinStock] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim() || !year.trim()) {
      toast.error("Preencha os campos obrigat\u00f3rios.");
      return;
    }

    setIsSubmitting(true);

    try {
      addWine({
        name: name.trim(),
        year: year.trim(),
        type: (type as WineType) || "Tinto",
        country: country || "Brasil",
        region: region.trim(),
        producer: producer.trim(),
        grape: grape.trim(),
        price: parseFloat(price) || 0,
        quantity: parseInt(quantity, 10) || 0,
        minStock: parseInt(minStock, 10) || 0,
        imageUrl: null,
        location: location.trim() || null,
      });

      toast.success("Vinho cadastrado com sucesso!");
      router.push("/vinhos");
    } catch {
      toast.error("Erro ao cadastrar vinho. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Vinho</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre um novo vinho na adega
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Informa\u00e7\u00f5es do Vinho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome do Vinho */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome do Vinho <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Casillero del Diablo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Safra/Ano */}
              <div className="space-y-2">
                <Label htmlFor="year">
                  Safra/Ano <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="year"
                  placeholder="Ex: 2020"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(value) => value && setType(value as WineType)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {WINE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pa\u00eds */}
              <div className="space-y-2">
                <Label htmlFor="country">Pa\u00eds</Label>
                <Select value={country} onValueChange={(v) => v && setCountry(v)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Selecione o pa\u00eds" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Regi\u00e3o */}
              <div className="space-y-2">
                <Label htmlFor="region">Regi\u00e3o</Label>
                <Input
                  id="region"
                  placeholder="Ex: Vale Central"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>

              {/* Produtor */}
              <div className="space-y-2">
                <Label htmlFor="producer">Produtor</Label>
                <Input
                  id="producer"
                  placeholder="Ex: Concha y Toro"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                />
              </div>

              {/* Uva Principal */}
              <div className="space-y-2">
                <Label htmlFor="grape">Uva Principal</Label>
                <Input
                  id="grape"
                  placeholder="Ex: Cabernet Sauvignon"
                  value={grape}
                  onChange={(e) => setGrape(e.target.value)}
                />
              </div>

              {/* Pre\u00e7o */}
              <div className="space-y-2">
                <Label htmlFor="price">Pre\u00e7o</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-10"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Quantidade Inicial */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade Inicial</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Estoque M\u00ednimo */}
              <div className="space-y-2">
                <Label htmlFor="minStock">Estoque M\u00ednimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>

              {/* Localiza\u00e7\u00e3o na Adega */}
              <div className="space-y-2">
                <Label htmlFor="location">Localiza\u00e7\u00e3o na Adega</Label>
                <Input
                  id="location"
                  placeholder="Ex: A1, B3"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/vinhos")}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-wine hover:bg-wine-light text-white"
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
