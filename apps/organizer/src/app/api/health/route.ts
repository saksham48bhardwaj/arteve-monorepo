import { NextResponse } from "next/server";
export function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({ ok: hasUrl && hasAnon, hasUrl, hasAnon, hasService });
}
