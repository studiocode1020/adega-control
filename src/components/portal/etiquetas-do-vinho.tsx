"use client";

import { useState } from "react";
import { Tag, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desvincularGarrafa, getBottles, portalDisponivel } from "@/lib/storage";
import { useVersaoDados } from "@/hooks/use-dados";
import { epcCurto } from "./sininho-portal";

// Quais garrafas deste vinho têm etiqueta RFID e onde cada uma está. Só
// aparece depois que o portal foi instalado (migration 0004).
export function EtiquetasDoVinho({ wineId, quantidade }: { wineId: string; quantidade: number }) {
  useVersaoDados(); // redesenha quando o sininho confirma algo
  const [tirando, setTirando] = useState<string | null>(null);

  if (!portalDisponivel()) return null;
  const garrafas = getBottles().filter((b) => b.wineId === wineId);
  const naAdega = garrafas.filter((b) => b.status === "na_adega").length;

  async function tirar(id: string) {
    try {
      await desvincularGarrafa(id);
      setTirando(null);
      toast("Etiqueta desvinculada. O estoque não mudou.");
    } catch {
      toast.error("Não foi possível desvincular. Confira a internet.");
    }
  }

  return (
    <div className="pt-2 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
        <Tag className="h-3 w-3" />
        Etiquetas RFID
      </p>
      {garrafas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma garrafa etiquetada. Cole a etiqueta, passe a garrafa pelo leitor da porta e vincule no sininho.
        </p>
      ) : (
        <>
          <p className="text-sm text-foreground/80 mb-2">
            {naAdega} de {quantidade} garrafa{quantidade === 1 ? "" : "s"} na adega com etiqueta
          </p>
          <ul className="space-y-1">
            {garrafas.map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5">
                <span className="font-mono text-xs flex-1">{epcCurto(b.epc)}</span>
                <span className={`text-xs ${b.status === "na_adega" ? "text-success" : "text-muted-foreground"}`}>
                  {b.status === "na_adega" ? "na adega" : "fora"}
                </span>
                {tirando === b.id ? (
                  <>
                    <Button size="xs" variant="destructive" onClick={() => tirar(b.id)}>
                      Desvincular
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setTirando(null)}>
                      Não
                    </Button>
                  </>
                ) : (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Desvincular etiqueta"
                    onClick={() => setTirando(b.id)}
                  >
                    <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
