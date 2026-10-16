import { exigirAdmin } from '@/lib/supabase/admin';

// Diz ao app se o usuário logado é o administrador (para mostrar o menu Clientes)
export async function GET() {
  const erro = await exigirAdmin();
  return Response.json({ admin: !erro });
}
