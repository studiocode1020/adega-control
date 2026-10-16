import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Renova a sessão do Supabase a cada navegação e manda quem não está logado
// para /login. A proteção de verdade dos dados é o RLS no banco; isto aqui
// só evita mostrar as telas vazias para quem não entrou.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = !!data?.claims;
  const naLogin = request.nextUrl.pathname.startsWith('/login');
  // As rotas /api respondem 401 por conta própria; redirecionar devolveria HTML
  const naApi = request.nextUrl.pathname.startsWith('/api/');

  if (!logado && !naLogin && !naApi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (logado && naLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Conta criada ou com senha gerada pelo admin: primeiro troca a senha
  const trocarSenha = data?.claims?.user_metadata?.trocar_senha === true;
  const naTroca = request.nextUrl.pathname.startsWith('/trocar-senha');
  if (logado && trocarSenha && !naTroca && !naApi) {
    return redirecionar('/trocar-senha', request, response);
  }
  if (logado && !trocarSenha && naTroca) {
    return redirecionar('/', request, response);
  }
  return response;
}

// Leva junto os cookies da sessão renovada, senão o navegador fica com o token velho
function redirecionar(caminho: string, request: NextRequest, response: NextResponse) {
  const destino = NextResponse.redirect(new URL(caminho, request.url));
  response.cookies.getAll().forEach((c) => destino.cookies.set(c));
  return destino;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
