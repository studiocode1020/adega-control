"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    <div className="max-w-2xl mx-auto">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <ArrowUpFromLine className="h-5 w-5 text-destructive" />
            </div>
            Registrar Saída
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Wine Select */}
            <div className="space-y-2">
              <Label htmlFor="wine">Vinho</Label>
              <Select value={wineId} onValueChange={(v) => v && setWineId(v)}>
                <SelectTrigger id="wine" className="w-full">
                  <SelectValue placeholder="Selecione um vinho" />
                </SelectTrigger>
                <SelectContent>
                  {wines.map((wine) => (
                    <SelectItem key={wine.id} value={wine.id}>
                      {wine.name} ({wine.quantity} un.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectValue placeholder="Selecione o motivo" />
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
              className="w-full bg-wine hover:bg-wine-light text-white"
            >
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              {isSubmitting ? "Registrando..." : "Registrar Saída"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
