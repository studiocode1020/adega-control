"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/vinhos": "Vinhos",
  "/vinhos/novo": "Cadastrar Vinho",
  "/entradas": "Registro de Entradas",
  "/saidas": "Registro de Saídas",
  "/movimentacoes": "Histórico de Movimentações",
  "/adega": "Matriz da Adega",
  "/relatorios": "Relatórios",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Adega Control";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold flex-1">
        {title}
      </h2>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-white">
          3
        </Badge>
      </Button>
    </header>
  );
}
