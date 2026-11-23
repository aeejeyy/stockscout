import { createBrowserClient } from '@supabase/ssr'
import { IS_DEMO_MODE } from '@/lib/demo/mode'
import { createDemoClient } from '@/lib/demo/supabase'

export function createClient() {
  // Demo mode: no Supabase project configured, use built-in sample data.
  if (IS_DEMO_MODE) {
    return createDemoClient()
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
