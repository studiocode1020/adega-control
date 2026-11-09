"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { SininhoPortal } from "@/components/portal/sininho-portal";

const pageTitles: Record<string, string> = {
  "/": "",
  "/vinhos": "Vinhos",
  "/vinhos/novo": "Novo Vinho",
  "/entradas": "Entrada",
  "/saidas": "Saída",
  "/movimentacoes": "Movimentações",
  "/adega": "Minha Adega",
  "/relatorios": "Relatórios",
  "/wishlist": "Lista de Desejos",
  "/scan": "Scan IA",
  "/recomendacoes": "Recomendações",
  "/acordo-perfeito": "Acordo Perfeito",
  "/degustacao": "Degustação",
  "/clima": "Clima e Vinho",
  "/clientes": "Clientes",
  "/portal": "Portal RFID",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Adega Control";
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/30 bg-card/80 backdrop-blur-lg px-4">
      {isHome ? (
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Image
            src="/logo.png"
            alt="Adega Control"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground truncate">
            Adega Control
          </h1>
        </div>
      ) : (
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground flex-1 truncate">
          {title}
        </h2>
      )}

      <SininhoPortal />
    </header>
  );
}
