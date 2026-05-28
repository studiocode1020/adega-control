"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  GlassWater,
  Eye,
  Wind,
  Wine as WineIcon,
  Star,
  CheckCircle,
  Clock,
  Thermometer,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getWines } from "@/lib/storage";
import { Wine } from "@/types";

type Step = "select" | "visual" | "olfativo" | "gustativo" | "final";

const TEMP_RECOMMENDATIONS: Record<string, string> = {
  Tinto: "Servir entre 16-18\u00B0C",
  Branco: "Servir entre 8-10\u00B0C",
  "Ros\u00E9": "Servir entre 10-12\u00B0C",
  Espumante: "Servir entre 6-8\u00B0C",
  Sobremesa: "Servir entre 10-12\u00B0C",
  Fortificado: "Servir entre 14-16\u00B0C",
};

const AROMA_CHIPS = [
  "Frutas vermelhas",
  "Frutas negras",
  "Flores",
  "Especiarias",
  "Madeira",
  "Mineral",
  "Herb\u00E1ceo",
  "Tostado",
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DegustacaoPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [selectedWineId, setSelectedWineId] = useState("");
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [visualNotes, setVisualNotes] = useState("");
  const [olfativoNotes, setOlfativoNotes] = useState("");
  const [gustativoNotes, setGustativoNotes] = useState("");
  const [overallNotes, setOverallNotes] = useState("");
  const [rating, setRating] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setWines(getWines());
  }, []);

  const selectedWine = useMemo(
    () => wines.find((w) => w.id === selectedWineId) ?? null,
    [wines, selectedWineId]
  );

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const startTasting = useCallback(() => {
    if (!selectedWineId) return;
    setStep("visual");
    setTimer(0);
    setTimerRunning(true);
  }, [selectedWineId]);

  const goToStep = useCallback(
    (next: Step) => {
      if (next === "final") {
        setTimerRunning(false);
      }
      setStep(next);
    },
    []
  );

  const resetAll = useCallback(() => {
    setStep("select");
    setSelectedWineId("");
    setTimer(0);
    setTimerRunning(false);
    setVisualNotes("");
    setOlfativoNotes("");
    setGustativoNotes("");
    setOverallNotes("");
    setRating(0);
  }, []);

  const saveTasting = useCallback(() => {
    toast.success("Degusta\u00E7\u00E3o salva com sucesso!");
  }, []);

  // ---- Step: select ----
  if (step === "select") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-wine/10">
              <GlassWater className="h-8 w-8 text-wine-light" />
            </div>
            <CardTitle className="text-2xl text-wine-light">
              Modo Degusta\u00E7\u00E3o
            </CardTitle>
            <CardDescription className="text-base">
              Uma experi\u00EAncia guiada para apreciar cada detalhe do seu vinho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Escolha um vinho da sua adega
              </label>
              <Select
                value={selectedWineId}
                onValueChange={(v) => v && setSelectedWineId(v)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Selecione um vinho..." />
                </SelectTrigger>
                <SelectContent>
                  {wines.map((wine) => (
                    <SelectItem key={wine.id} value={wine.id}>
                      {wine.name} ({wine.year}) - {wine.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWine && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <WineIcon className="h-4 w-4 text-wine-light" />
                  <span>{selectedWine.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedWine.producer} &middot; {selectedWine.region},{" "}
                  {selectedWine.country} &middot; {selectedWine.year}
                </div>
                <div className="flex items-center gap-2 mt-3 rounded-md bg-wine/5 px-3 py-2">
                  <Thermometer className="h-4 w-4 text-gold" />
                  <span className="text-sm text-gold font-medium">
                    {TEMP_RECOMMENDATIONS[selectedWine.type] ??
                      "Servir entre 12-16\u00B0C"}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-11 bg-wine hover:bg-wine-light text-white text-base"
              disabled={!selectedWineId}
              onClick={startTasting}
            >
              Iniciar Degusta\u00E7\u00E3o
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Analysis steps (visual / olfativo / gustativo) ----
  if (step === "visual" || step === "olfativo" || step === "gustativo") {
    const config = {
      visual: {
        label: "Etapa 1 de 3 \u2014 An\u00E1lise Visual",
        progress: 33,
        icon: Eye,
        instruction:
          "Observe o vinho na ta\u00E7a. Incline a ta\u00E7a sobre uma superf\u00EDcie branca e analise:",
        items: [
          "Cor e intensidade",
          "Limpidez e brilho",
          "Viscosidade (l\u00E1grimas na ta\u00E7a)",
        ],
        notes: visualNotes,
        setNotes: setVisualNotes,
        placeholder: "Suas observa\u00E7\u00F5es visuais...",
        nextLabel: "Pr\u00F3xima Etapa",
        nextStep: "olfativo" as Step,
      },
      olfativo: {
        label: "Etapa 2 de 3 \u2014 An\u00E1lise Olfativa",
        progress: 66,
        icon: Wind,
        instruction:
          "Aproxime o nariz da ta\u00E7a sem girar. Depois, gire suavemente e sinta novamente:",
        chips: AROMA_CHIPS,
        notes: olfativoNotes,
        setNotes: setOlfativoNotes,
        placeholder: "Seus aromas identificados...",
        nextLabel: "Pr\u00F3xima Etapa",
        nextStep: "gustativo" as Step,
      },
      gustativo: {
        label: "Etapa 3 de 3 \u2014 An\u00E1lise Gustativa",
        progress: 100,
        icon: WineIcon,
        instruction:
          "Tome um pequeno gole e deixe o vinho percorrer toda a boca:",
        items: [
          "Corpo (leve, m\u00E9dio, encorpado)",
          "Taninos (suave, m\u00E9dio, firme)",
          "Acidez (baixa, m\u00E9dia, alta)",
          "Final (curto, m\u00E9dio, longo)",
        ],
        notes: gustativoNotes,
        setNotes: setGustativoNotes,
        placeholder: "Suas impress\u00F5es gustativas...",
        nextLabel: "Finalizar Degusta\u00E7\u00E3o",
        nextStep: "final" as Step,
      },
    } as const;

    const c = config[step];
    const Icon = c.icon;

    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-border/50 animate-in fade-in-0 slide-in-from-right-4 duration-300">
          <CardHeader>
            {/* Progress bar */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  {c.label}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-gold">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatTime(timer)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-wine transition-all duration-500 ease-out"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine/10">
                <Icon className="h-5 w-5 text-wine-light" />
              </div>
              <div>
                <CardTitle className="text-lg text-wine-light">
                  {step === "visual" && "An\u00E1lise Visual"}
                  {step === "olfativo" && "An\u00E1lise Olfativa"}
                  {step === "gustativo" && "An\u00E1lise Gustativa"}
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Instructions */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.instruction}
              </p>
            </div>

            {/* Checklist items or chips */}
            {"items" in c && c.items && (
              <ul className="space-y-2">
                {c.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-md bg-muted/20 px-3 py-2.5 text-sm"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-wine-light shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {"chips" in c && c.chips && (
              <div className="flex flex-wrap gap-2">
                {c.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder={c.placeholder}
              value={c.notes}
              onChange={(e) => c.setNotes(e.target.value)}
            />

            {/* Next button */}
            <Button
              className="w-full h-11 bg-wine hover:bg-wine-light text-white text-base"
              onClick={() => goToStep(c.nextStep)}
            >
              {c.nextLabel}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Step: final ----
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-border/50 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-wine-light">
            Degusta\u00E7\u00E3o Conclu\u00EDda!
          </CardTitle>
          <CardDescription className="text-base">
            Tempo total:{" "}
            <span className="font-mono text-gold">{formatTime(timer)}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Wine info */}
          {selectedWine && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <WineIcon className="h-4 w-4 text-wine-light" />
                <span>{selectedWine.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedWine.type} &middot; {selectedWine.year} &middot;{" "}
                {selectedWine.region}, {selectedWine.country}
              </div>
            </div>
          )}

          {/* Star rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Avalia\u00E7\u00E3o
            </label>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= rating
                        ? "fill-gold text-gold"
                        : "fill-none text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Overall notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Impress\u00E3o geral
            </label>
            <textarea
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="Impress\u00E3o geral e coment\u00E1rios finais..."
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
            />
          </div>

          {/* Notes summary */}
          {(visualNotes || olfativoNotes || gustativoNotes) && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
              <h4 className="text-sm font-medium text-wine-light">
                Resumo das Notas
              </h4>
              {visualNotes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Eye className="h-3 w-3" />
                    Visual
                  </div>
                  <p className="text-sm leading-relaxed">{visualNotes}</p>
                </div>
              )}
              {olfativoNotes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Wind className="h-3 w-3" />
                    Olfativo
                  </div>
                  <p className="text-sm leading-relaxed">{olfativoNotes}</p>
                </div>
              )}
              {gustativoNotes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <WineIcon className="h-3 w-3" />
                    Gustativo
                  </div>
                  <p className="text-sm leading-relaxed">{gustativoNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full h-11 bg-wine hover:bg-wine-light text-white text-base"
              onClick={saveTasting}
            >
              Salvar Degusta\u00E7\u00E3o
            </Button>
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={resetAll}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Nova Degusta\u00E7\u00E3o
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
