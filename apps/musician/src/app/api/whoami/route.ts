import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  // In Next.js 15, cookies() is async
  const cookieStore = await cookies()

  const COOKIE_NAME = 'sb-ndcjuqnqmospobbeaewx-auth-token' // your Supabase cookie name

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string): string | undefined {
          return name === COOKIE_NAME ? cookieStore.get(name)?.value : undefined
        },
        set(name: string, value: string, options: CookieOptions): void {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // ignored on edge runtime
          }
        },
        remove(name: string, options: CookieOptions): void {
          try {
            cookieStore.delete({ name, ...options })
          } catch {
            // ignored
          }
        },
      },
    }
  )

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const { data: rpcData, error: rpcError } = await supabase.rpc('whoami')

  // Explicit type for cookies list
  const cookieNames: string[] = Array.from(cookieStore.getAll()).map(
    (c: { name: string }) => c.name
  )

  return NextResponse.json({
    cookie_names_in_browser: cookieNames,
    client_user_id: sessionData?.session?.user?.id ?? null,
    db_auth_uid: rpcData ?? null,
    sessionError: sessionError?.message ?? null,
    rpcError: rpcError?.message ?? null,
  })
}
