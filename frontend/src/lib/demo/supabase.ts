/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A tiny in-memory stand-in for the Supabase client, used in demo mode.
 * Supports the query-builder calls this app makes (select/eq/in/order/limit/
 * single/insert/upsert/update/delete) and the auth calls (always signed in as
 * the demo user). Writes succeed but are not persisted between requests.
 */
import { DEMO_USER, tablesSnapshot, normSymbol } from "./data";

type Row = Record<string, any>;
type Result = { data: any; error: any; count?: number | null; status: number; statusText: string };

let TABLES: Record<string, Row[]> | null = null;
function tables(): Record<string, Row[]> {
  if (!TABLES) TABLES = tablesSnapshot();
  return TABLES;
}

function same(col: string, a: any, b: any): boolean {
  if (col === "ticker" || col === "symbol") return normSymbol(String(a)) === normSymbol(String(b));
  return String(a) === String(b);
}

class DemoQuery implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private from_: number | null = null;
  private to_: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private cols = "*";
  private mutation: "insert" | "upsert" | "update" | "delete" | null = null;
  private payload: any = null;
  private wantCount = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols || "*";
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(values: any) { this.mutation = "insert"; this.payload = values; return this; }
  upsert(values: any) { this.mutation = "upsert"; this.payload = values; return this; }
  update(values: any) { this.mutation = "update"; this.payload = values; return this; }
  delete() { this.mutation = "delete"; return this; }

  eq(col: string, val: any) { this.filters.push((r) => same(col, r[col], val)); return this; }
  neq(col: string, val: any) { this.filters.push((r) => !same(col, r[col], val)); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => (vals || []).some((v) => same(col, r[col], v))); return this; }
  gt(col: string, v: any) { this.filters.push((r) => r[col] > v); return this; }
  gte(col: string, v: any) { this.filters.push((r) => r[col] >= v); return this; }
  lt(col: string, v: any) { this.filters.push((r) => r[col] < v); return this; }
  lte(col: string, v: any) { this.filters.push((r) => r[col] <= v); return this; }
  is(col: string, v: any) { this.filters.push((r) => (r[col] ?? null) === v); return this; }
  like(col: string, p: string) { return this.ilike(col, p); }
  ilike(col: string, p: string) {
    const re = new RegExp("^" + String(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i");
    this.filters.push((r) => re.test(String(r[col] ?? "")));
    return this;
  }
  or(_expr: string) { return this; }
  match(obj: Record<string, any>) { Object.entries(obj).forEach(([k, v]) => this.eq(k, v)); return this; }
  filter(col: string, _op: string, val: any) { return this.eq(col, val); }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from_ = a; this.to_ = b; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  abortSignal() { return this; }
  throwOnError() { return this; }

  private withJoins(r: Row): Row {
    const out: Row = { ...r };
    const all = tables();
    if (/\bstocks\s*\(/.test(this.cols) && r.stock_id != null) {
      out.stocks = all.stocks.find((s) => s.id === r.stock_id) ?? null;
    }
    if (/\bbroker_accounts\s*\(/.test(this.cols) && r.broker_account_id != null) {
      out.broker_accounts = all.broker_accounts.find((b) => b.id === r.broker_account_id) ?? null;
    }
    return out;
  }

  private run(): Result {
    const ok = (data: any, count?: number): Result => ({ data, error: null, count: count ?? null, status: 200, statusText: "OK" });
    const rows = tables()[this.table] ?? [];

    if (this.mutation) {
      const items = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
      const touched = this.mutation === "insert" || this.mutation === "upsert"
        ? items.map((it: Row, i: number) => ({ id: Date.now() + i, ...it }))
        : rows.filter((r) => this.filters.every((f) => f(r))).map((r) => ({ ...r, ...(this.payload || {}) }));
      if (this.mode !== "many") return ok(touched[0] ?? null);
      return ok(touched);
    }

    let res = rows.filter((r) => this.filters.every((f) => f(r)));
    for (const o of [...this.orders].reverse()) {
      res = [...res].sort((a, b) => {
        const x = a[o.col], y = b[o.col];
        if (x === y) return 0;
        return (x > y ? 1 : -1) * (o.asc ? 1 : -1);
      });
    }
    const total = res.length;
    if (this.from_ != null && this.to_ != null) res = res.slice(this.from_, this.to_ + 1);
    if (this.lim != null) res = res.slice(0, this.lim);
    res = res.map((r) => this.withJoins(r));

    if (this.mode === "single") {
      if (res.length === 0) return { data: null, error: { code: "PGRST116", message: "No rows found (demo mode)" }, count: null, status: 406, statusText: "Not Acceptable" };
      return ok(res[0]);
    }
    if (this.mode === "maybe") return ok(res[0] ?? null);
    return ok(res, this.wantCount ? total : undefined);
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

const session = {
  access_token: "demo-access-token",
  refresh_token: "demo-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: DEMO_USER,
};

export function createDemoClient(): any {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
  return {
    from: (table: string) => new DemoQuery(table),
    rpc: () => ok(null),
    auth: {
      getUser: () => ok({ user: DEMO_USER }),
      getSession: () => ok({ session }),
      signInWithPassword: () => ok({ user: DEMO_USER, session }),
      signUp: () => ok({ user: DEMO_USER, session }),
      signOut: () => Promise.resolve({ error: null }),
      verifyOtp: () => ok({ user: DEMO_USER, session }),
      exchangeCodeForSession: () => ok({ user: DEMO_USER, session }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    storage: {
      from: () => ({
        upload: () => ok(null),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  };
}
