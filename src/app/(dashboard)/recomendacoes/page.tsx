"use client";

import { useState, useCallback } from "react";
import { Sparkles, Heart, Star, TrendingUp, Brain, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

const TASTE_TAGS = [
  "Tintos encorpados",
  "Terroir europeu",
  "Safras classicas",
  "Boa relacao custo-beneficio",
];

const RECOMMENDATIONS = [
  {
    id: 1,
    name: "Brunello di Montalcino",
    year: 2018,
    type: "Tinto",
    country: "Italia",
    region: "Toscana",
    producer: "Biondi-Santi",
    grape: "Sangiovese",
    price: 980,
    compatibility: 98,
    reason:
      "Voce aprecia Sangiovese (Tignanello) e vinhos italianos. Este e o apice da uva na Toscana.",
    pairings: ["Bistecca alla fiorentina", "Parmigiano Reggiano", "Pasta al ragu", "Ossobuco"],
  },
  {
    id: 2,
    name: "Douro Reserva",
    year: 2019,
    type: "Tinto",
    country: "Portugal",
    region: "Douro",
    producer: "Niepoort",
    grape: "Touriga Nacional, Tinta Roriz",
    price: 280,
    compatibility: 96,
    reason:
      "Sua colecao tem forte presenca portuguesa. Este Douro vai complementar perfeitamente o Quinta do Crasto.",
    pairings: ["Bacalhau assado", "Cabrito", "Queijo Serra da Estrela"],
  },
  {
    id: 3,
    name: "Malbec Reserva",
    year: 2020,
    type: "Tinto",
    country: "Argentina",
    region: "Mendoza",
    producer: "Zuccardi",
    grape: "Malbec",
    price: 195,
    compatibility: 95,
    reason:
      "Seu gosto por Malbec argentino e claro. Zuccardi e a nova referencia de Mendoza.",
    pairings: ["Asado", "Empanadas", "Provoleta", "Chimichurri"],
  },
  {
    id: 4,
    name: "Chablis Premier Cru",
    year: 2021,
    type: "Branco",
    country: "Franca",
    region: "Bourgogne",
    producer: "William Fevre",
    grape: "Chardonnay",
    price: 350,
    compatibility: 92,
    reason:
      "Sua colecao tem poucos brancos premium. Este Chablis seria uma adicao equilibrada.",
    pairings: ["Frutos do mar", "Sushi", "Queijo de cabra"],
  },
];

export default function RecomendacoesPage() {
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const handleAddWishlist = useCallback((id: number) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success("Adicionado a lista de desejos!");
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Recomendacoes atualizadas!");
    }, 2000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-gold" />
          <h1 className="text-xl font-bold">Recomendacoes IA</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Baseado nos vinhos da sua colecao, a inteligencia artificial sugere
          novos rotulos para voce experimentar
        </p>
      </div>

      {/* Profile card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-wine-light" />
            Seu Perfil de Gosto
          </CardTitle>
          <CardDescription>
            Baseado em 20 rotulos na sua adega
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {TASTE_TAGS.map((tag) => (
              <Badge key={tag} className="bg-wine/20 text-wine-light border-transparent">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Voce tem preferencia por vinhos tintos (60% da adega), com destaque
            para uvas Cabernet Sauvignon e Malbec. Seus vinhos vem
            predominantemente de Portugal, Argentina e Brasil.
          </p>
        </CardContent>
      </Card>

      {/* Recommendations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RECOMMENDATIONS.map((rec) => (
          <Card key={rec.id} className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-gold/20 text-gold border-transparent">
                  <Star className="h-3 w-3 mr-1" />
                  {rec.compatibility}% compativel
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                  {rec.type}
                </Badge>
              </div>
              <CardTitle className="text-base mt-2">
                {rec.name} {rec.year}
              </CardTitle>
              <CardDescription>
                {rec.producer} &middot; {rec.country}, {rec.region}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Uva</p>
                  <p className="text-sm font-medium">{rec.grape}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preco estimado</p>
                  <p className="text-sm font-medium text-gold">
                    {formatCurrency(rec.price)}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Por que recomendamos:
                </p>
                <p className="text-sm leading-relaxed">{rec.reason}</p>
              </div>

              {/* Harmonizacao */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Harmonizacao
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {rec.pairings.join(" \u00b7 ")}
                </p>
              </div>

              {/* Action */}
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleAddWishlist(rec.id)}
                disabled={wishlist.has(rec.id)}
              >
                <Heart
                  className={`h-4 w-4 mr-2 ${
                    wishlist.has(rec.id)
                      ? "fill-wine-light text-wine-light"
                      : ""
                  }`}
                />
                {wishlist.has(rec.id)
                  ? "Adicionado a Wishlist"
                  : "Adicionar a Wishlist"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom action card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-medium mb-1">
              Quer mais recomendacoes?
            </h3>
            <p className="text-xs text-muted-foreground">
              Quanto mais vinhos voce cadastrar e avaliar, mais precisas ficam
              as sugestoes.
            </p>
          </div>
          <Button
            className="bg-wine hover:bg-wine-light text-white shrink-0 w-full sm:w-auto"
            size="lg"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Atualizando..." : "Atualizar Recomendacoes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
