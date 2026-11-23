/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sample data used in demo mode. All prices, fundamentals, news and results are
 * illustrative and generated deterministically; they are not real market data.
 */

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@stockscout.app",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { display_name: "Demo Investor" },
  created_at: "2026-01-01T00:00:00.000Z",
};

export interface DemoStock {
  id: number;
  symbol: string; // e.g. RELIANCE
  ticker: string; // e.g. RELIANCE.NS
  name: string;
  sector: string;
  industry: string;
  base_price: number;
  market_cap_cr: number;
  pe: number;
  pb: number;
  roe: number;
  roce: number;
  debt_to_equity: number;
  dividend_yield: number;
  beta: number;
}

const RAW: [string, string, string, string, number, number, number, number, number, number, number, number, number][] = [
  // symbol, name, sector, industry, price, mcap(cr), pe, pb, roe, roce, d/e, div%, beta
  ["RELIANCE", "Reliance Industries Ltd", "Energy", "Oil & Gas", 1420, 1920000, 24.1, 2.3, 9.6, 10.2, 0.44, 0.4, 1.02],
  ["TCS", "Tata Consultancy Services Ltd", "Information Technology", "IT Services", 3480, 1260000, 26.3, 13.1, 51.2, 64.5, 0.09, 1.7, 0.71],
  ["HDFCBANK", "HDFC Bank Ltd", "Financials", "Private Bank", 1980, 1510000, 20.7, 2.9, 14.6, 7.9, 0.0, 1.1, 0.88],
  ["INFY", "Infosys Ltd", "Information Technology", "IT Services", 1610, 668000, 24.0, 7.4, 29.8, 38.6, 0.08, 2.6, 0.74],
  ["ICICIBANK", "ICICI Bank Ltd", "Financials", "Private Bank", 1395, 994000, 19.2, 3.3, 18.1, 8.3, 0.0, 0.8, 0.95],
  ["BHARTIARTL", "Bharti Airtel Ltd", "Communication Services", "Telecom", 1985, 1190000, 38.5, 9.8, 26.4, 17.9, 1.35, 0.5, 0.62],
  ["ITC", "ITC Ltd", "Consumer Staples", "FMCG", 418, 523000, 25.6, 7.2, 28.6, 37.4, 0.0, 3.4, 0.55],
  ["LT", "Larsen & Toubro Ltd", "Industrials", "Construction & Engineering", 3820, 525000, 33.4, 5.6, 16.3, 15.1, 1.12, 0.9, 1.08],
  ["SBIN", "State Bank of India", "Financials", "Public Bank", 845, 754000, 9.8, 1.6, 17.3, 6.4, 0.0, 1.6, 1.15],
  ["HINDUNILVR", "Hindustan Unilever Ltd", "Consumer Staples", "FMCG", 2410, 566000, 54.2, 11.4, 21.0, 28.4, 0.0, 1.8, 0.48],
  ["BAJFINANCE", "Bajaj Finance Ltd", "Financials", "NBFC", 985, 612000, 32.8, 5.9, 19.2, 11.8, 3.6, 0.6, 1.24],
  ["ASIANPAINT", "Asian Paints Ltd", "Materials", "Paints", 2480, 238000, 58.9, 12.1, 21.4, 27.6, 0.11, 1.0, 0.66],
  ["MARUTI", "Maruti Suzuki India Ltd", "Consumer Discretionary", "Automobiles", 12650, 398000, 27.1, 4.6, 16.9, 21.8, 0.0, 1.0, 0.79],
  ["SUNPHARMA", "Sun Pharmaceutical Industries Ltd", "Health Care", "Pharmaceuticals", 1705, 409000, 36.2, 5.8, 16.1, 19.5, 0.03, 0.8, 0.52],
  ["TITAN", "Titan Company Ltd", "Consumer Discretionary", "Jewellery & Retail", 3560, 316000, 88.4, 27.2, 31.5, 22.4, 1.25, 0.3, 0.93],
  ["AXISBANK", "Axis Bank Ltd", "Financials", "Private Bank", 1165, 361000, 13.2, 2.0, 16.2, 7.1, 0.0, 0.1, 1.12],
  ["WIPRO", "Wipro Ltd", "Information Technology", "IT Services", 262, 274000, 20.4, 3.4, 16.6, 19.8, 0.22, 2.3, 0.77],
  ["NTPC", "NTPC Ltd", "Utilities", "Power Generation", 352, 341000, 14.6, 1.9, 13.4, 10.6, 1.38, 2.4, 0.84],
  ["POWERGRID", "Power Grid Corporation of India Ltd", "Utilities", "Power Transmission", 298, 277000, 17.5, 3.1, 18.2, 12.3, 1.42, 4.3, 0.69],
  ["TATASTEEL", "Tata Steel Ltd", "Materials", "Steel", 168, 210000, 41.3, 2.3, 5.6, 9.2, 0.98, 2.1, 1.31],
  ["DRREDDY", "Dr. Reddy's Laboratories Ltd", "Health Care", "Pharmaceuticals", 1265, 105000, 18.9, 3.2, 18.0, 22.4, 0.06, 0.6, 0.47],
  ["ULTRACEMCO", "UltraTech Cement Ltd", "Materials", "Cement", 11950, 352000, 49.6, 5.0, 10.4, 12.8, 0.31, 0.6, 0.86],
  ["HCLTECH", "HCL Technologies Ltd", "Information Technology", "IT Services", 1560, 423000, 24.7, 6.1, 24.9, 31.6, 0.07, 3.8, 0.72],
  ["ADANIPORTS", "Adani Ports & SEZ Ltd", "Industrials", "Ports & Logistics", 1440, 311000, 26.1, 4.8, 19.3, 13.6, 0.82, 0.5, 1.29],
];

