"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { carregarDados } from "@/lib/storage";

// Segura as telas até os dados do Supabase chegarem: os hooks leem o cache
// de forma síncrona ao montar, então ele precisa estar cheio antes.
export function DataGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");

  const carregar = useCallback(() => {
    carregarDados()
      .then(() => setEstado("pronto"))
      .catch((erro) => {
        console.error("[data-gate] falha ao carregar dados", erro);
        setEstado("erro");
      });
  }, []);

  useEffect(carregar, [carregar]);

  const tentarDeNovo = () => {
    setEstado("carregando");
    carregar();
  };

  if (estado === "pronto") return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 object-contain opacity-80" priority />
      {estado === "carregando" ? (
        <p className="text-sm text-muted-foreground">Abrindo sua adega…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Não foi possível carregar seus vinhos. Confira a internet.</p>
          <Button onClick={tentarDeNovo}>Tentar de novo</Button>
        </>
      )}
    </div>
  );
}
