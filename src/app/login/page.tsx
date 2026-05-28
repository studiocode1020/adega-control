"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassWater, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background com gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0505] via-[#1a0a10] to-[#0d0809]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(114,47,55,0.15)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(201,168,76,0.08)_0%,_transparent_60%)]" />

      <Card className="relative z-10 w-full max-w-md mx-4 border-wine/20 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wine to-wine-light shadow-lg shadow-wine/20">
              <GlassWater className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-foreground">
              Adega Control
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Gestão de Adega
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@adega.com"
                defaultValue="admin@adega.com"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  defaultValue="123456"
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-wine hover:bg-wine-light text-white font-medium h-11 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Desenvolvido por{" "}
            <span className="text-gold font-medium">StudioCode</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
