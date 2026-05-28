"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sun,
  CloudSun,
  CloudRain,
  Moon,
  Thermometer,
  Wine as WineIcon,
  Snowflake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getWines } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";
import type { Wine, WineType } from "@/types";

type WeatherType = "hot" | "mild" | "cold" | "special";

interface WeatherOption {
  id: WeatherType;
  label: string;
  subtitle: string;
  temp: string;
  icon: typeof Sun;
  gradient: string;
  selectedBorder: string;
  iconColor: string;
  bgHover: string;
}

const WEATHER_OPTIONS: WeatherOption[] = [
  {
    id: "hot",
    label: "Dia quente",
    subtitle: "Sol forte, calor",
    temp: "30\u00b0C+",
    icon: Sun,
    gradient:
      "bg-gradient-to-br from-amber-500/10 to-orange-500/10",
    selectedBorder: "ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    iconColor: "text-amber-500",
    bgHover: "hover:from-amber-500/15 hover:to-orange-500/15",
  },
  {
    id: "mild",
    label: "Dia ameno",
    subtitle: "Agradavel, clima perfeito",
    temp: "18-25\u00b0C",
    icon: CloudSun,
    gradient:
      "bg-gradient-to-br from-sky-500/10 to-blue-400/10",
    selectedBorder: "ring-2 ring-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]",
    iconColor: "text-sky-400",
    bgHover: "hover:from-sky-500/15 hover:to-blue-400/15",
  },
  {
    id: "cold",
    label: "Dia frio",
    subtitle: "Frio, chuva ou vento",
    temp: "< 18\u00b0C",
    icon: CloudRain,
    gradient:
      "bg-gradient-to-br from-blue-700/10 to-slate-600/10",
    selectedBorder: "ring-2 ring-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]",
    iconColor: "text-blue-600",
    bgHover: "hover:from-blue-700/15 hover:to-slate-600/15",
  },
  {
    id: "special",
    label: "Noite especial",
    subtitle: "Jantar, celebracao, momento especial",
    temp: "",
    icon: Moon,
    gradient:
      "bg-gradient-to-br from-purple-600/10 to-violet-500/10",
    selectedBorder: "ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    iconColor: "text-purple-400",
    bgHover: "hover:from-purple-600/15 hover:to-violet-500/15",
  },
];

const WEATHER_MESSAGES: Record<WeatherType, string> = {
  hot: "Em dias quentes, nada como um vinho fresco e leve. A temperatura ideal de servico e ainda mais importante \u2014 mantenha bem gelado!",
  mild: "O clima ameno pede versatilidade. Um tinto medio ou um branco aromatico sao escolhas certeiras.",
  cold: "O frio pede vinhos que aquecam a alma. Tintos encorpados e fortificados sao perfeitos para este momento.",
  special:
    "Momentos especiais merecem garrafas especiais. Comece com espumante e evolua para seu melhor tinto.",
};

const SERVE_TEMPS: Record<WineType, string> = {
  Tinto: "16-18\u00b0C",
  Branco: "8-10\u00b0C",
  "Ros\u00e9": "10-12\u00b0C",
  Espumante: "6-8\u00b0C",
  Sobremesa: "10-12\u00b0C",
  Fortificado: "14-16\u00b0C",
};

function getServingTip(weather: WeatherType, wineType: WineType): string {
  switch (weather) {
    case "hot":
      if (wineType === "Espumante") return "Coloque na geladeira 30 minutos antes de servir";
      return "Coloque na geladeira 1 hora antes de servir";
    case "cold":
      if (wineType === "Tinto") return "Abra a garrafa 1 hora antes para decantar";
      if (wineType === "Fortificado") return "Abra a garrafa 30 minutos antes para decantar";
      return "Abra a garrafa 30 minutos antes para decantar";
    case "mild":
      return "Sirva na temperatura ambiente \u2014 esta perfeita para este vinho";
    case "special":
      return "Deixe respirar por 20 minutos para revelar todos os aromas";
    default:
      return "";
  }
}

