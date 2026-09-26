"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { Bell, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Trash2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

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
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Adega Control";
  const isHome = pathname === "/";
  const { notifications, pending, confirm, reject, clearResolved } = useNotifications();

  const resolvedCount = notifications.filter(n => n.status !== 'pending').length;

  const handleConfirm = (notifId: string, wineName: string | null, type: 'entrada' | 'saida') => {
    confirm(notifId);
    const label = type === 'saida' ? 'Saída' : 'Entrada';
    toast.success(`${label} confirmada: ${wineName}`);
  };

  const handleReject = (notifId: string) => {
    reject(notifId);
    toast("Detecção rejeitada");
  };

  const handleClearResolved = () => {
    clearResolved();
    toast("Notificações resolvidas removidas");
  };

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

      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px] shrink-0" />
          }
        >
          <Bell className="h-5 w-5" />
          {pending.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-white">
              {pending.length}
            </Badge>
          )}
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
          <SheetHeader>
            <SheetTitle>
              Notificações do Sensor
            </SheetTitle>
            <SheetDescription>
              {pending.length > 0
                ? `${pending.length} detecção${pending.length > 1 ? 'ões' : ''} pendente${pending.length > 1 ? 's' : ''}`
                : 'Nenhuma detecção pendente'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-3 text-green-500/60" />
                <p className="text-sm font-medium">Nenhuma detecção pendente</p>
                <p className="text-xs mt-1">O sensor RFID está monitorando.</p>
              </div>
            ) : (
              pending.map((notif) => (
                <div
                  key={notif.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {notif.type === 'entrada' ? (
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notif.wineName
                          ? notif.wineName
                          : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Tag className="h-3 w-3" />
                              Tag desconhecida: {notif.tagId}
                            </span>
                          )
                        }
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${notif.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                          {notif.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(notif.detectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-8">
                    {notif.wineId ? (
                      <>
                        <Button
                          size="xs"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white border-transparent"
                          onClick={() => handleConfirm(notif.id, notif.wineName, notif.type)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="flex-1"
                          onClick={() => handleReject(notif.id)}
                        >
                          Rejeitar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        className="flex-1"
                        onClick={() => handleReject(notif.id)}
                      >
                        Rejeitar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {resolvedCount > 0 && (
            <SheetFooter>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleClearResolved}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar {resolvedCount} resolvida{resolvedCount > 1 ? 's' : ''}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
