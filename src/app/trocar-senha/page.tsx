"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";

// Primeiro acesso: a senha veio do admin, então o cliente cria a dele.
// O proxy manda para cá enquanto user_metadata.trocar_senha for true.
export default function TrocarSenhaPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const senha = String(form.get("password"));
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== String(form.get("confirm"))) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setLoading(true);
    setErro(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password: senha, data: { trocar_senha: false } });
    if (error) {
      setErro(
        error.code === "same_password"
          ? "Escolha uma senha diferente da que você recebeu."
          : "Não foi possível trocar a senha. Tente de novo."
      );
      setLoading(false);
      return;
    }
    // O proxy lê o aviso do token da sessão: renova antes de sair daqui
    await supabase.auth.refreshSession();
    window.location.assign("/");
  };

  const sair = async () => {
    await getSupabase().auth.signOut();
    window.location.assign("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
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
              Crie sua senha
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              No primeiro acesso, troque a senha que você recebeu por uma só sua.
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Pelo menos 8 caracteres"
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Repita a nova senha</Label>
              <Input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="bg-background/50"
              />
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
                  Salvando...
                </span>
              ) : (
                "Salvar e entrar"
              )}
            </Button>
            <button
              type="button"
              onClick={sair}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Sair
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
