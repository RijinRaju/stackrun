// Next 16 proxy (formerly middleware): refreshes the Supabase auth session
// cookie on each request so server components and API routes see a valid user.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Validates the JWT and refreshes it if needed. Don't add logic between
  // createServerClient and this call.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip static files and the OG image (no auth needed there).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/og|logos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
