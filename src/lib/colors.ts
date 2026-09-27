import type { WineType } from "@/types";

// ── Deep hex values for chart fills (Recharts) ──────────────────────────
// Rich, saturated colors optimised for solid fills in bar/pie charts.
export const WINE_TYPE_HEX: Record<WineType, string> = {
  Tinto: "#722F37",
  Branco: "#C9A84C",
  "Rosé": "#DB7093",
  Espumante: "#A8B5C8",
  Sobremesa: "#D4A574",
  Fortificado: "#7B4A2D",
};

// ── Badge classes (bg + text + border) ──────────────────────────────────
// Uses the lighter type-* tokens so text is readable on the dark background.
export const WINE_TYPE_BADGE: Record<WineType, string> = {
  Tinto: "bg-type-tinto/15 text-type-tinto border-type-tinto/25",
  Branco: "bg-type-branco/15 text-type-branco border-type-branco/25",
  "Rosé": "bg-type-rose/15 text-type-rose border-type-rose/25",
  Espumante: "bg-type-espumante/15 text-type-espumante border-type-espumante/25",
  Sobremesa: "bg-type-sobremesa/15 text-type-sobremesa border-type-sobremesa/25",
  Fortificado: "bg-type-fortificado/15 text-type-fortificado border-type-fortificado/25",
};

// ── Adega slot styles (cellar grid) ─────────────────────────────────────
// Higher-opacity fills and glow shadows for the visual cellar map.
export const WINE_TYPE_SLOT: Record<
  WineType,
  { bg: string; border: string; glow: string; label: string }
> = {
  Tinto: {
    bg: "bg-wine/40",
    border: "border-wine",
    glow: "shadow-[0_0_8px_rgba(114,47,55,0.3)]",
    label: "Tinto",
  },
  Branco: {
    bg: "bg-gold/30",
    border: "border-gold",
    glow: "shadow-[0_0_8px_rgba(201,168,76,0.3)]",
    label: "Branco",
  },
  "Rosé": {
    bg: "bg-type-rose/30",
    border: "border-type-rose",
    glow: "shadow-[0_0_8px_rgba(219,112,147,0.3)]",
    label: "Ros\u00e9",
  },
  Espumante: {
    bg: "bg-type-espumante/30",
    border: "border-type-espumante",
    glow: "shadow-[0_0_8px_rgba(180,193,212,0.3)]",
    label: "Espumante",
  },
  Sobremesa: {
    bg: "bg-type-sobremesa/30",
    border: "border-type-sobremesa",
    glow: "shadow-[0_0_8px_rgba(212,165,116,0.3)]",
    label: "Sobremesa",
  },
  Fortificado: {
    bg: "bg-type-fortificado/30",
    border: "border-type-fortificado",
    glow: "shadow-[0_0_8px_rgba(123,74,45,0.3)]",
    label: "Fortificado",
  },
};

// ── Semantic hex values (for Recharts / inline styles) ──────────────────
// Mirror the CSS tokens so JS-only contexts (Recharts) stay in sync.
export const SEMANTIC_HEX = {
  wine: "#722F37",
  wineLight: "#8B3A42",
  gold: "#C9A84C",
  success: "#2D8B55",
  destructive: "#C53030",
} as const;

// ── Chart styling (Recharts) ────────────────────────────────────────────
export const CHART_STYLE = {
  axisColor: "#A09090",
  gridColor: "rgba(255,255,255,0.05)",
  tooltipStyle: {
    backgroundColor: "#1a1015",
    border: "1px solid rgba(114,47,55,0.3)",
    borderRadius: "8px",
    color: "#F5F0EB",
  } as const,
  legendColor: "#A09090",
} as const;
