"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  UtensilsCrossed,
  Search,
  Sparkles,
  Wine as WineIcon,
  Lightbulb,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getWines } from "@/lib/storage";
import type { Wine, WineType } from "@/types";

const QUICK_SUGGESTIONS = [
  "Churrasco",
  "Massa",
  "Peixe grelhado",
  "Pizza",
  "Queijos",
  "Sobremesa",
  "Salada",
  "Comida japonesa",
];

const LOADING_MESSAGES = [
  "Analisando seu prato...",
  "Consultando harmonizacoes...",
  "Selecionando o melhor da sua adega...",
];

const MATCH_LABELS = [
  "Harmonizacao perfeita",
  "Excelente opcao",
  "Boa alternativa",
];

const TYPE_COLORS: Record<WineType, string> = {
  Tinto: "bg-red-900/30 text-red-300",
  Branco: "bg-yellow-900/30 text-yellow-300",
  "Rosé": "bg-pink-900/30 text-pink-300",
  Espumante: "bg-amber-900/30 text-amber-300",
  Sobremesa: "bg-orange-900/30 text-orange-300",
  Fortificado: "bg-purple-900/30 text-purple-300",
};

function getTypeExplanation(type: WineType): string {
  switch (type) {
    case "Tinto":
      return "taninos que equilibram a gordura e intensificam os sabores";
    case "Branco":
      return "acidez refrescante que limpa o paladar e realca os sabores delicados";
    case "Rosé":
      return "versatilidade e frescor que acompanha pratos leves";
    case "Espumante":
      return "efervescencia que limpa o paladar a cada gole";
    default:
      return "complexidade aromatica que eleva a experiencia gastronomica";
  }
}

interface MatchedWine {
  wine: Wine;
  matchedFoods: string[];
  score: number;
}

