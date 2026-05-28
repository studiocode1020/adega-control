"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart3, TrendingUp, Wine as WineIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Wine, Movement } from "@/types";
import { getWines, getMovements } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";

const WINE_TYPE_COLORS: Record<string, string> = {
  Tinto: "#722F37",
  Branco: "#C9A84C",
  Rosé: "#DB7093",
  Espumante: "#A8B5C8",
  Sobremesa: "#D4A574",
  Fortificado: "#8B6914",
};

export default function RelatoriosPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    setWines(getWines());
    setMovements(getMovements());
  }, []);

  // Entradas vs Saídas por mês (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const months: { month: string; entradas: number; saidas: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      const monthMovements = movements.filter((m) => {
        const md = new Date(m.date);
        return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth();
      });

      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        entradas: monthMovements
          .filter((m) => m.type === "entrada")
          .reduce((s, m) => s + m.quantity, 0),
        saidas: monthMovements
          .filter((m) => m.type === "saida")
          .reduce((s, m) => s + m.quantity, 0),
      });
    }

    return months;
  }, [movements]);

  // Estoque por tipo de vinho
  const stockByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    wines.forEach((w) => {
      typeMap.set(w.type, (typeMap.get(w.type) || 0) + w.quantity);
    });
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value, color: WINE_TYPE_COLORS[name] || "#666" }))
      .sort((a, b) => b.value - a.value);
  }, [wines]);

  // Top 10 vinhos por valor em estoque
  const topWines = useMemo(() => {
    return wines
      .map((w) => ({
        name: w.name.length > 25 ? w.name.substring(0, 22) + "..." : w.name,
        fullName: w.name,
        value: w.price * w.quantity,
        quantity: w.quantity,
        price: w.price,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [wines]);

  const totalValue = wines.reduce((s, w) => s + w.price * w.quantity, 0);
  const totalBottles = wines.reduce((s, w) => s + w.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total de Rótulos</p>
            <p className="text-2xl font-bold text-wine-light">{wines.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Garrafas em Estoque</p>
            <p className="text-2xl font-bold text-gold">{totalBottles}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-gold-light">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas vs Saídas */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gold" />
              Entradas vs Saídas por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#A09090", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#A09090", fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1a1015",
                      border: "1px solid rgba(114,47,55,0.3)",
                      borderRadius: "8px",
                      color: "#F5F0EB",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#2D8B55" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#C53030" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Estoque por Tipo */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <WineIcon className="h-4 w-4 text-wine-light" />
              Estoque por Tipo de Vinho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stockByType.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1a1015",
                      border: "1px solid rgba(114,47,55,0.3)",
                      borderRadius: "8px",
                      color: "#F5F0EB",
                    }}
                    formatter={(value) => [`${value} garrafas`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Wines by Value */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            Top 10 Vinhos por Valor em Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topWines}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  tick={{ fill: "#A09090", fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#A09090", fontSize: 11 }}
                  width={160}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#1a1015",
                    border: "1px solid rgba(114,47,55,0.3)",
                    borderRadius: "8px",
                    color: "#F5F0EB",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), "Valor em Estoque"]}
                  labelFormatter={(label) => {
                    const wine = topWines.find((w) => w.name === label);
                    return wine?.fullName || label;
                  }}
                />
                <Bar dataKey="value" fill="#722F37" radius={[0, 4, 4, 0]}>
                  {topWines.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#C9A84C" : index < 3 ? "#8B3A42" : "#722F37"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
