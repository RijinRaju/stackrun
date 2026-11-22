// GitHub OAuth lands here (via Supabase) with ?code=…&next=…
import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safeRedirect";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  const supabase = await createSupabaseServer();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
