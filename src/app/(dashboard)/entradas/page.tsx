"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
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

import { Wine } from "@/types";
import { getWines } from "@/lib/storage";
import { useMovements } from "@/hooks/use-movements";

export default function EntradasPage() {
  const router = useRouter();
  const { addMovement } = useMovements();

  const [wines, setWines] = useState<Wine[]>([]);
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setWines(getWines());
  }, []);

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

    setIsSubmitting(true);

    try {
      addMovement({
        wineId,
        type: "entrada",
        quantity: qty,
        date,
        reason: null,
        supplier: supplier.trim() || null,
        invoiceNumber: invoiceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success("Entrada registrada com sucesso!");
      router.push("/movimentacoes");
    } catch {
      toast.error("Erro ao registrar entrada.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <ArrowDownToLine className="h-5 w-5 text-success" />
            </div>
            Registrar Entrada
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
                      {wine.name} ({wine.year})
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
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
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

            {/* Supplier + Invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  type="text"
                  placeholder="Nome do fornecedor"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Número da NF</Label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  placeholder="Ex: 001234"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
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
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              {isSubmitting ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
