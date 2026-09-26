"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wine,
  Plus,
  Grid3X3,
  Menu,
  ArrowDownToLine,
  ArrowUpFromLine,
  Scan,
  History,
  BarChart3,
  Heart,
  Sparkles,
  UtensilsCrossed,
  GlassWater,
  CloudSun,
  LogOut,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const mainTabs = [
  { href: "/", icon: LayoutDashboard, label: "Início" },
  { href: "/vinhos", icon: Wine, label: "Vinhos" },
  { href: "__add__", icon: Plus, label: "Novo" },
  { href: "/adega", icon: Grid3X3, label: "Adega" },
  { href: "__menu__", icon: Menu, label: "Menu" },
];

const quickActions = [
  { href: "/entradas", icon: ArrowDownToLine, label: "Registrar Entrada", color: "text-success", bg: "bg-success/10" },
  { href: "/saidas", icon: ArrowUpFromLine, label: "Registrar Saída", color: "text-destructive", bg: "bg-destructive/10" },
  { href: "/vinhos/novo", icon: Wine, label: "Cadastrar Vinho", color: "text-wine-light", bg: "bg-wine/10" },
  { href: "/scan", icon: Scan, label: "Escanear Rótulo", color: "text-gold", bg: "bg-gold/10" },
];

const menuSections = [
  {
    title: "Gestão",
    items: [
      { href: "/movimentacoes", icon: History, label: "Movimentações" },
      { href: "/relatorios", icon: BarChart3, label: "Relatórios" },
    ],
  },
  {
    title: "Minha Coleção",
    items: [
      { href: "/wishlist", icon: Heart, label: "Lista de Desejos" },
      { href: "/recomendacoes", icon: Sparkles, label: "Recomendações IA" },
    ],
  },
  {
    title: "Experiência",
    items: [
      { href: "/acordo-perfeito", icon: UtensilsCrossed, label: "Acordo Perfeito" },
      { href: "/degustacao", icon: GlassWater, label: "Degustação" },
      { href: "/clima", icon: CloudSun, label: "Clima e Vinho" },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Check if current page is one from the menu (to highlight Menu tab)
  const menuPaths = menuSections.flatMap(s => s.items.map(i => i.href));
  const isMenuPageActive = menuPaths.some(p => pathname.startsWith(p));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-lg safe-area-bottom">
        <div className="flex items-end justify-around px-2 pt-1.5 pb-1.5">
          {mainTabs.map((tab) => {
            if (tab.href === "__add__") {
              // Center FAB button
              return (
                <button
                  key="add"
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  className="flex flex-col items-center justify-center -mt-5"
                  aria-label="Ação rápida"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-wine shadow-lg shadow-wine/30 active:scale-90 transition-transform">
                    <Plus className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Novo</span>
                </button>
              );
            }

            if (tab.href === "__menu__") {
              const active = isMenuPageActive;
              return (
                <button
                  key="menu"
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className={`flex flex-col items-center justify-center min-w-[56px] py-1 ${
                    active ? "text-wine-light" : "text-muted-foreground"
                  }`}
                  aria-label="Menu"
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5">{tab.label}</span>
                  {active && <div className="h-0.5 w-4 rounded-full bg-wine-light mt-0.5" />}
                </button>
              );
            }

            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                  active ? "text-wine-light" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
                {active && <div className="h-0.5 w-4 rounded-full bg-wine-light mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Actions Sheet */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8" showCloseButton={false}>
          <SheetHeader className="px-0 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Ação Rápida</SheetTitle>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SheetDescription>O que você deseja fazer?</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {quickActions.map((action) => (
              <button
                key={action.href}
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  router.push(action.href);
                }}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 p-5 active:scale-95 transition-all"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${action.bg}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8" showCloseButton={false}>
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Menu</SheetTitle>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SheetDescription>Todas as funcionalidades</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push(item.href);
                        }}
                        className={`flex items-center gap-3 w-full rounded-xl p-3.5 transition-all active:scale-[0.98] ${
                          active
                            ? "bg-wine/10 text-wine-light"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                        {active && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-wine-light" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Logout */}
            <div className="pt-2 border-t border-border/50">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full rounded-xl p-3.5 text-muted-foreground hover:bg-muted/50 transition-all active:scale-[0.98]"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">Sair</span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
