/**
 * Demo mode: the app runs entirely on built-in sample data, with no Supabase
 * project and no FastAPI backend. It is on whenever Supabase is not configured,
 * or when NEXT_PUBLIC_DEMO_MODE is "true".
 */
export const IS_DEMO_MODE: boolean =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
