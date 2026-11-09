"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Search,
  RadioTower,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { usePortal } from "@/hooks/use-portal";
import { getBottles, getWines } from "@/lib/storage";
import type { ExitReason, PortalEvent, Wine } from "@/types";

export function tempoAtras(data: string): string {
  const min = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

/** Últimos 8 dígitos bastam para reconhecer a etiqueta na mão. */
export function epcCurto(epc: string) {
  return epc.length > 8 ? `…${epc.slice(-8)}` : epc;
}

const MOTIVOS: { valor: ExitReason; rotulo: string }[] = [
  { valor: "consumo", rotulo: "Consumo" },
  { valor: "venda", rotulo: "Venda" },
  { valor: "perda", rotulo: "Perda" },
  { valor: "devolucao", rotulo: "Devolução" },
];

export function SininhoPortal() {
  const { disponivel, pendentes, confirmar, recusar, vincular } = usePortal();
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Toda ação passa por aqui: trava o cartão enquanto o banco responde e
  // mostra a mensagem do banco se der errado.
  async function agir(id: string, acao: () => Promise<void>, sucesso: string) {
    setOcupado(id);
    try {
      await acao();
      toast.success(sucesso);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative min-h-[44px] min-w-[44px] shrink-0"
            aria-label="Detecções do portal"
          />
        }
      >
        <Bell className="h-5 w-5" />
        {pendentes.length > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-destructive text-white">
            {pendentes.length}
          </Badge>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle>Portal da Adega</SheetTitle>
          <SheetDescription>
            {pendentes.length > 0
              ? `${pendentes.length} passagem${pendentes.length > 1 ? "ns" : ""} para confirmar`
              : "Nada para confirmar"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 text-success/60" />
              <p className="text-sm font-medium">Tudo em dia</p>
              <p className="text-xs mt-1 max-w-[240px]">
                {disponivel
                  ? "Quando uma garrafa passar pela porta, ela aparece aqui para você confirmar."
                  : "O portal RFID ainda não foi instalado nesta adega."}
              </p>
            </div>
          ) : (
            pendentes.map((ev) => (
              <CartaoDeteccao
                key={ev.id}
                evento={ev}
                ocupado={ocupado === ev.id}
                onConfirmar={(motivo) =>
                  agir(ev.id, () => confirmar(ev.id, motivo), ev.kind === "saida" ? "Saída registrada" : "Volta registrada")
                }
                onRecusar={() => agir(ev.id, () => recusar(ev.id), "Detecção descartada")}
                onVincular={(wineId, nova) => agir(ev.id, () => vincular(ev.id, wineId, nova), "Etiqueta vinculada")}
              />
            ))
          )}
        </div>

        {disponivel && (
          <SheetFooter>
            <Link href="/portal" className="w-full">
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                <RadioTower className="h-4 w-4 mr-2" />
                Aparelho e histórico do portal
              </Button>
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartaoDeteccao({
  evento,
  ocupado,
  onConfirmar,
  onRecusar,
  onVincular,
}: {
  evento: PortalEvent;
  ocupado: boolean;
  onConfirmar: (motivo: ExitReason) => void;
  onRecusar: () => void;
  onVincular: (wineId: string, garrafaNova: boolean) => void;
}) {
  const [motivo, setMotivo] = useState<ExitReason>("consumo");
  const vinho = evento.wineId ? getWines().find((w) => w.id === evento.wineId) : undefined;
  const nomeVinho = vinho ? `${vinho.name}${vinho.year ? ` ${vinho.year}` : ""}` : "Vinho removido";

  const icone =
    evento.kind === "saida" ? (
      <ArrowUpCircle className="h-5 w-5 text-destructive" />
    ) : evento.kind === "entrada" ? (
      <ArrowDownCircle className="h-5 w-5 text-success" />
    ) : (
      <Tag className="h-5 w-5 text-gold" />
    );

  const titulo = evento.kind === "etiqueta_nova" ? "Etiqueta nova" : nomeVinho;
  const acontecimento =
    evento.kind === "saida" ? "Saiu pela porta" : evento.kind === "entrada" ? "Voltou para a adega" : epcCurto(evento.epc);
  const corAcontecimento =
    evento.kind === "saida" ? "text-destructive" : evento.kind === "entrada" ? "text-success" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icone}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{titulo}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium ${corAcontecimento}`}>{acontecimento}</span>
            <span className="text-xs text-muted-foreground">{tempoAtras(evento.detectedAt)}</span>
          </div>
          {evento.kind !== "etiqueta_nova" && evento.confidence === "baixa" && (
            <p className="mt-1.5 flex gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{evento.reason}</span>
            </p>
          )}
        </div>
      </div>

      {evento.kind === "saida" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Motivo da saída">
            {MOTIVOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                role="radio"
                aria-checked={motivo === m.valor}
                onClick={() => setMotivo(m.valor)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  motivo === m.valor
                    ? "border-wine-light bg-wine/20 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={ocupado} onClick={() => onConfirmar(motivo)}>
              Confirmar saída
            </Button>
            <Button variant="outline" className="flex-1" disabled={ocupado} onClick={onRecusar}>
              Não saiu
            </Button>
          </div>
        </div>
      )}

      {evento.kind === "entrada" && (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={ocupado} onClick={() => onConfirmar("consumo")}>
            Confirmar volta
          </Button>
          <Button variant="outline" className="flex-1" disabled={ocupado} onClick={onRecusar}>
            Não voltou
          </Button>
        </div>
      )}

      {evento.kind === "etiqueta_nova" && (
        <VincularEtiqueta ocupado={ocupado} onVincular={onVincular} onIgnorar={onRecusar} />
      )}
    </div>
  );
}

// Escolhe o vinho da etiqueta nova. Pergunta se a garrafa é nova (soma ao
// estoque) ou se já estava contada e só ganhou etiqueta — o caso de quem está
// etiquetando a adega que já tem.
function VincularEtiqueta({
  ocupado,
  onVincular,
  onIgnorar,
}: {
  ocupado: boolean;
  onVincular: (wineId: string, garrafaNova: boolean) => void;
  onIgnorar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<Wine | null>(null);
  const [nova, setNova] = useState(false);

  const etiquetadasNaAdega = useMemo(() => {
    const conta = new Map<string, number>();
    for (const b of getBottles()) {
      if (b.status === "na_adega") conta.set(b.wineId, (conta.get(b.wineId) ?? 0) + 1);
    }
    return conta;
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps -- relê ao abrir

  const vinhos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return getWines()
      .filter((w) => !termo || `${w.name} ${w.year} ${w.producer}`.toLowerCase().includes(termo))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 30);
  }, [busca]);

  if (!aberto) {
    return (
      <div className="flex gap-2">
        <Button className="flex-1" disabled={ocupado} onClick={() => setAberto(true)}>
          Vincular a um vinho
        </Button>
        <Button variant="outline" className="flex-1" disabled={ocupado} onClick={onIgnorar}>
          Ignorar
        </Button>
      </div>
    );
  }

  // Sem garrafa sem etiqueta sobrando, só pode ser garrafa nova
  const semSobra = escolhido ? (etiquetadasNaAdega.get(escolhido.id) ?? 0) >= escolhido.quantity : false;
  const garrafaNova = nova || semSobra;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar vinho"
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-border/50 p-1">
        {vinhos.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum vinho encontrado.</p>}
        {vinhos.map((w) => {
          const etiquetadas = etiquetadasNaAdega.get(w.id) ?? 0;
          const ativo = escolhido?.id === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setEscolhido(w)}
              className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                ativo ? "bg-wine/20" : "hover:bg-muted/50"
              }`}
            >
              <p className="text-sm truncate">
                {w.name} {w.year}
              </p>
              <p className="text-xs text-muted-foreground">
                {w.quantity} garrafa{w.quantity === 1 ? "" : "s"} · {etiquetadas} com etiqueta
              </p>
            </button>
          );
        })}
      </div>

      {escolhido && (
        <label className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3 text-xs">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-wine-light"
            checked={garrafaNova}
            disabled={semSobra}
            onChange={(e) => setNova(e.target.checked)}
          />
          <span>
            <span className="font-medium text-foreground">Garrafa que acabou de chegar</span>
            <span className="block text-muted-foreground mt-0.5">
              {semSobra
                ? `Todas as garrafas de ${escolhido.name} já têm etiqueta, então esta soma 1 ao estoque.`
                : "Marque se é compra nova (soma 1 ao estoque). Deixe desmarcado se a garrafa já estava na adega."}
            </span>
          </span>
        </label>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={!escolhido || ocupado}
          onClick={() => escolhido && onVincular(escolhido.id, garrafaNova)}
        >
          Vincular
        </Button>
        <Button variant="outline" className="flex-1" disabled={ocupado} onClick={() => setAberto(false)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
