import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO_MODE } from "./mode";
import { handleDemoRequest } from "./api";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Builds GET/POST/PUT/PATCH/DELETE handlers for a catch-all route.
 * Demo mode: answer from built-in sample data.
 * Otherwise: forward the request to the FastAPI backend (FASTAPI_URL).
 */
export function makeHandlers(prefix: "api" | "compute") {
  async function handler(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
    const { path } = await ctx.params;

    if (IS_DEMO_MODE) {
      let body: unknown = null;
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          body = await req.json();
        } catch {
          body = null;
        }
      }
      const res = handleDemoRequest({
        method: req.method,
        path: prefix === "compute" ? ["compute", ...path] : path,
        query: req.nextUrl.searchParams,
        body,
      });
      return NextResponse.json(res.body, { status: res.status, headers: { "x-stockscout-demo": "1" } });
    }

    const backend = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
    const target = `${backend}/${prefix}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.set("X-API-Key", process.env.FASTAPI_SECRET || "dev_shared_secret_key");
    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
        cache: "no-store",
      });
      const respHeaders = new Headers(upstream.headers);
      respHeaders.delete("content-encoding");
      respHeaders.delete("content-length");
      return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
    } catch {
      return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
    }
  }
  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler };
}