function getTypeBadgeClass(wineType: WineType): string {
  switch (wineType) {
    case "Tinto":
      return "bg-red-900/30 text-red-300 border-transparent";
    case "Branco":
      return "bg-yellow-900/20 text-yellow-300 border-transparent";
    case "Ros\u00e9":
      return "bg-pink-900/20 text-pink-300 border-transparent";
    case "Espumante":
      return "bg-emerald-900/20 text-emerald-300 border-transparent";
    case "Sobremesa":
      return "bg-amber-900/20 text-amber-300 border-transparent";
    case "Fortificado":
      return "bg-orange-900/20 text-orange-300 border-transparent";
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
}

function getSuggestions(wines: Wine[], weather: WeatherType): Wine[] {
  if (wines.length === 0) return [];

  const preferredTypes: Record<WeatherType, WineType[]> = {
    hot: ["Branco", "Ros\u00e9", "Espumante"],
    mild: ["Tinto", "Ros\u00e9", "Branco"],
    cold: ["Tinto", "Fortificado"],
    special: ["Espumante", "Tinto"],
  };

  const types = preferredTypes[weather];
  const preferred = wines.filter(
    (w) => types.includes(w.type) && w.quantity > 0
  );

  let sorted: Wine[];

  switch (weather) {
    case "hot":
      sorted = [...preferred].sort((a, b) => a.price - b.price);
      break;
    case "cold":
      sorted = [...preferred].sort((a, b) => b.price - a.price);
      break;
    case "special": {
      const espumantes = preferred
        .filter((w) => w.type === "Espumante")
        .sort((a, b) => b.price - a.price);
      const tintos = preferred
        .filter((w) => w.type === "Tinto")
        .sort((a, b) => b.price - a.price);
      sorted = [...espumantes, ...tintos];
      break;
    }
    case "mild":
    default:
      sorted = [...preferred].sort((a, b) => a.price - b.price);
      break;
  }

  if (sorted.length < 3) {
    const remaining = wines
      .filter(
        (w) => !sorted.find((s) => s.id === w.id) && w.quantity > 0
      )
      .sort((a, b) => b.price - a.price);
    sorted = [...sorted, ...remaining];
  }

  return sorted.slice(0, 3);
}

export default function ClimaPage() {
  const [selected, setSelected] = useState<WeatherType | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);

  useEffect(() => {
    setWines(getWines());
  }, []);

  const handleSelect = useCallback((weather: WeatherType) => {
    setSelected(weather);
    setShowSuggestions(false);
    const timer = setTimeout(() => {
      setShowSuggestions(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const suggestions = useMemo(() => {
    if (!selected) return [];
    return getSuggestions(wines, selected);
  }, [wines, selected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CloudSun className="h-5 w-5 text-gold" />
          <h1 className="text-xl font-bold">Clima e Vinho</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          O tempo la fora influencia o vinho perfeito. Selecione como esta o dia.
        </p>
      </div>

      {/* Weather selection grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {WEATHER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`
                relative flex flex-col items-center gap-2 rounded-xl p-5
                transition-all duration-300 cursor-pointer text-center
                ${option.gradient} ${option.bgHover}
                border border-border/50
                ${isSelected
                  ? `${option.selectedBorder} scale-[1.03]`
                  : "hover:scale-[1.02]"
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${option.label} - ${option.subtitle}`}
            >
              <Icon
                className={`h-10 w-10 ${option.iconColor} transition-transform duration-300 ${
                  isSelected ? "scale-110" : ""
                }`}
              />
              <span className="font-semibold text-sm">{option.label}</span>
              {option.temp && (
                <span className="text-xs text-muted-foreground">
                  {option.temp}
                </span>
              )}
              <span className="text-xs text-muted-foreground/70 leading-tight">
                {option.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Suggestions section */}
      {selected && showSuggestions && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Weather message */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <WineIcon className="h-5 w-5 text-wine-light shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  {WEATHER_MESSAGES[selected]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Wine suggestion cards */}
          {suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestions.map((wine, index) => (
                <Card
                  key={wine.id}
                  className="border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500"
                  style={{ animationDelay: `${index * 150}ms`, animationFillMode: "both" }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={getTypeBadgeClass(wine.type)}>
                        {wine.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {wine.country}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-1.5">
                      {wine.name}
                    </CardTitle>
                    <CardDescription>{wine.year}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Price */}
                    <p className="text-lg font-semibold text-gold">
                      {formatCurrency(wine.price)}
                    </p>

                    {/* Description */}
                    {wine.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {wine.description}
                      </p>
                    )}

                    {/* Serve temperature */}
                    <div className="flex items-center gap-2 text-xs">
                      <Thermometer className="h-3.5 w-3.5 text-wine-light" />
                      <span className="text-muted-foreground">
                        Servir a{" "}
                        <span className="text-foreground font-medium">
                          {SERVE_TEMPS[wine.type]}
                        </span>
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-2 text-xs">
                      <WineIcon className="h-3.5 w-3.5 text-wine-light" />
                      <span className="text-muted-foreground">
                        {wine.quantity} garrafa{wine.quantity !== 1 ? "s" : ""} na adega
                      </span>
                    </div>

                    {/* Serving tip */}
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Snowflake className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {getServingTip(selected, wine.type)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <WineIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum vinho encontrado na sua adega para este clima.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Cadastre novos vinhos para receber sugestoes personalizadas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading animation while waiting for suggestions */}
      {selected && !showSuggestions && (
        <div className="flex flex-col items-center gap-3 py-8 animate-in fade-in duration-300">
          <div className="relative">
            <WineIcon className="h-8 w-8 text-wine-light animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Analisando sua adega para o clima selecionado...
          </p>
        </div>
      )}

      {/* Bottom curiosity card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Thermometer className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Voce sabia?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A temperatura de servico pode mudar completamente a percepcao de
                um vinho. Um tinto servido gelado demais perde aromas, enquanto
                um branco quente fica pesado e alcoolico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
