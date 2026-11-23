import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { IS_DEMO_MODE } from '@/lib/demo/mode'
import { createDemoClient } from '@/lib/demo/supabase'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export async function createClient() {
  const cookieStore = await cookies()

  // Demo mode: no Supabase project configured, use built-in sample data.
  if (IS_DEMO_MODE) {
    return createDemoClient() as unknown as ReturnType<typeof createRealClient>
  }

  return createRealClient(cookieStore)
}

function createRealClient(cookieStore: CookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
