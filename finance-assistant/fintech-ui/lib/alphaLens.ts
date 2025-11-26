// Strict math helpers for Alpha Lens calculations

export type AlphaLensStats = {
  trendScore: number;           // 0..5
  volPercentile: number;        // 0..100
  breakout: "New High" | "Near High" | "Range" | "Near Low" | "New Low";
  beta: number;                 // vs SPY
  idioTodayPct: number;         // today move minus beta*SPY move
};

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  out.push(prev);
  for (let i = 1; i < values.length; i += 1) {
    const v = values[i];
    const next = v * k + prev * (1 - k);
    out.push(next);
    prev = next;
  }
  return out;
}

export function returnsFromCloses(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

export function percentileRank(sample: number[], value: number): number {
  if (!sample.length) return 0;
  const sorted = [...sample].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v > value);
  const rank = idx === -1 ? sorted.length : idx;
  return Math.round((rank / sorted.length) * 100);
}

export function cov(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  for (let i = 0; i < n; i += 1) s += (x[i] - mx) * (y[i] - my);
  return s / n;
}

export function variance(x: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const m = x.reduce((a, b) => a + b, 0) / n;
  return x.reduce((a, b) => a + (b - m) * (b - m), 0) / n;
}

export function calcAlphaLens(
  closes: number[],
  spyCloses: number[]
): AlphaLensStats | null {
  if (closes.length < 50 || spyCloses.length < 50) return null;

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const last = closes.length - 1;

  // Trend score: 0..5 based on EMA20 above EMA50 and slope
  const slope20 = ema20[last] - ema20[last - 5];
  const slope50 = ema50[last] - ema50[last - 5];
  let trend = 0;
  if (ema20[last] > ema50[last]) trend += 2;
  if (slope20 > 0) trend += 2;
  if (slope50 > 0) trend += 1;
  const trendScore = Math.max(0, Math.min(5, trend));

  // Volatility percentile: 60d std vs last 12 months sample (fallback to 60d window)
  const rets = returnsFromCloses(closes);
  const window = rets.slice(-60);
  const vol60 = Math.sqrt(252) * Math.sqrt(variance(window));
  const longSample = rets.length >= 240 ? rets.slice(-240) : rets;
  const rollingVols: number[] = [];
  for (let i = 60; i <= longSample.length; i += 1) {
    const sub = longSample.slice(i - 60, i);
    rollingVols.push(Math.sqrt(252) * Math.sqrt(variance(sub)));
  }
  const volPercentile = percentileRank(rollingVols, vol60);

  // Breakout status vs 60d range
  const lastClose = closes[last];
  const look = closes.slice(-60);
  const hi = Math.max(...look);
  const lo = Math.min(...look);
  const pos = (lastClose - lo) / Math.max(1e-9, hi - lo);
  const breakout: AlphaLensStats["breakout"] =
    pos >= 1 ? "New High" :
      pos >= 0.9 ? "Near High" :
        pos <= 0 ? "New Low" :
          pos <= 0.1 ? "Near Low" : "Range";

  // Beta vs SPY and idiosyncratic move today
  const symR = returnsFromCloses(closes);
  const spyR = returnsFromCloses(spyCloses);
  const n = Math.min(symR.length, spyR.length);
  const symSlice = symR.slice(-n);
  const spySlice = spyR.slice(-n);
  const b = variance(spySlice) === 0 ? 0 : cov(symSlice, spySlice) / variance(spySlice);

  const todaySym = symR[symR.length - 1] ?? 0;
  const todaySpy = spyR[spyR.length - 1] ?? 0;
  const idioTodayPct = (todaySym - b * todaySpy) * 100;

  return {
    trendScore,
    volPercentile,
    breakout,
    beta: Number(b.toFixed(2)),
    idioTodayPct: Number(idioTodayPct.toFixed(2)),
  };
}
