"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wine,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Grid3X3,
  BarChart3,
  LogOut,
  GlassWater,
  Heart,
  Scan,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "principal" },
  { title: "Vinhos", url: "/vinhos", icon: Wine, group: "principal" },
  { title: "Entradas", url: "/entradas", icon: ArrowDownToLine, group: "principal" },
  { title: "Saídas", url: "/saidas", icon: ArrowUpFromLine, group: "principal" },
  { title: "Movimentações", url: "/movimentacoes", icon: History, group: "principal" },
  { title: "Adega", url: "/adega", icon: Grid3X3, group: "principal" },
  { title: "Wishlist", url: "/wishlist", icon: Heart, group: "colecao" },
  { title: "Scan IA", url: "/scan", icon: Scan, group: "colecao" },
  { title: "Recomendações", url: "/recomendacoes", icon: Sparkles, group: "colecao" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, group: "principal" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-wine text-white">
            <GlassWater className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground">
              Adega Control
            </h1>
            <p className="text-xs text-muted-foreground">Gestão de Vinhos</p>
          </div>
        </Link>
      </SidebarHeader>

      <Separator className="mx-4 w-auto" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(i => i.group === "principal").map((item) => {
                const isActive = pathname === item.url ||
                  (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      className={isActive ? "bg-wine/20 text-wine-light font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Minha Coleção</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(i => i.group === "colecao").map((item) => {
                const isActive = pathname === item.url ||
                  (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      className={isActive ? "bg-wine/20 text-wine-light font-medium" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-wine text-white text-sm font-medium">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Administrador</p>
            <p className="text-xs text-muted-foreground truncate">admin@adega.com</p>
          </div>
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