export const STOCKS: DemoStock[] = RAW.map((r, i) => ({
  id: i + 1,
  symbol: r[0],
  ticker: `${r[0]}.NS`,
  name: r[1],
  sector: r[2],
  industry: r[3],
  base_price: r[4],
  market_cap_cr: r[5],
  pe: r[6],
  pb: r[7],
  roe: r[8],
  roce: r[9],
  debt_to_equity: r[10],
  dividend_yield: r[11],
  beta: r[12],
}));

export const SECTORS = Array.from(new Set(STOCKS.map((s) => s.sector))).sort();

export function normSymbol(s: string): string {
  return decodeURIComponent(String(s)).toUpperCase().replace(/\.NS$|\.BO$/, "").trim();
}

export function findStock(symbolOrId: string | number): DemoStock | undefined {
  if (typeof symbolOrId === "number") return STOCKS.find((s) => s.id === symbolOrId);
  const n = normSymbol(symbolOrId);
  return STOCKS.find((s) => s.symbol === n) ?? STOCKS.find((s) => String(s.id) === n);
}

/* ---------------- deterministic pseudo-random helpers ---------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed: number) {
  return mulberry32(seed);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Trading days (Mon–Fri) ending at the most recent weekday. */
export function tradingDays(count: number, end = new Date()): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (days.length < count) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(isoDate(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return days.reverse();
}

export interface DemoPrice {
  id: number;
  stock_id: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close: number;
  volume: number;
}

const priceCache = new Map<number, DemoPrice[]>();

/** ~1 year of daily prices; the series ends exactly at the stock's base price. */
const SERIES_DAYS = 300;

export function pricesFor(stock: DemoStock, count = 260): DemoPrice[] {
  const cached = priceCache.get(stock.id);
  if (cached) return cached.slice(-Math.min(count, SERIES_DAYS));
  const days = SERIES_DAYS;
  const dates = tradingDays(days);
  const rnd = mulberry32(stock.id * 7919);
  const drift = (rnd() - 0.35) * 0.0012;
  const vol = 0.009 + stock.beta * 0.006;
  const rets: number[] = dates.map(() => drift + (rnd() - 0.5) * 2 * vol);
  // walk backwards from the base price so the latest close == base_price
  const closes: number[] = new Array(days);
  closes[days - 1] = stock.base_price;
  for (let i = days - 2; i >= 0; i--) closes[i] = closes[i + 1] / (1 + rets[i + 1]);
  const out = dates.map((date, i) => {
    const close = closes[i];
    const open = i > 0 ? closes[i - 1] * (1 + (rnd() - 0.5) * 0.004) : close;
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    return {
      id: stock.id * 100000 + i,
      stock_id: stock.id,
      date,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      adj_close: round2(close),
      volume: Math.round((stock.market_cap_cr / 50) * (0.6 + rnd() * 0.8)),
    };
  });
  priceCache.set(stock.id, out);
  return out.slice(-Math.min(count, SERIES_DAYS));
}

export function lastClose(stock: DemoStock): number {
  const p = pricesFor(stock);
  return p[p.length - 1].close;
}

export function changePct(stock: DemoStock, lookback: number): number {
  const p = pricesFor(stock);
  const a = p[Math.max(0, p.length - 1 - lookback)].close;
  return round2(((p[p.length - 1].close - a) / a) * 100);
}

/* ---------------- Supabase-style tables ---------------- */

export function fundamentalsRow(s: DemoStock) {
  return {
    id: s.id,
    stock_id: s.id,
    as_of_date: tradingDays(1)[0],
    market_cap: s.market_cap_cr,
    pe: s.pe,
    pb: s.pb,
    roe: s.roe,
    roce: s.roce,
    debt_to_equity: s.debt_to_equity,
    dividend_yield: s.dividend_yield,
    beta: s.beta,
  };
}

export function stockRow(s: DemoStock) {
  return {
    id: s.id,
    ticker: s.ticker,
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    industry: s.industry,
    exchange: "NSE",
    is_index_member: true,
    index_name: "NIFTY 50",
    market_cap_cr: s.market_cap_cr,
  };
}

const NEWS_TEMPLATES: [string, string, number][] = [
  ["{name} reports steady quarterly growth, margins in line with estimates", "Revenue grew in the high single digits year-on-year while operating margins held broadly stable, according to the company's latest filing.", 0.45],
  ["Brokerages stay positive on {short} after investor day", "Several brokerages reiterated constructive views, citing a healthy order pipeline and disciplined capital allocation.", 0.6],
  ["{short} shares slip as sector sees profit booking", "The stock moved lower alongside peers amid broad-based profit taking; analysts said fundamentals remain intact.", -0.25],
  ["{name} announces capacity expansion plan", "The board approved a multi-year capex programme aimed at expanding capacity and improving operating leverage.", 0.35],
  ["{short}: FII holding inches up in latest shareholding data", "Foreign institutional investors marginally increased their stake during the quarter, exchange data showed.", 0.2],
];

export function newsFor(s: DemoStock) {
  const days = tradingDays(12);
  const short = s.name.replace(/ (Ltd|Limited|Corporation of India Ltd)$/, "");
  return NEWS_TEMPLATES.map((t, i) => ({
    id: s.id * 10 + i,
    stock_id: s.id,
    title: t[0].replace("{name}", s.name).replace("{short}", short),
    summary: t[1],
    source: ["Economic Times", "Mint", "Business Standard", "Moneycontrol", "Reuters"][(s.id + i) % 5],
    url: "#",
    sentiment_score: t[2],
    published_at: `${days[days.length - 1 - i * 2]}T09:${String(10 + i * 7).padStart(2, "0")}:00.000Z`,
  }));
}

export const DEMO_HOLDINGS_SPEC: [string, number, number, number | null, string][] = [
  // symbol, qty, avg buy as fraction of current price, broker account id, source
  ["RELIANCE", 40, 0.86, 1, "broker"],
  ["TCS", 15, 1.07, 1, "broker"],
  ["HDFCBANK", 30, 0.82, 1, "broker"],
  ["INFY", 35, 1.04, 2, "broker"],
  ["ICICIBANK", 45, 0.78, 2, "broker"],
  ["ITC", 150, 0.92, 2, "broker"],
  ["LT", 12, 0.88, null, "manual"],
  ["SUNPHARMA", 25, 0.81, null, "manual"],
  ["TITAN", 10, 1.09, null, "csv"],
  ["NTPC", 120, 0.74, null, "csv"],
];

export const BROKER_ACCOUNTS = [
  { id: 1, broker_name: "zerodha", account_label: "Long-term (Zerodha)", account_purpose: "long_term", user_id: DEMO_USER.id },
  { id: 2, broker_name: "groww", account_label: "Core Portfolio (Groww)", account_purpose: "core", user_id: DEMO_USER.id },
];

export function holdingsRows() {
  const acquired = tradingDays(220)[0];
  return DEMO_HOLDINGS_SPEC.map(([sym, qty, frac, broker, source], i) => {
    const s = findStock(sym)!;
    return {
      id: i + 1,
      user_id: DEMO_USER.id,
      stock_id: s.id,
      quantity: qty,
      avg_buy_price: round2(lastClose(s) * frac),
      acquired_date: acquired,
      source,
      broker_account_id: broker,
    };
  });
}

export function holdingsDetailed() {
  const rows = holdingsRows();
  const total = rows.reduce((a, h) => a + h.quantity * lastClose(findStock(h.stock_id)!), 0);
  return rows.map((h) => {
    const s = findStock(h.stock_id)!;
    const price = lastClose(s);
    const value = h.quantity * price;
    return {
      stock: s,
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      shares: h.quantity,
      quantity: h.quantity,
      avg_cost: h.avg_buy_price,
      current_price: price,
      invested: round2(h.quantity * h.avg_buy_price),
      value: round2(value),
      weight: round2((value / total) * 100),
      pnl: round2(value - h.quantity * h.avg_buy_price),
      pnl_pct: round2(((price - h.avg_buy_price) / h.avg_buy_price) * 100),
    };
  });
}

export const USER_PROFILE = {
  id: 1,
  user_id: DEMO_USER.id,
  display_name: "Demo Investor",
  risk_appetite: "moderate",
  onboarding_completed: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export function tablesSnapshot(): Record<string, any[]> {
  return {
    user_profiles: [USER_PROFILE],
    stocks: STOCKS.map(stockRow),
    stock_fundamentals: STOCKS.map(fundamentalsRow),
    daily_prices: STOCKS.flatMap((s) => pricesFor(s, 120)),
    news_items: STOCKS.flatMap(newsFor),
    holdings: holdingsRows(),
    broker_accounts: BROKER_ACCOUNTS,
  };
}
