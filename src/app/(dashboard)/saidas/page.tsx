"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpFromLine, Wine as WineIcon } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { Wine, ExitReason } from "@/types";
import { getWines } from "@/lib/storage";
import { useMovements } from "@/hooks/use-movements";

const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: "venda", label: "Venda" },
  { value: "consumo", label: "Consumo" },
  { value: "perda", label: "Perda" },
  { value: "devolucao", label: "Devolução" },
];

export default function SaidasPage() {
  const router = useRouter();
  const { addMovement } = useMovements();

  const [wines, setWines] = useState<Wine[]>([]);
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<ExitReason | "">("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setWines(getWines());
  }, []);

  const selectedWine = useMemo(
    () => wines.find((w) => w.id === wineId) ?? null,
    [wines, wineId]
  );

  const maxQuantity = selectedWine?.quantity ?? 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!wineId) {
      toast.error("Selecione um vinho.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    if (qty > maxQuantity) {
      toast.error(`Estoque insuficiente. Disponível: ${maxQuantity} un.`);
      return;
    }

    if (!reason) {
      toast.error("Selecione o motivo da saída.");
      return;
    }

    setIsSubmitting(true);

    try {
      addMovement({
        wineId,
        type: "saida",
        quantity: qty,
        date,
        reason,
        supplier: null,
        invoiceNumber: null,
        notes: notes.trim() || null,
      });

      toast.success("Saída registrada com sucesso!");
      router.push("/movimentacoes");
    } catch {
      toast.error("Erro ao registrar saída.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Wine Select */}
            <div className="space-y-2">
              <Label htmlFor="wine">Vinho</Label>
              <Select value={wineId} onValueChange={(v) => v && setWineId(v)}>
                <SelectTrigger id="wine" className="w-full">
                  <span className="flex flex-1 text-left truncate text-sm">
                    {selectedWine ? `${selectedWine.name} (${selectedWine.quantity} un.)` : "Selecione um vinho"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {wines.map((wine) => (
                    <SelectItem key={wine.id} value={wine.id}>
                      {wine.name} ({wine.quantity} un.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedWine && (
                <div className="mt-2 rounded-lg border border-wine/30 bg-wine/5 p-3 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-wine/10">
                    <WineIcon className="h-4 w-4 text-wine-light" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {selectedWine.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedWine.type} &middot; {selectedWine.year} &middot; Disponível: {maxQuantity} un.
                    </p>
                  </div>
                </div>
              )}

              <Link href="/vinhos/novo">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full mt-2 text-sm border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
                >
                  + Cadastrar novo vinho
                </Button>
              </Link>
            </div>

            {/* Quantity + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={maxQuantity}
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                {selectedWine && (
                  <p className="text-xs text-muted-foreground">
                    Disponível: {maxQuantity} un.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Select
                value={reason}
                onValueChange={(val) => val && setReason(val as ExitReason)}
              >
                <SelectTrigger id="reason" className="w-full">
                  <span className="flex flex-1 text-left truncate text-sm">
                    {reason ? EXIT_REASONS.find(r => r.value === reason)?.label || reason : "Selecione o motivo"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {EXIT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Observações adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full bg-wine hover:bg-wine-light text-white"
            >
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              {isSubmitting ? "Registrando..." : "Registrar Saída"}
            </Button>
          </form>
    </div>
  );
}
