"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Scan, Sparkles, CheckCircle, Wine, Upload } from "lucide-react";
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

const ANALYSIS_MESSAGES = [
  "Analisando imagem...",
  "Identificando rótulo...",
  "Consultando base de dados...",
  "Extraindo informações...",
];

const SIMULATED_RESULT = {
  confidence: 94,
  name: "Quinta do Crasto Reserva",
  year: 2019,
  type: "Tinto",
  country: "Portugal",
  region: "Douro",
  producer: "Quinta do Crasto",
  grape: "Touriga Nacional",
  price: "R$ 210,00",
  description:
    "Intenso e complexo, com notas de ameixa preta, violeta, chocolate e especiarias.",
  pairings: [
    "Carnes vermelhas grelhadas",
    "Queijos maturados",
    "Cordeiro assado",
    "Risoto de funghi",
    "Chocolate amargo",
  ],
};

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setShowResult(false);
      setPreview(URL.createObjectURL(file));
    },
    []
  );

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setMessageIndex(0);
    setShowResult(false);
  }, []);

  useEffect(() => {
    if (!analyzing) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= ANALYSIS_MESSAGES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    const timeout = setTimeout(() => {
      setAnalyzing(false);
      setShowResult(true);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [analyzing]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setShowResult(false);
    setAnalyzing(false);
    setMessageIndex(0);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const handleAddToAdega = useCallback(() => {
    toast.success("Vinho adicionado à adega!");
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Scan className="h-5 w-5 text-wine-light" />
          <h1 className="text-xl font-bold">Escanear Rotulo</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Use a camera ou envie uma foto do rotulo para identificar o vinho
          automaticamente
        </p>
      </div>

      {/* Upload area */}
      {!analyzing && !showResult && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            {!preview ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-16 flex flex-col items-center justify-center gap-3 hover:border-wine-light/50 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <Camera className="h-10 w-10 text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground">
                  Clique para tirar foto ou enviar imagem
                </span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full max-w-sm mx-auto">
                  <img
                    src={preview}
                    alt="Preview do rotulo"
                    className="w-full rounded-lg object-cover max-h-72"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <Button
                    className="bg-wine hover:bg-wine-light text-white w-full sm:w-auto"
                    size="lg"
                    onClick={handleAnalyze}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </Button>
                  <Button
                    variant="link"
                    onClick={handleReset}
                    className="text-muted-foreground"
                  >
                    Trocar imagem
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis loading */}
      {analyzing && (
        <Card className="border-border/50">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-wine/30" />
              <div className="absolute inset-0 rounded-full border-2 border-t-wine animate-spin" />
            </div>
            <p className="text-sm font-medium text-wine-light animate-pulse">
              {ANALYSIS_MESSAGES[messageIndex]}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Result card */}
      {showResult && (
        <Card className="border-success/40">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-success/20 text-success border-transparent">
                <CheckCircle className="h-3 w-3 mr-1" />
                Identificado com {SIMULATED_RESULT.confidence}% de confianca
              </Badge>
            </div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wine className="h-5 w-5 text-wine-light" />
              {SIMULATED_RESULT.name}
            </CardTitle>
            <CardDescription>{SIMULATED_RESULT.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Wine info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Nome", value: SIMULATED_RESULT.name },
                { label: "Safra", value: SIMULATED_RESULT.year },
                { label: "Tipo", value: SIMULATED_RESULT.type },
                { label: "Pais", value: SIMULATED_RESULT.country },
                { label: "Regiao", value: SIMULATED_RESULT.region },
                { label: "Produtor", value: SIMULATED_RESULT.producer },
                { label: "Uva", value: SIMULATED_RESULT.grape },
                {
                  label: "Preco estimado",
                  value: SIMULATED_RESULT.price,
                  highlight: true,
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p
                    className={`text-sm font-medium ${
                      item.highlight ? "text-gold" : ""
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Harmonizacao */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Harmonizacao
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SIMULATED_RESULT.pairings.map((pairing) => (
                  <Badge
                    key={pairing}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {pairing}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="bg-wine hover:bg-wine-light text-white w-full sm:w-auto"
                size="lg"
                onClick={handleAddToAdega}
              >
                <Wine className="h-4 w-4 mr-2" />
                Adicionar a Adega
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleReset}
              >
                <Scan className="h-4 w-4 mr-2" />
                Escanear Outro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom tip */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4 flex gap-3 items-start">
          <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            A inteligencia artificial analisa o rotulo e cruza com nossa base de
            dados de mais de 50.000 vinhos para identificar automaticamente
            todas as informacoes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
