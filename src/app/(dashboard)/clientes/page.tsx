"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Check, Copy, KeyRound, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Cliente } from "@/app/api/admin/clientes/route";

const URL_APP = "https://adega-control.vercel.app";

type Acesso = { email: string; senha: string; novo: boolean };

async function chamar<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo.erro ?? "Algo deu errado. Tente de novo.");
  return corpo as T;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [trocar, setTrocar] = useState<Cliente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [passar, setPassar] = useState<Cliente | null>(null);
  const [destino, setDestino] = useState<Cliente | null>(null);

  const carregar = useCallback(() => {
    chamar<{ clientes: Cliente[] }>("/api/admin/clientes")
      .then((r) => {
        setClientes(r.clientes);
        setErro(null);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  async function criarCliente(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    try {
      const r = await chamar<{ email: string; senha: string }>("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: novoEmail }),
      });
      setNovoAberto(false);
      setNovoEmail("");
      setAcesso({ ...r, novo: true });
      carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function trocarSenha() {
    if (!trocar) return;
    setOcupado(true);
    try {
      const r = await chamar<{ email: string; senha: string }>(
        `/api/admin/clientes/${trocar.id}/senha`,
        { method: "POST" },
      );
      setTrocar(null);
      setAcesso({ ...r, novo: false });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function abrirPassar(c: Cliente) {
    setDestino(null);
    setPassar(c);
  }

  async function passarVinhos() {
    if (!passar || !destino) return;
    setOcupado(true);
    try {
      const r = await chamar<{ vinhos: number }>(`/api/admin/clientes/${passar.id}/transferir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ para: destino.id }),
      });
      toast.success(`${r.vinhos} vinhos passados para ${destino.email}`);
      setPassar(null);
      carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  // só contas vazias recebem: a função do banco recusa destino com vinhos
  const destinos = passar ? (clientes ?? []).filter((c) => c.id !== passar.id && c.vinhos === 0) : [];

  async function copiar(texto: string, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(aviso);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Button onClick={carregar}>Tentar de novo</Button>
      </div>
    );
  }

  if (!clientes) {
    return <p className="pt-16 text-center text-sm text-muted-foreground">Carregando clientes…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {clientes.filter((c) => !c.admin).length} cliente(s)
        </p>
        <Button onClick={() => setNovoAberto(true)} className="h-11">
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="space-y-3">
        {clientes.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine/10">
                  {c.admin ? (
                    <ShieldCheck className="h-5 w-5 text-gold" />
                  ) : (
                    <UserRound className="h-5 w-5 text-wine-light" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.admin ? "Administrador · " : ""}desde {formatDate(c.criadoEm)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.ultimoLogin ? `Último acesso ${formatDateTime(c.ultimoLogin)}` : "Nunca entrou"}
                  </p>
                </div>
              </div>

              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-lg font-semibold">{c.vinhos ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">vinhos</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{c.garrafas ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">garrafas</p>
                </div>
              </div>

              {!!c.vinhos && (
                <Button variant="outline" className="h-11 w-full" onClick={() => abrirPassar(c)}>
                  <ArrowRightLeft className="h-4 w-4" />
                  Passar vinhos para outra conta
                </Button>
              )}

              {!c.admin && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => copiar(c.email, "Login copiado")}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar login
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => setTrocar(c)}>
                    <KeyRound className="h-4 w-4" />
                    Nova senha
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="px-2 text-center text-xs text-muted-foreground">
        As senhas não ficam guardadas: o Supabase só tem uma versão embaralhada delas. Para passar o
        acesso a um cliente, gere uma senha nova.
      </p>

      {/* Novo cliente */}
      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>A conta é criada já com uma senha, que aparece na próxima tela.</DialogDescription>
          </DialogHeader>
          <form onSubmit={criarCliente} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo-email">E-mail do cliente</Label>
              <Input
                id="novo-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={ocupado}>
              {ocupado ? "Criando…" : "Criar conta"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de troca de senha */}
      <Dialog open={!!trocar} onOpenChange={(aberto) => !aberto && setTrocar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar nova senha?</DialogTitle>
            <DialogDescription>
              A senha atual de {trocar?.email} para de funcionar na hora. Passe a nova para o cliente logo em
              seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setTrocar(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button className="h-11" onClick={trocarSenha} disabled={ocupado}>
              {ocupado ? "Gerando…" : "Gerar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Passar a adega inteira para outra conta */}
      <Dialog open={!!passar} onOpenChange={(aberto) => !aberto && setPassar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passar vinhos</DialogTitle>
            <DialogDescription>
              Os {passar?.vinhos} vinhos de {passar?.email} vão inteiros para a conta escolhida, com movimentações,
              posições na adega e lista de desejos. A conta de origem fica vazia.
            </DialogDescription>
          </DialogHeader>
          {destinos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta vazia para receber. Crie o cliente em Novo cliente primeiro.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Para</p>
                {destinos.map((d) => {
                  const escolhido = destino?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDestino(d)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                        escolhido ? "border-wine-light bg-wine/10" : "border-border/50 bg-muted/30"
                      }`}
                    >
                      <UserRound className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.email}</span>
                      {escolhido && <Check className="h-4 w-4 shrink-0 text-wine-light" />}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11" onClick={() => setPassar(null)} disabled={ocupado}>
                  Cancelar
                </Button>
                <Button className="h-11" onClick={passarVinhos} disabled={!destino || ocupado}>
                  {ocupado ? "Passando…" : "Passar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Login e senha gerados: aparecem uma vez só */}
      <Dialog open={!!acesso} onOpenChange={(aberto) => !aberto && setAcesso(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acesso?.novo ? "Conta criada" : "Senha trocada"}</DialogTitle>
            <DialogDescription>Anote ou envie agora: esta senha não aparece de novo. No primeiro acesso o cliente cria a senha dele.</DialogDescription>
          </DialogHeader>
          {acesso && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Login</p>
                  <p className="break-all font-medium">{acesso.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Senha</p>
                  <p className="select-all font-mono text-lg tracking-wider text-gold">{acesso.senha}</p>
                </div>
              </div>
              <Button
                className="h-11 w-full"
                onClick={() =>
                  copiar(
                    `Seu acesso ao Adega Control\n${URL_APP}\nLogin: ${acesso.email}\nSenha provisória: ${acesso.senha}\nNo primeiro acesso o app pede para você criar a sua senha.`,
                    "Login e senha copiados",
                  )
                }
              >
                <Copy className="h-4 w-4" />
                Copiar mensagem para o cliente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
