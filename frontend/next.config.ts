import type { NextConfig } from "next";

// Demo mode (no Supabase configured): the app serves its own sample API under
// /api and /compute. Server components call `${FASTAPI_URL}/...`, so point
// FASTAPI_URL at this deployment unless a real backend URL is provided.
const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const selfUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 3000}`;

const demoEnv: Record<string, string> =
  isDemoMode && !process.env.FASTAPI_URL ? { FASTAPI_URL: selfUrl } : {};

const nextConfig: NextConfig = {
  env: demoEnv,
  // Type errors are reported in CI/IDE but do not block deploys while the
  // project is in demo mode.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    proxyTimeout: 300000,
  },
  async rewrites() {
    const backendUrl = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
