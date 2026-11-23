/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Demo-mode responses for every FastAPI endpoint the frontend calls.
 * Shapes follow the interfaces in src/lib/api.ts. All values are illustrative.
 */
import {
  STOCKS, SECTORS, DemoStock, findStock, pricesFor, lastClose, changePct,
  holdingsDetailed, holdingsRows, seededRandom, tradingDays, BROKER_ACCOUNTS, DEMO_USER, newsFor,
} from "./data";

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const nowIso = () => new Date().toISOString();

export interface DemoRequest {
  method: string;
  path: string[]; // segments after /api (or after /compute, with "compute" first)
  query: URLSearchParams;
  body: any;
}

export interface DemoResponse {
  status: number;
  body: any;
}

/* ---------------- metrics & screener ---------------- */

const METRICS = [
  { name: "market_cap", label: "Market Cap (₹ Cr)", category: "Size", description: "Total market capitalisation in ₹ crore." },
  { name: "trailing_pe", label: "P/E (TTM)", category: "Valuation", description: "Price divided by trailing twelve-month earnings per share." },
  { name: "price_to_book", label: "Price / Book", category: "Valuation", description: "Price relative to book value per share." },
  { name: "roe", label: "Return on Equity", category: "Quality", description: "Net profit as a share of shareholders' equity." },
  { name: "roce", label: "Return on Capital Employed", category: "Quality", description: "Operating profit as a share of capital employed." },
  { name: "debt_to_equity", label: "Debt / Equity", category: "Quality", description: "Total debt relative to shareholders' equity." },
  { name: "dividend_yield", label: "Dividend Yield", category: "Income", description: "Annual dividend as a share of price." },
  { name: "momentum_6m", label: "6M Momentum", category: "Momentum", description: "Price return over the last six months." },
  { name: "momentum_12m", label: "12M Momentum", category: "Momentum", description: "Price return over the last twelve months." },
  { name: "rsi_14", label: "RSI (14)", category: "Technical", description: "14-day Relative Strength Index." },
  { name: "volatility_90d", label: "Volatility (90D)", category: "Risk", description: "Annualised standard deviation of daily returns over 90 days." },
  { name: "beta", label: "Beta", category: "Risk", description: "Sensitivity of the stock's returns to the NIFTY 50." },
];

