"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setErro(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (error) {
      setErro(error.status === 400 ? "E-mail ou senha incorretos." : "Não foi possível entrar. Confira a internet.");
      setLoading(false);
      return;
    }
    // Recarrega a página inteira para o proxy ver o cookie da sessão nova
    window.location.assign("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background com gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-wine/5 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-wine)15_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-gold)10_0%,_transparent_60%)]" />

      <Card className="relative z-10 w-full max-w-md mx-4 border-wine/20 bg-card/80 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Adega Control"
              width={80}
              height={80}
              className="h-20 w-20 object-contain drop-shadow-lg"
              priority
            />
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
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
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
            {erro && (
              <p role="alert" className="text-sm text-destructive">{erro}</p>
            )}
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
        </CardContent>
      </Card>
    </div>
  );
}