function findMatchingWines(query: string, wines: Wine[]): MatchedWine[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return [];

  const results: MatchedWine[] = [];

  for (const wine of wines) {
    if (wine.quantity <= 0) continue;

    const matchedFoods: string[] = [];

    for (const food of wine.pairingFood) {
      const foodLower = food.toLowerCase();
      for (const word of words) {
        if (foodLower.includes(word)) {
          if (!matchedFoods.includes(food)) {
            matchedFoods.push(food);
          }
          break;
        }
      }
    }

    if (matchedFoods.length > 0) {
      results.push({ wine, matchedFoods, score: matchedFoods.length });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3);
}

function getFallbackWine(wines: Wine[]): MatchedWine | null {
  const tintos = wines.filter((w) => w.type === "Tinto" && w.quantity > 0);
  if (tintos.length === 0) return null;
  const random = tintos[Math.floor(Math.random() * tintos.length)];
  return { wine: random, matchedFoods: [], score: 0 };
}

export default function AcordoPerfeitoPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [results, setResults] = useState<MatchedWine[] | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setWines(getWines());
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setSearched(true);
    setResults(null);
    setLoadingMessage(LOADING_MESSAGES[0]);

    const timer1 = setTimeout(() => {
      setLoadingMessage(LOADING_MESSAGES[1]);
    }, 800);

    const timer2 = setTimeout(() => {
      setLoadingMessage(LOADING_MESSAGES[2]);
    }, 1600);

    timerRef.current = setTimeout(() => {
      const matched = findMatchingWines(query, wines);
      if (matched.length > 0) {
        setResults(matched);
      } else {
        const fallback = getFallbackWine(wines);
        setResults(fallback ? [fallback] : []);
      }
      setLoading(false);
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, wines, loading]);

  const handleChipClick = useCallback((chip: string) => {
    setQuery(chip);
    setResults(null);
    setSearched(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed className="h-5 w-5 text-gold" />
          <h1 className="text-xl font-bold">Acordo Perfeito</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Diga o que voce vai preparar e encontramos o vinho ideal da sua adega
        </p>
      </div>

      {/* Input section */}
      <Card className="border-border/50">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                className="h-12 pl-10 text-base"
                placeholder="O que voce vai preparar? Ex: risoto de cogumelos, churrasco, sushi..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button
              className="bg-wine hover:bg-wine-light text-white h-12 px-6 shrink-0"
              onClick={handleSearch}
              disabled={!query.trim() || loading}
            >
              <ChefHat className="h-4 w-4 mr-2 hidden sm:inline-block" />
              <span className="hidden sm:inline">Encontrar Vinho</span>
              <Search className="h-4 w-4 sm:hidden" />
            </Button>
          </div>

          {/* Quick suggestion chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Sugestoes rapidas:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-wine/10 hover:text-wine-light hover:border-wine/30 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="border-border/50">
          <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Sparkles className="h-10 w-10 text-gold animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-wine-light">
                {loadingMessage}
              </p>
              <div className="flex justify-center gap-1 mt-3">
                <span className="h-2 w-2 rounded-full bg-wine animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-wine animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-wine animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && results !== null && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center space-y-3">
                <WineIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">
                    Nenhum vinho encontrado na sua adega
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente buscar por outro prato ou adicione mais vinhos a sua
                    colecao com harmonizacoes cadastradas.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-medium">
                  {results[0].score > 0
                    ? `Encontramos ${results.length} ${results.length === 1 ? "vinho" : "vinhos"} para "${query}"`
                    : `Nenhuma harmonizacao exata, mas sugerimos este Tinto da sua adega`}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((result, index) => {
                  const { wine, matchedFoods } = result;
                  const unmatchedFoods = wine.pairingFood.filter(
                    (f) => !matchedFoods.includes(f)
                  );
                  const matchLabel = MATCH_LABELS[index] ?? "Boa alternativa";
                  const matchedFoodText =
                    matchedFoods.length > 0
                      ? matchedFoods.join(", ")
                      : wine.pairingFood.slice(0, 2).join(", ") ||
                        "diversos pratos";

                  return (
                    <Card key={wine.id} className="border-border/50">
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Badge
                            className={
                              index === 0
                                ? "bg-gold/20 text-gold border-transparent"
                                : index === 1
                                  ? "bg-wine/20 text-wine-light border-transparent"
                                  : "bg-muted text-muted-foreground border-transparent"
                            }
                          >
                            {index === 0 && (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            {matchLabel}
                          </Badge>
                          <Badge
                            className={`border-transparent text-xs font-normal ${TYPE_COLORS[wine.type] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {wine.type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2">
                          {wine.name} {wine.year}
                        </CardTitle>
                        <CardDescription>
                          {wine.producer} &middot; {wine.country},{" "}
                          {wine.region}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Price and grape */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Uva</p>
                            <p className="text-sm font-medium">{wine.grape}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Preco
                            </p>
                            <p className="text-sm font-medium text-gold">
                              {formatCurrency(wine.price)}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {wine.description && (
                          <p className="text-sm italic text-muted-foreground leading-relaxed">
                            {wine.description}
                          </p>
                        )}

                        {/* Pairing food badges */}
                        {wine.pairingFood.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">
                              Harmonizacoes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {matchedFoods.map((food) => (
                                <Badge
                                  key={food}
                                  className="bg-gold/15 text-gold border-transparent text-xs"
                                >
                                  {food}
                                </Badge>
                              ))}
                              {unmatchedFoods.map((food) => (
                                <Badge
                                  key={food}
                                  variant="outline"
                                  className="text-xs font-normal"
                                >
                                  {food}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI explanation */}
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Por que este vinho?
                          </p>
                          <p className="text-sm leading-relaxed">
                            O {wine.type.toLowerCase()} {wine.name} da regiao
                            de {wine.region} combina perfeitamente com{" "}
                            {matchedFoodText}. {wine.grape} traz{" "}
                            {getTypeExplanation(wine.type)}.
                          </p>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-2 text-sm">
                          <WineIcon className="h-4 w-4 text-wine-light" />
                          <span className="text-muted-foreground">
                            {wine.quantity}{" "}
                            {wine.quantity === 1
                              ? "garrafa disponivel"
                              : "garrafas disponiveis"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom tip card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4 sm:p-6 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Dica:</span> quanto
            mais detalhado o prato, melhor a sugestao. Experimente incluir o
            tipo de preparo e ingredientes principais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
