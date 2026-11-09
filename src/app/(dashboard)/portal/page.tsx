"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RadioTower,
  KeyRound,
  Copy,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Tag,
  DoorOpen,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { getBottles, getWines, portalDisponivel } from "@/lib/storage";
import { portalEventFromRow } from "@/hooks/use-portal";
import { useVersaoDados } from "@/hooks/use-dados";
import { epcCurto, tempoAtras } from "@/components/portal/sininho-portal";
import type { PortalDevice, PortalEvent } from "@/types";

// Aparelho que não fala há mais que isso está desligado ou sem WiFi. O
// firmware manda sinal de vida a cada 5 min mesmo sem garrafa passando.
const ONLINE_MS = 12 * 60 * 1000;

function deviceFromRow(r: Record<string, unknown>): PortalDevice {
  return {
    id: r.id as string,
    name: r.name as string,
    firmware: r.firmware as string | null,
    lastSeenAt: r.last_seen_at as string | null,
    createdAt: r.created_at as string,
  };
}

// A chave vai para o firmware (secrets.h). O banco guarda só o SHA-256 dela,
// como uma senha — por isso ela aparece uma única vez.
async function gerarChave() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const chave =
    "adg_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(chave));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { chave, hash };
}

export default function PortalPage() {
  const disponivel = portalDisponivel();
  const versao = useVersaoDados();
  const [aparelhos, setAparelhos] = useState<PortalDevice[]>([]);
  const [historico, setHistorico] = useState<PortalEvent[]>([]);
  const [nome, setNome] = useState("Porta da adega");
  const [chaveNova, setChaveNova] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  // hora da última leitura, para dizer se o aparelho está ligado
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    if (!portalDisponivel()) return;
    const supabase = getSupabase();
    const [ap, ev] = await Promise.all([
      supabase.from("portal_devices").select("id, name, firmware, last_seen_at, created_at").order("created_at"),
      supabase.from("portal_events").select("*").order("detected_at", { ascending: false }).limit(30),
    ]);
    if (!ap.error) setAparelhos(ap.data.map(deviceFromRow));
    if (!ev.error) setHistorico(ev.data.map(portalEventFromRow));
    setAgora(Date.now());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar, versao]);

  async function criarAparelho() {
    setGerando(true);
    try {
      const { chave, hash } = await gerarChave();
      const { error } = await getSupabase()
        .from("portal_devices")
        .insert({ name: nome.trim() || "Porta da adega", token_hash: hash });
      if (error) throw error;
      setChaveNova(chave);
      await carregar();
    } catch {
      toast.error("Não foi possível gerar a chave. Confira a internet.");
    } finally {
      setGerando(false);
    }
  }

  async function apagarAparelho(id: string) {
    const { error } = await getSupabase().from("portal_devices").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível apagar o aparelho.");
      return;
    }
    setApagando(null);
    toast("Aparelho apagado. A chave dele deixou de valer.");
    await carregar();
  }

  if (!disponivel) {
    return (
      <Card>
        <CardContent className="p-5 space-y-2">
          <RadioTower className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Portal RFID ainda não instalado</p>
          <p className="text-sm text-muted-foreground">
            O banco desta adega ainda não tem as tabelas do portal. Quem administra o sistema precisa rodar a migration{" "}
            <code className="text-xs">0004_portal_rfid.sql</code> no Supabase.
          </p>
        </CardContent>
      </Card>
    );
  }

  const garrafas = getBottles();
  const naAdega = garrafas.filter((b) => b.status === "na_adega").length;
  const vinhos = new Map(getWines().map((w) => [w.id, w]));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        O leitor na porta reconhece cada garrafa etiquetada que passa por ela. Você confirma no sininho e a baixa é feita.
      </p>

      {/* Garrafas etiquetadas */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Etiquetadas", valor: garrafas.length },
          { rotulo: "Na adega", valor: naAdega },
          { rotulo: "Fora", valor: garrafas.length - naAdega },
        ].map((k) => (
          <Card key={k.rotulo}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-semibold">{k.valor}</p>
              <p className="text-xs text-muted-foreground">{k.rotulo}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aparelhos */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aparelho da porta</h3>

        {aparelhos.map((a) => {
          const online = a.lastSeenAt && agora - new Date(a.lastSeenAt).getTime() < ONLINE_MS;
          return (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${online ? "bg-success" : "bg-muted-foreground/40"}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.lastSeenAt
                      ? `${online ? "Ligado" : "Sem contato"} · último sinal ${tempoAtras(a.lastSeenAt)}`
                      : "Ainda não se conectou"}
                    {a.firmware ? ` · ${a.firmware}` : ""}
                  </p>
                </div>
                {apagando === a.id ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="destructive" onClick={() => apagarAparelho(a.id)}>
                      Apagar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setApagando(null)}>
                      Não
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Apagar ${a.name}`}
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => setApagando(a.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {chaveNova ? (
          <Card className="border-gold/40">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-gold" />
                Chave do aparelho
              </p>
              <p className="text-xs text-muted-foreground">
                Copie agora: ela não aparece de novo. Vai no arquivo <code>secrets.h</code> do firmware, em{" "}
                <code>PORTAL_CHAVE</code>. Se perder, apague o aparelho e gere outra.
              </p>
              <code className="block break-all rounded-lg bg-muted/50 p-3 text-xs">{chaveNova}</code>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(chaveNova)
                      .then(() => toast.success("Chave copiada"))
                      .catch(() => toast.error("Não deu para copiar; selecione o texto"))
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setChaveNova(null)}>
                  Já guardei
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {aparelhos.length === 0
                  ? "Para ligar o leitor da porta ao app, gere a chave dele."
                  : "Outro leitor (outra porta, ou trocando o aparelho)?"}
              </p>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do aparelho" />
              <Button className="w-full" disabled={gerando} onClick={criarAparelho}>
                <KeyRound className="h-4 w-4 mr-2" />
                Gerar chave do aparelho
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Histórico */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Últimas passagens</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma garrafa passou pela porta ainda.</p>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {historico.map((ev) => {
                const vinho = ev.wineId ? vinhos.get(ev.wineId) : undefined;
                const Icone = ev.kind === "saida" ? ArrowUpCircle : ev.kind === "entrada" ? ArrowDownCircle : Tag;
                const cor = ev.kind === "saida" ? "text-destructive" : ev.kind === "entrada" ? "text-success" : "text-gold";
                const oQue = ev.kind === "saida" ? "Saída" : ev.kind === "entrada" ? "Volta" : "Etiqueta nova";
                const situacao =
                  ev.status === "pending" ? "aguardando" : ev.status === "confirmed" ? "confirmada" : "descartada";
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-3">
                    <Icone className={`h-4 w-4 shrink-0 ${cor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{vinho ? `${vinho.name} ${vinho.year}` : epcCurto(ev.epc)}</p>
                      <p className="text-xs text-muted-foreground">
                        {oQue} · {tempoAtras(ev.detectedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs shrink-0 ${
                        ev.status === "pending" ? "text-warning" : "text-muted-foreground"
                      }`}
                    >
                      {situacao}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Como funciona */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Como funciona</h3>
        <Card>
          <CardContent className="p-4 space-y-3 text-sm">
            <p className="flex gap-3">
              <Tag className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
              <span>
                <span className="font-medium">Etiquetar:</span>{" "}
                <span className="text-muted-foreground">
                  cole a etiqueta no gargalo e passe a garrafa pelo leitor. O sininho pergunta de qual vinho ela é.
                </span>
              </span>
            </p>
            <p className="flex gap-3">
              <DoorOpen className="h-4 w-4 shrink-0 mt-0.5 text-wine-light" />
              <span>
                <span className="font-medium">Entrou ou saiu:</span>{" "}
                <span className="text-muted-foreground">
                  o leitor só diz qual garrafa passou. Se ela estava na adega, está saindo; se estava fora, está voltando.
                </span>
              </span>
            </p>
            <p className="flex gap-3">
              <BellRing className="h-4 w-4 shrink-0 mt-0.5 text-success" />
              <span>
                <span className="font-medium">Confirmar:</span>{" "}
                <span className="text-muted-foreground">
                  nada muda no estoque sem o seu toque. Se o leitor perder uma passagem, você corrige na hora.
                </span>
              </span>
            </p>
            <p className="flex gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-info" />
              <span>
                <span className="font-medium">Garrafas sem etiqueta</span>{" "}
                <span className="text-muted-foreground">
                  continuam pelas telas de Entrada e Saída, como sempre.
                </span>
              </span>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