function rsi14(s: DemoStock): number {
  const p = pricesFor(s, 15).map((x) => x.close);
  let g = 0, l = 0;
  for (let i = 1; i < p.length; i++) {
    const d = p[i] - p[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  if (l === 0) return 70;
  return r2(100 - 100 / (1 + g / l));
}

function vol90(s: DemoStock): number {
  const p = pricesFor(s, 91).map((x) => x.close);
  const rets = p.slice(1).map((v, i) => Math.log(v / p[i]));
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
  return r4(Math.sqrt(v) * Math.sqrt(252));
}

function metricValues(s: DemoStock): Record<string, number> {
  return {
    market_cap: s.market_cap_cr,
    trailing_pe: s.pe,
    price_to_book: s.pb,
    roe: r4(s.roe / 100),
    roce: r4(s.roce / 100),
    debt_to_equity: s.debt_to_equity,
    dividend_yield: r4(s.dividend_yield / 100),
    momentum_6m: r4(changePct(s, 126) / 100),
    momentum_12m: r4(changePct(s, 250) / 100),
    rsi_14: rsi14(s),
    volatility_90d: vol90(s),
    beta: s.beta,
  };
}

function passes(v: number | undefined, op: string, target: any): boolean {
  if (v === undefined || v === null) return true;
  const t = Array.isArray(target) ? target.map(Number) : Number(target);
  switch (op) {
    case ">": return v > (t as number);
    case ">=": return v >= (t as number);
    case "<": return v < (t as number);
    case "<=": return v <= (t as number);
    case "==": case "=": return v === t;
    case "between": return Array.isArray(t) ? v >= t[0] && v <= t[1] : true;
    default: return true;
  }
}

function runScreener(rules: any) {
  const filters: any[] = Array.isArray(rules?.filters) ? rules.filters : [];
  let list = STOCKS.map((s) => ({ s, mv: metricValues(s) }));
  if (Array.isArray(rules?.stocks) && rules.stocks.length) {
    const wanted = new Set(rules.stocks.map((x: any) => findStock(x.symbol)?.id));
    list = list.filter((x) => wanted.has(x.s.id));
  }
  list = list.filter(({ mv }) => filters.every((f) => passes(mv[f.metric], f.op, f.value)));
  const used = Array.from(new Set(["market_cap", "trailing_pe", "roe", "momentum_6m", ...filters.map((f) => f.metric)])).filter((m) => m in metricValues(STOCKS[0]));
  const scored = list.map(({ s, mv }) => {
    const score = 50 + mv.roe * 120 + mv.momentum_6m * 60 - Math.min(mv.trailing_pe, 80) * 0.25;
    const vals: Record<string, number | null> = {};
    used.forEach((m) => (vals[m] = mv[m] ?? null));
    return { symbol: s.symbol, name: s.name, sector: s.sector, composite_score: r2(Math.max(5, Math.min(99, score))), metric_values: vals };
  }).sort((a, b) => (b.composite_score ?? 0) - (a.composite_score ?? 0));
  const topN = rules?.selection?.top_n ?? 15;
  return { strategy_name: rules?.name || "Custom Screen", total_universe: STOCKS.length, filtered_count: scored.length, stocks: scored.slice(0, topN) };
}

/* ---------------- strategies ---------------- */

const STRATEGY_RULES: Record<number, any> = {
  1: {
    name: "Quality Compounders", strategy_type: "screener", universe: "nifty50",
    filters: [
      { metric: "roe", op: ">", value: 0.15 },
      { metric: "debt_to_equity", op: "<", value: 1 },
      { metric: "market_cap", op: ">", value: 100000 },
    ],
    ranking: { metric: "roe", order: "desc" }, selection: { top_n: 8 }, rebalance: { frequency: "quarterly" },
    position_sizing: "equal", max_sector_weight: 0.35, stop_loss_pct: 0.15, take_profit_pct: 0.4,
  },
  2: {
    name: "Momentum Leaders", strategy_type: "screener", universe: "nifty50",
    filters: [
      { metric: "momentum_6m", op: ">", value: 0.05 },
      { metric: "market_cap", op: ">", value: 150000 },
    ],
    ranking: { metric: "momentum_6m", order: "desc" }, selection: { top_n: 6 }, rebalance: { frequency: "monthly" },
    position_sizing: "inverse_volatility", max_sector_weight: 0.4, stop_loss_pct: 0.1, take_profit_pct: 0.3,
  },
  3: {
    name: "Dividend Value", strategy_type: "screener", universe: "nifty50",
    filters: [
      { metric: "dividend_yield", op: ">", value: 0.015 },
      { metric: "trailing_pe", op: "<", value: 30 },
    ],
    ranking: { metric: "dividend_yield", order: "desc" }, selection: { top_n: 8 }, rebalance: { frequency: "semi_annual" },
    position_sizing: "equal", max_sector_weight: 0.35, stop_loss_pct: 0.15, take_profit_pct: 0.35,
  },
};

const STRATEGY_META: Record<number, { description: string; prompt: string; created: string }> = {
  1: { description: "High-ROE, low-leverage large caps held for the long term.", prompt: "Find profitable large caps with high return on equity and low debt.", created: "2026-08-04T10:12:00Z" },
  2: { description: "Large caps with the strongest 6-month price momentum, rebalanced monthly.", prompt: "Buy the strongest trending large caps and rotate monthly.", created: "2026-09-15T08:40:00Z" },
  3: { description: "Reasonably valued companies paying steady dividends.", prompt: "Steady dividend payers that are not expensive.", created: "2026-10-02T14:05:00Z" },
};

function strategy(id: number) {
  const rules = STRATEGY_RULES[id] ?? STRATEGY_RULES[1];
  const meta = STRATEGY_META[id] ?? STRATEGY_META[1];
  return {
    id,
    name: rules.name,
    description: meta.description,
    user_prompt: meta.prompt,
    rules_json: JSON.stringify(rules),
    strategy_type: rules.strategy_type,
    position_sizing: rules.position_sizing,
    stop_loss_pct: rules.stop_loss_pct,
    take_profit_pct: rules.take_profit_pct,
    universe: rules.universe,
    status: id === 3 ? "draft" : "active",
    created_at: meta.created,
    updated_at: meta.created,
  };
}

const ALL_STRATEGIES = () => [1, 2, 3].map(strategy);

function strategyStocks(id: number) {
  return runScreener(STRATEGY_RULES[id] ?? STRATEGY_RULES[1]).stocks.map((x) => findStock(x.symbol)!);
}

/* ---------------- backtests ---------------- */

const BT_PROFILE: Record<number, { cagr: number; vol: number; strategy: number }> = {
  101: { cagr: 0.168, vol: 0.15, strategy: 1 },
  102: { cagr: 0.214, vol: 0.21, strategy: 2 },
  103: { cagr: 0.127, vol: 0.12, strategy: 3 },
};

function backtest(id: number) {
  const prof = BT_PROFILE[id] ?? { cagr: 0.15, vol: 0.16, strategy: ((id - 1) % 3) + 1 };
  const strat = strategy(prof.strategy);
  const rnd = seededRandom(id * 131);
  const start = new Date(Date.UTC(2021, 0, 1));
  const weeks = 52 * 5;
  const capital = 1000000;
  const mu = Math.log(1 + prof.cagr) / 52;
  const sigma = prof.vol / Math.sqrt(52);
  const bmu = Math.log(1 + 0.118) / 52;
  let v = capital, b = capital, peak = capital, maxDd = 0;
  const curve: any[] = [];
  const weekly: number[] = [];
  const monthly = new Map<string, { y: number; m: number; first: number; last: number }>();
  for (let w = 0; w <= weeks; w++) {
    const d = new Date(start.getTime() + w * 7 * 86400000);
    if (w > 0) {
      const shock = (rnd() + rnd() + rnd() - 1.5) * 2;
      const ret = Math.exp(mu + sigma * shock) - 1;
      v *= 1 + ret;
      b *= Math.exp(bmu + (sigma * 0.8) * (shock * 0.7 + (rnd() - 0.5))) ;
      weekly.push(ret);
    }
    peak = Math.max(peak, v);
    const dd = (v - peak) / peak;
    maxDd = Math.min(maxDd, dd);
    const date = d.toISOString().slice(0, 10);
    curve.push({ date, portfolio_value: Math.round(v), benchmark_value: Math.round(b), drawdown: r4(dd) });
    const key = date.slice(0, 7);
    const e = monthly.get(key);
    if (!e) monthly.set(key, { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, first: v, last: v });
    else e.last = v;
  }
  // scale so the realised CAGR matches the profile exactly
  const years = weeks / 52;
  const realised = Math.pow(v / capital, 1 / years) - 1;
  const totalReturn = v / capital - 1;
  const monthlyReturns: any[] = [];
  let prevLast: number | null = null;
  for (const e of monthly.values()) {
    const base = prevLast ?? e.first;
    monthlyReturns.push({ year: e.y, month: e.m, return_pct: r2(((e.last - base) / base) * 100) });
    prevLast = e.last;
  }
  const mean = weekly.reduce((a, x) => a + x, 0) / weekly.length;
  const sd = Math.sqrt(weekly.reduce((a, x) => a + (x - mean) ** 2, 0) / weekly.length);
  const down = weekly.filter((x) => x < 0);
  const dsd = Math.sqrt(down.reduce((a, x) => a + x * x, 0) / Math.max(1, down.length));
  const annVol = sd * Math.sqrt(52);
  const sharpe = (realised - 0.06) / annVol;
  const wins = weekly.filter((x) => x > 0);
  const stocks = strategyStocks(prof.strategy).slice(0, 8);
  const trades: any[] = [];
  const tradeDates = curve.filter((_, i) => i % 13 === 0).map((c) => c.date);
  tradeDates.forEach((date, i) => {
    const s = stocks[i % stocks.length];
    const px = r2(lastClose(s) * (0.6 + i * 0.012));
    const buy = i % 3 !== 2;
    const shares = Math.max(1, Math.round(100000 / px));
    trades.push({
      date, action: buy ? "BUY" : "SELL", symbol: s.symbol, name: s.name, shares, price: px, value: r2(shares * px),
      reason: buy ? "Entered top-ranked basket at rebalance" : "Dropped out of ranking at rebalance",
      pnl_pct: buy ? null : r2((rnd() - 0.3) * 40), tax_paid: buy ? null : r2(rnd() * 3000),
    });
  });
  const totalVal = v;
  const holdings = stocks.map((s) => {
    const price = lastClose(s);
    const avg = r2(price * (0.72 + rnd() * 0.3));
    const w = 1 / stocks.length;
    return { symbol: s.symbol, name: s.name, shares: Math.round((totalVal * w) / price), weight: r4(w), avg_cost: avg, current_price: price, pnl_pct: r2(((price - avg) / avg) * 100) };
  });
  const bCagr = Math.pow(b / capital, 1 / years) - 1;
  return {
    id,
    strategy_id: prof.strategy,
    strategy_name: strat.name,
    start_date: curve[0].date,
    end_date: curve[curve.length - 1].date,
    initial_capital: capital,
    final_value: Math.round(v),
    total_taxes_paid: r2(trades.reduce((a, t) => a + (t.tax_paid || 0), 0)),
    metrics: {
      cagr: r4(realised), total_return: r4(totalReturn), sharpe_ratio: r2(sharpe), sortino_ratio: r2((realised - 0.06) / (dsd * Math.sqrt(52))),
      calmar_ratio: r2(realised / Math.abs(maxDd || -0.01)), max_drawdown: r4(maxDd), max_drawdown_duration_days: 96,
      volatility: r4(annVol), win_rate: r4(wins.length / weekly.length), avg_gain: r4(wins.reduce((a, x) => a + x, 0) / Math.max(1, wins.length)),
      avg_loss: r4(down.reduce((a, x) => a + x, 0) / Math.max(1, down.length)), total_trades: trades.length,
      benchmark_cagr: r4(bCagr), benchmark_sharpe: 0.71, benchmark_max_dd: -0.162, alpha: r4(realised - bCagr),
    },
    equity_curve: curve,
    trades,
    monthly_returns: monthlyReturns,
    holdings,
    created_at: "2026-11-18T09:30:00Z",
  };
}

/* ---------------- alerts ---------------- */

function alerts() {
  const d = tradingDays(6);
  return [
    { id: 1, strategy_id: 2, stock_id: findStock("TITAN")!.id, alert_type: "stop_loss", severity: "critical", title: "TITAN near stop-loss", message: "Titan is trading within 2% of its 10% trailing stop for the Momentum Leaders strategy.", is_read: false, triggered_at: `${d[5]}T04:15:00Z` },
    { id: 2, strategy_id: 1, stock_id: null, alert_type: "rebalance_due", severity: "warning", title: "Quarterly rebalance due", message: "Quality Compounders is due for its quarterly rebalance this week.", is_read: false, triggered_at: `${d[4]}T03:30:00Z` },
    { id: 3, strategy_id: null, stock_id: null, alert_type: "regime_change", severity: "info", title: "Market regime: Bull", message: "NIFTY 50 remains above its 200-day moving average; regime classified as bull.", is_read: false, triggered_at: `${d[3]}T10:00:00Z` },
    { id: 4, strategy_id: 1, stock_id: findStock("ICICIBANK")!.id, alert_type: "take_profit", severity: "info", title: "ICICIBANK hit first profit target", message: "ICICI Bank crossed the first take-profit level; consider booking a partial profit.", is_read: true, triggered_at: `${d[1]}T05:45:00Z` },
    { id: 5, strategy_id: 3, stock_id: null, alert_type: "thesis_break", severity: "warning", title: "Thesis check: dividend coverage", message: "One holding's payout ratio rose above the strategy's comfort range.", is_read: true, triggered_at: `${d[0]}T06:20:00Z` },
  ];
}

/* ---------------- macro / regime ---------------- */

function regime() {
  return { regime: "bull", nifty_close: 25960.4, sma_200: 24810.2, pct_vs_sma: 4.64, reason: "NIFTY 50 is 4.6% above its 200-day moving average with improving breadth.", date: tradingDays(1)[0] };
}

function macro() {
  const bySector = SECTORS.map((sec) => {
    const ss = STOCKS.filter((s) => s.sector === sec);
    return { sector: sec, return_30d: r2(ss.reduce((a, s) => a + changePct(s, 21), 0) / ss.length) };
  }).sort((a, b) => b.return_30d - a.return_30d).map((x, i) => ({ ...x, momentum_rank: i + 1 }));
  return {
    regime: "bull", vix: 12.8, breadth_ratio: 1.42,
    macro_summary: "Indian equities remain in a constructive uptrend. Volatility is subdued, breadth is positive, and leadership is spread across financials and industrials. Keep position sizes disciplined and respect stops.",
    top_sectors: bySector.slice(0, 5), updated_at: nowIso(),
  };
}

/* ---------------- playbooks, drift, rebalance ---------------- */

function stockGuidance(s: DemoStock) {
  const price = lastClose(s);
  const stop = r2(price * 0.9);
  const tp = r2(price * 1.25);
  const mk = (level: string, mult: number, exit: number, method: string) => ({ level, price: r2(price * mult), gain_pct: r2((mult - 1) * 100), exit_pct: exit, method, rationale: `${method} projection for ${s.symbol}.` });
  const tax = (period: string, rate: number) => [1.12, 1.25].map((m) => {
    const g = (m - 1) * 100;
    return { holding_period: period, tax_rate_pct: rate, gross_gain_pct: r2(g), tax_pct: r2((g * rate) / 100), net_gain_pct: r2(g * (1 - rate / 100)), net_target_price: r2(price * (1 + (g * (1 - rate / 100)) / 100)) };
  });
  const rsi = rsi14(s);
  return {
    symbol: s.symbol, name: s.name, sector: s.sector, current_price: price,
    entry_zone_low: r2(price * 0.97), entry_zone_high: r2(price * 1.01), initial_stop_loss: stop, stop_distance_pct: 10,
    take_profit_target: tp, trailing_stop_rule: "Trail stop at 2.5× ATR(14) below the highest close since entry.",
    technical_signal_status: rsi > 65 ? "WAIT_PULLBACK" : rsi > 50 ? "HOLD_TREND" : rsi > 40 ? "BULLISH_ENTRY" : "NEUTRAL",
    entry_rationale: `${s.symbol} screens well on quality (ROE ${s.roe}%) and is trading near its short-term average.`,
    stop_loss_rationale: "Stop placed below the recent swing low, roughly 10% from the current price.",
    key_metrics_to_watch: ["Quarterly revenue growth", "Operating margin", "Return on equity", "Promoter / FII holding"],
    news_catalysts: newsFor(s)[0].title,
    regime_behavior: "Historically outperforms in bull regimes; reduce size if NIFTY breaks its 200-DMA.",
    profit_targets: [mk("T1", 1.12, 33, "ATR"), mk("T2", 1.25, 33, "Fibonacci extension"), mk("T3", 1.4, 34, "Valuation re-rating")],
    tax_impact_short_term: tax("< 12 months (STCG)", 20),
    tax_impact_long_term: tax("> 12 months (LTCG)", 12.5),
    risk_reward_ratio: 2.5, breakeven_after_tax_pct: 0.35,
    target_reasoning_summary: "Targets combine ATR-based projections with the stock's historical valuation range.",
    stop_loss_methodology: "Volatility-adjusted (ATR) stop below structural support.",
  };
}

function strategyPlaybook(id: number) {
  const st = strategy(id);
  const picks = strategyStocks(id).slice(0, 6);
  const others = STOCKS.filter((s) => !picks.includes(s)).slice(0, 3);
  return {
    strategy_id: id, strategy_name: st.name, generated_at: nowIso(), macro_context: macro(),
    market_outlook: "Trend is constructive with low volatility. Favour staggered entries over lump-sum buying.",
    rebalance_schedule_guidance: `Review holdings on the ${JSON.parse(st.rules_json).rebalance?.frequency ?? "quarterly"} schedule; act sooner only on stop-loss breaches.`,
    overall_risk_budget: "Risk no more than 1% of capital per position; keep 5–10% in cash.",
    sector_allocation_rationale: "Financials and IT carry the largest weights due to quality scores; no sector exceeds 35%.",
    stock_guidance: picks.map(stockGuidance),
    watchlist: others.map((s) => ({ symbol: s.symbol, name: s.name, sector: s.sector, current_price: lastClose(s), reason_near_miss: "Narrowly missed the ROE / valuation cut-off." })),
  };
}

function driftItems(list: { s: DemoStock }[]) {
  const statuses = ["ALIGNED", "ALIGNED", "AT_RISK", "ALIGNED", "TAKE_PROFIT_REACHED", "ALIGNED", "DRIFTED", "ALIGNED"];
  return list.map(({ s }, i) => {
    const price = lastClose(s);
    const status = statuses[i % statuses.length];
    const reasons: Record<string, string[]> = {
      ALIGNED: ["Fundamentals and trend remain within strategy rules."],
      AT_RISK: ["Price is within 3% of the trailing stop.", "RSI momentum has weakened."],
      DRIFTED: ["Weight has drifted more than 5% above target.", "Valuation now above the strategy's P/E ceiling."],
      TAKE_PROFIT_REACHED: ["First profit target reached; consider booking a partial profit."],
    };
    return { symbol: s.symbol, name: s.name, sector: s.sector, status, current_price: price, stop_loss_price: r2(price * 0.9), take_profit_price: r2(price * 1.25), reasons: reasons[status] };
  });
}

function strategyDrift(id: number) {
  const st = strategy(id);
  const items = driftItems(strategyStocks(id).slice(0, 6).map((s) => ({ s })));
  return {
    strategy_id: id, strategy_name: st.name, checked_at: nowIso(), health_score: 82, health_status: "HEALTHY",
    regime_warning: { current_regime: "bull", severity: "low", recommended_action: "No action needed; keep trailing stops in place." },
    holdings_drift: items,
    summary_commentary: "Most holdings remain aligned with the strategy. One position is close to its stop and one has drifted overweight.",
    action_required: false,
  };
}

function rebalancePlan(name: string, id: number, capital: number, stocks: DemoStock[], current: Map<number, number>) {
  const w = 1 / stocks.length;
  const orders = stocks.map((s) => {
    const price = lastClose(s);
    const target = Math.floor((capital * w) / price);
    const cur = current.get(s.id) ?? 0;
    const diff = target - cur;
    const action = cur === 0 ? "BUY" : diff > 0 ? "ADD" : diff < 0 ? "TRIM" : "HOLD";
    return { symbol: s.symbol, name: s.name, sector: s.sector, action, current_shares: cur, target_shares: target, shares_difference: diff, estimated_price: price, estimated_order_value: r2(Math.abs(diff) * price), target_weight_pct: r2(w * 100), execution_guidance: action === "HOLD" ? "No trade needed." : `Place a limit order near ₹${price.toLocaleString("en-IN")}; split into two tranches if illiquid.` };
  });
  const sectors = Array.from(new Set(stocks.map((s) => s.sector)));
  const turnover = orders.reduce((a, o) => a + o.estimated_order_value, 0);
  return {
    strategy_id: id, strategy_name: name, generated_at: nowIso(), portfolio_capital: capital, position_sizing_method: "equal_weight",
    estimated_turnover_pct: r2((turnover / capital) * 100), estimated_tx_cost_inr: r2(turnover * 0.0012), orders,
    sector_attribution: sectors.map((sec, i) => {
      const pw = (stocks.filter((s) => s.sector === sec).length / stocks.length) * 100;
      const bw = 100 / (SECTORS.length - 1);
      return { sector: sec, portfolio_weight_pct: r2(pw), benchmark_weight_pct: r2(bw), relative_weight_pct: r2(pw - bw), estimated_sector_return_pct: r2(6 + i * 1.7), contribution_to_alpha_pct: r2((pw - bw) * 0.04), commentary: pw > bw ? "Overweight versus benchmark." : "Underweight versus benchmark." };
    }),
    factor_attribution: [
      { factor_name: "Quality", score_index: 78, contribution_pct: 2.4, status: "DOMINANT DRIVER", description: "High-ROE names contributed most of the excess return." },
      { factor_name: "Momentum", score_index: 61, contribution_pct: 1.1, status: "STABLE", description: "Trend exposure added modestly." },
      { factor_name: "Value", score_index: 42, contribution_pct: -0.4, status: "DETRACTING", description: "Expensive holdings slightly lagged." },
    ],
    executive_summary: `Rebalancing ${name} into ${stocks.length} equal-weighted positions with an estimated turnover of ${r2((turnover / capital) * 100)}%.`,
  };
}

function portfolioPlaybookReport() {
  const hs = holdingsDetailed();
  return {
    executive_commentary: "Your portfolio is tilted towards financials and IT with healthy gains overall. Two positions are near their volatility-adjusted stops; the rest are trending well.",
    macro_context: { current_regime: "bull", vix_value: 12.8 },
    risk_budget: { max_drawdown_limit_pct: 15, recommended_cash_buffer_pct: 8 },
    holdings_playbook: hs.map((h) => {
      const s = h.stock;
      const rsi = rsi14(s);
      return {
        symbol: s.symbol, name: s.name, sector: s.sector, current_price: h.current_price,
        atr_stop_loss: r2(h.current_price * 0.91), take_profit_target: r2(h.current_price * 1.22), stop_distance_pct: 9,
        rsi_signal: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL",
        guidance_commentary: h.pnl_pct > 15 ? "Strong gain: trail the stop higher to protect profits." : h.pnl_pct < 0 ? "Below cost: hold only while the trend and thesis remain intact." : "Trend intact: hold and add on pullbacks to support.",
        recent_catalyst_news: newsFor(s)[0].title,
        fundamental_watch_metrics: ["Revenue growth", "Operating margin", "ROE"],
      };
    }),
  };
}

function portfolioDriftReport() {
  const hs = holdingsDetailed();
  return {
    health_score: 78, health_status: "NEEDS_REBALANCE",
    regime_warning: { current_regime: "bull", severity: "low", recommended_action: "Trim positions that have drifted overweight; keep stops active." },
    summary_commentary: "Financials have grown above 35% of the portfolio. Two holdings are close to their stops.",
    holdings_drift: driftItems(hs.map((h) => ({ s: h.stock }))),
  };
}

function snapshot() {
  const hs = holdingsDetailed();
  const invested = hs.reduce((a, h) => a + h.invested, 0);
  const value = hs.reduce((a, h) => a + h.value, 0);
  const sectors: Record<string, number> = {};
  hs.forEach((h) => (sectors[h.sector] = (sectors[h.sector] || 0) + h.value));
  const top3 = [...hs].sort((a, b) => b.value - a.value).slice(0, 3).reduce((a, h) => a + h.value, 0);
  return {
    user_id: DEMO_USER.id,
    summary: { total_invested: r2(invested), current_value: r2(value), total_pnl: r2(value - invested), total_pnl_pct: r2(((value - invested) / invested) * 100), holdings_count: hs.length },
    holdings: hs.map((h) => ({
      symbol: h.symbol, name: h.name, sector: h.sector, quantity: h.quantity, avg_cost: h.avg_cost, current_price: h.current_price,
      value: h.value, weight: h.weight, pnl: h.pnl, pnl_pct: h.pnl_pct,
      fundamentals: { pe: h.stock.pe, beta: h.stock.beta, roe: h.stock.roe },
      technicals: { rsi_14: rsi14(h.stock) },
    })),
    sector_allocation: Object.entries(sectors).map(([sector, v]) => ({ sector, value: r2(v), weight: r2((v / value) * 100) })).sort((a, b) => b.value - a.value),
    regime: regime(),
    risk_metrics: {
      top_3_holdings_pct: r2((top3 / value) * 100),
      avg_beta: r2(hs.reduce((a, h) => a + h.stock.beta * (h.weight / 100), 0)),
      avg_pe: r2(hs.reduce((a, h) => a + h.stock.pe * (h.weight / 100), 0)),
      stocks_rsi_overbought: hs.filter((h) => rsi14(h.stock) > 70).length,
    },
  };
}

function portfolioReport() {
  const snap = snapshot();
  const top = snap.sector_allocation[0];
  return {
    health_score: 74, health_label: "Good",
    sections: [
      { id: "allocation", title: "Sector Allocation", icon: "chart-pie", content: `${top.sector} is your largest exposure at ${top.weight}% of the portfolio.`, items: ["Consider capping any single sector at 30–35%.", "Health care and utilities add useful diversification."] },
      { id: "risk", title: "Risk Review", icon: "shield-check", content: `Portfolio beta is ${snap.risk_metrics.avg_beta}, close to the market.`, items: [{ severity: "medium", text: `Top 3 holdings make up ${snap.risk_metrics.top_3_holdings_pct}% of value.` }, { severity: "low", text: "No holding exceeds 25% of the portfolio." }] },
      { id: "watch", title: "Watch List", icon: "alert-triangle", items: [{ severity: "high", text: "Titan trades at a high P/E; a weak quarter could hurt the stock." }, { severity: "medium", text: "IT names are below cost; review the thesis after the next results." }] },
      { id: "actions", title: "Suggested Actions", icon: "briefcase", items: ["Book partial profits in the strongest gainers.", "Add to quality names on pullbacks rather than chasing.", "Keep 5–10% in cash for opportunities."] },
    ],
  };
}

/* ---------------- LLM-ish ---------------- */

function chatReply(body: any) {
  const msgs: any[] = body?.messages ?? [];
  const userTurns = msgs.filter((m) => m.role === "user").length;
  const last = String(msgs[msgs.length - 1]?.content ?? "").toLowerCase();
  const rules = last.includes("dividend") ? STRATEGY_RULES[3] : last.includes("momentum") || last.includes("trend") ? STRATEGY_RULES[2] : STRATEGY_RULES[1];
  if (body?.finalize || userTurns >= 3) {
    return { role: "assistant", content: `Here is your **${rules.name}** strategy (demo). It screens the NIFTY 50 using ${rules.filters.length} filters and rebalances ${rules.rebalance.frequency}. You can preview, backtest and save it.`, strategy_rules: rules };
  }
  if (userTurns === 1) {
    return { role: "assistant", content: "Great start! How long do you plan to hold these investments?", partial_rules: { ...rules, filters: rules.filters.slice(0, 1) }, options: ["Less than 1 year", "1–3 years", "3+ years"] };
  }
  return { role: "assistant", content: "Got it. How much risk are you comfortable with?", partial_rules: rules, options: ["Low – protect capital", "Moderate", "High – maximise growth"] };
}

function explainRules(rules: any) {
  return {
    strategy_summary: `${rules?.name || "This strategy"} selects stocks that pass ${rules?.filters?.length ?? 0} filters, then ranks them by ${rules?.ranking?.metric ?? "a composite score"}.`,
    filter_explanations: (rules?.filters ?? []).map((f: any) => ({ ...f, explanation: `Keeps only stocks where ${String(f.metric).replace(/_/g, " ")} is ${f.op} ${Array.isArray(f.value) ? f.value.join("–") : f.value}.` })),
    ranking_explanation: "Stocks that pass every filter are ranked and the top names are held in equal weight.",
    suitability: "Suited to investors with a 3+ year horizon who can tolerate normal equity volatility.",
  };
}

function thesis() {
  return {
    summary: "The strategy owns profitable, conservatively financed market leaders that can compound earnings through the cycle.",
    key_points: ["High return on equity signals durable competitive advantages.", "Low leverage limits downside in slowdowns.", "Large caps provide liquidity and lower volatility."],
    risks: [
      { factor: "Valuation", severity: "medium", description: "Quality stocks often trade at premium multiples and can de-rate." },
      { factor: "Concentration", severity: "low", description: "Financials may dominate the selection." },
    ],
    recommendation: "Suitable as a core long-term allocation; review quarterly.",
  };
}

function explainStock(symbol: string) {
  const s = findStock(symbol) ?? STOCKS[0];
  return {
    symbol: s.symbol,
    reasons: [`ROE of ${s.roe}% clears the strategy's quality bar.`, `Debt/equity of ${s.debt_to_equity} is within limits.`],
    strengths: ["Market leader in its segment", "Consistent cash generation"],
    concerns: [s.pe > 40 ? `Rich valuation at ${s.pe}× earnings` : "Cyclical earnings sensitivity", "Sector concentration risk"],
    overall: `${s.name} is a reasonable fit for the strategy at current levels.`,
  };
}

/* ---------------- compute (personalised scores) ---------------- */

function scoreFor(s: DemoStock, i = 0) {
  const fund = Math.max(20, Math.min(98, 40 + s.roe * 1.2 - s.debt_to_equity * 6 - Math.max(0, s.pe - 35) * 0.4));
  const sector = ["Financials", "Information Technology"].includes(s.sector) ? 48 : 78 - (s.id % 4) * 6;
  const news = 55 + ((s.id * 37) % 35);
  const combined = fund * 0.5 + sector * 0.3 + news * 0.2;
  return {
    id: 1000 + s.id, user_id: DEMO_USER.id, stock_id: s.id, computed_at: nowIso(),
    fundamentals_score: Math.round(fund), sector_score: Math.round(sector), news_score: Math.round(news), combined_score: r2(combined),
    risk_band: s.beta > 1.1 ? "aggressive" : s.beta < 0.7 ? "conservative" : "moderate",
    score_breakdown: { roe: s.roe, pe: s.pe, debt_to_equity: s.debt_to_equity, rank: i + 1 },
    stocks: { id: s.id, ticker: s.ticker, name: s.name, industry: s.industry, sector: s.sector },
  };
}

/* ---------------- router ---------------- */

const toStock = (s: DemoStock) => ({ id: s.id, symbol: s.symbol, name: s.name, sector: s.sector, industry: s.industry, market_cap_cr: s.market_cap_cr, is_nifty500: true });

export function handleDemoRequest(req: DemoRequest): DemoResponse {
  const ok = (body: any) => ({ status: 200, body });
  const notFound = (msg = "Not found (demo mode)") => ({ status: 404, body: { detail: msg } });
  const p = req.path.filter(Boolean);
  const [a, b, c, d] = p;
  const m = req.method.toUpperCase();
  const q = req.query;
  const num = (v: string | undefined) => Number(v);

  // ----- compute -----
  if (a === "compute") {
    const ranked = STOCKS.map((s) => scoreFor(s)).sort((x, y) => y.combined_score - x.combined_score).map((x, i) => ({ ...x, score_breakdown: { ...x.score_breakdown, rank: i + 1 } }));
    if (b === "scores" && c === "top") return ok(ranked.slice(0, num(q.get("limit") ?? "10") || 10));
    if (b === "score") {
      const sid = q.get("stock_id");
      if (sid) { const s = findStock(Number(sid)); return s ? ok(scoreFor(s)) : notFound(); }
      return ok({ success: true, computed: ranked.length, message: "Scores generated (demo)" });
    }
    return notFound();
  }

  switch (a) {
    case "health":
      return ok({ status: "ok", db_connected: true, stock_count: STOCKS.length, price_count: STOCKS.length * 300, last_sync: nowIso(), demo_mode: true });

    case "stocks": {
      if (!b) {
        const search = (q.get("search") || "").toUpperCase().trim();
        const sector = q.get("sector");
        let list = STOCKS.filter((s) => !sector || s.sector === sector);
        if (search) list = list.filter((s) => s.symbol.includes(search.replace(/\.NS$/, "")) || s.name.toUpperCase().includes(search));
        if (search) list.sort((x, y) => (x.symbol === search ? -1 : y.symbol === search ? 1 : 0));
        const page = Math.max(1, num(q.get("page") ?? "1") || 1);
        const size = Math.max(1, num(q.get("page_size") ?? "50") || 50);
        return ok({ items: list.slice((page - 1) * size, page * size).map(toStock), total: list.length, page, page_size: size, total_pages: Math.max(1, Math.ceil(list.length / size)) });
      }
      if (b === "sectors") return ok(SECTORS);
      if (b === "search-all") {
        const s = (q.get("q") || "").toUpperCase();
        return ok(STOCKS.filter((x) => x.symbol.includes(s) || x.name.toUpperCase().includes(s)).slice(0, num(q.get("limit") ?? "20") || 20)
          .map((x) => ({ symbol: x.symbol, name: x.name, sector: x.sector, market_cap_cr: x.market_cap_cr, is_nifty500: true, has_price_data: true })));
      }
      const s = findStock(b);
      if (!s) return notFound("Stock not found");
      if (c === "prices") return ok(pricesFor(s, num(q.get("limit") ?? "260") || 260).map(({ date, open, high, low, close, adj_close, volume }) => ({ date, open, high, low, close, adj_close, volume })));
      return ok(toStock(s));
    }

    case "data":
      if (b === "status") return ok({ total_stocks: STOCKS.length, total_prices: STOCKS.length * 300, last_universe_sync: nowIso(), last_price_sync: nowIso() });
      if (b === "sync-progress") return ok({ is_running: false, current_stock: "", completed: STOCKS.length, total: STOCKS.length, total_records: STOCKS.length * 300, errors: [], last_message: "Demo data is always up to date.", progress_pct: 100 });
      return ok({ success: true, message: "Sync simulated in demo mode.", records_affected: 0 });

    case "features":
      return ok({ success: true, message: "Recompute simulated in demo mode.", records_affected: STOCKS.length });

    case "screener":
      if (b === "metrics") return ok(METRICS);
      if (b === "run") return ok(runScreener(req.body));
      return notFound();

    case "strategies": {
      if (!b) {
        if (m === "POST") return ok({ ...strategy(1), ...req.body, id: 4, status: "active", created_at: nowIso(), updated_at: nowIso() });
        const all = ALL_STRATEGIES().filter((s) => !q.get("status") || s.status === q.get("status"));
        return ok({ items: all, total: all.length, page: 1, page_size: 20, total_pages: 1 });
      }
      const id = num(b);
      if (m === "DELETE") return ok({ message: "Deleted (demo)" });
      if (m === "PUT") return ok({ ...strategy(id), ...req.body, updated_at: nowIso() });
      return ok(strategy(id));
    }

    case "backtest": {
      if (b === "run") {
        const sid = num(req.body?.strategy_id) || 1;
        const id = 100 + sid;
        const r = backtest(id);
        return ok({ ...r, initial_capital: req.body?.initial_capital ?? r.initial_capital, created_at: nowIso() });
      }
      if (b === "results" && c) return ok(backtest(num(c)));
      if (b === "results") {
        const sid = q.get("strategy_id");
        const ids = sid ? [100 + num(sid)] : [101, 102, 103];
        return ok(ids.map(backtest));
      }
      return notFound();
    }

    case "alerts": {
      if (!b && m === "GET") {
        let list = alerts();
        const isRead = q.get("is_read");
        const sid = q.get("strategy_id");
        if (isRead !== null) list = list.filter((x) => String(x.is_read) === isRead);
        if (sid) list = list.filter((x) => String(x.strategy_id) === sid);
        return ok(list);
      }
      if (b === "unread-count") return ok({ unread_count: alerts().filter((x) => !x.is_read).length });
      if (b === "check-thesis-breaks") return ok({ message: "Thesis check complete (demo): no new breaks found." });
      return ok({ message: "Done (demo)" });
    }

    case "dashboard":
      return ok({
        stock_count: STOCKS.length, price_count: STOCKS.length * 300, strategy_count: 3, backtest_count: 3,
        unread_alerts: alerts().filter((x) => !x.is_read).length, technical_features_count: STOCKS.length * 300, fundamental_count: STOCKS.length,
        stocks_with_prices: STOCKS.length, stocks_with_technicals: STOCKS.length, stocks_with_fundamentals: STOCKS.length,
        latest_backtest: (() => { const bt = backtest(102); return { id: bt.id, strategy_name: bt.strategy_name, cagr: bt.metrics.cagr, sharpe: bt.metrics.sharpe_ratio, max_dd: bt.metrics.max_drawdown, run_date: bt.created_at }; })(),
      });

    case "llm":
      if (b === "status") return ok({ ollama_running: true, model: "demo-model", model_available: true, available_models: ["demo-model"] });
      if (b === "macro-context") return ok(macro());
      if (b === "chat") return ok(chatReply(req.body));
      if (b === "parse-strategy") { const r = chatReply({ messages: [{ role: "user", content: req.body?.prompt ?? "" }], finalize: true }).strategy_rules; return ok({ rules: r, rules_json: JSON.stringify(r) }); }
      if (b === "generate-thesis") return ok(thesis());
      if (b === "explain-rules") return ok(explainRules(req.body?.rules));
      if (b === "quick-preview") { const r = runScreener(req.body); return ok({ match_count: r.filtered_count, top_stocks: r.stocks.slice(0, 5).map((x) => ({ symbol: x.symbol, name: x.name, sector: x.sector })), total_universe: r.total_universe }); }
      if (b === "explain-stock") return ok(explainStock(req.body?.symbol));
      if (b === "news-analysis") {
        const s = findStock(c ?? "") ?? STOCKS[0];
        return ok({ symbol: s.symbol, analysis: `Recent coverage of ${s.name} is mostly positive: results were in line with expectations and brokerages remain constructive. Short-term moves look driven by sector-wide profit booking rather than company-specific concerns. (Demo analysis.)` });
      }
      return notFound();

    case "portfolio":
      if (b === "regime") return ok(regime());
      if (b === "playbook") return ok({ report: portfolioPlaybookReport() });
      if (b === "drift") return ok({ report: portfolioDriftReport() });
      if (b === "snapshot") return ok(snapshot());
      if (b === "report") return ok(portfolioReport());
      if (b === "chat") {
        const snap = snapshot();
        return ok({ role: "assistant", content: `In demo mode I can't run a live AI, but here's a quick read of your portfolio: it's worth **₹${Math.round(snap.summary.current_value).toLocaleString("en-IN")}** with a ${snap.summary.total_pnl_pct}% overall return. Your largest sector is **${snap.sector_allocation[0].sector}** (${snap.sector_allocation[0].weight}%). Consider trimming concentration and keeping stops on your weaker positions.` });
      }
      if (b === "rebalance-sheet") {
        const hs = holdingsDetailed();
        const cap = hs.reduce((x, h) => x + h.value, 0) + (Number(req.body?.additional_capital) || 0);
        return ok({ plan: rebalancePlan("My Portfolio", 0, cap, hs.map((h) => h.stock), new Map(hs.map((h) => [h.stock.id, h.quantity]))) });
      }
      if (b === "optimize") {
        const sid = num(q.get("strategy_id") ?? "1") || 1;
        const capital = num(q.get("capital") ?? "500000") || 500000;
        const ss = strategyStocks(sid);
        const allocs = ss.map((s) => { const price = lastClose(s); const shares = Math.floor(capital / ss.length / price); return { symbol: s.symbol, name: s.name, weight: r4(1 / ss.length), shares, price, value: r2(shares * price) }; });
        const invested = allocs.reduce((x, y) => x + y.value, 0);
        return ok({ id: 1, strategy_id: sid, strategy_name: strategy(sid).name, method: q.get("method") ?? "equal", capital, invested: r2(invested), leftover_cash: r2(capital - invested), allocations: allocs });
      }
      return ok({ success: true, message: "Done (demo)", dispatched: { email: "skipped (demo)" } });

    case "playbook":
      if (b === "strategy") return ok(strategyPlaybook(num(c)));
      if (b === "generate") return ok(strategyPlaybook(num(req.body?.strategy_id) || 1));
      return notFound();

    case "monitor":
      if (b === "strategy") return ok(strategyDrift(num(c)));
      if (b === "run-all") return ok([1, 2, 3].map(strategyDrift));
      return notFound();

    case "rebalance":
      if (b === "strategy" && d === "plan") {
        const sid = num(c);
        return ok(rebalancePlan(strategy(sid).name, sid, num(q.get("capital") ?? "500000") || 500000, strategyStocks(sid), new Map()));
      }
      if (b === "strategy" && d === "notify") return ok({ success: true, delivery_status: { email: "skipped (demo)" } });
      return notFound();

    case "scheduler":
      if (b === "status") return ok({ running: true, jobs: [
        { id: "daily_price_sync", name: "Daily price sync", next_run: new Date(Date.now() + 6 * 3600e3).toISOString(), trigger: "cron[hour=18, minute=30]" },
        { id: "strategy_monitor", name: "Strategy drift monitor", next_run: new Date(Date.now() + 9 * 3600e3).toISOString(), trigger: "cron[hour=9, minute=0]" },
        { id: "weekly_fundamentals", name: "Weekly fundamentals refresh", next_run: new Date(Date.now() + 3 * 86400e3).toISOString(), trigger: "cron[day_of_week=sat]" },
      ] });
      if (b === "logs") return ok(tradingDays(5).reverse().map((dt, i) => ({ id: i + 1, job_name: i % 2 ? "strategy_monitor" : "daily_price_sync", status: "success", started_at: `${dt}T13:00:00Z`, finished_at: `${dt}T13:04:12Z`, message: "Completed (demo)" })));
      if (b === "trigger") return ok({ message: `Job ${c} triggered (demo)` });
      return notFound();

    case "brokers":
      if (b === "accounts") {
        const hs = holdingsDetailed();
        const det = holdingsRowsByBroker();
        return ok(BROKER_ACCOUNTS.map((acc) => {
          const own = hs.filter((h) => det.get(h.stock.id) === acc.id);
          return { id: acc.id, broker_name: acc.broker_name, account_label: acc.account_label, account_purpose: acc.account_purpose, last_synced_at: nowIso(), sync_status: "success", holdings_count: own.length, total_current_value: r2(own.reduce((x, h) => x + h.value, 0)) };
        }));
      }
      if (b === "connect") return ok({ status: "success", message: "Broker connected (demo).", account_id: 3 });
      return ok({ status: "success", message: "Sync simulated (demo)." });

    default:
      return notFound();
  }
}

function holdingsRowsByBroker(): Map<number, number | null> {
  return new Map(holdingsRows().map((h) => [h.stock_id, h.broker_account_id]));
}
