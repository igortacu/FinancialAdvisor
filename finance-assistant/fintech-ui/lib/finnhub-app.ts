// app/lib/finnhub.ts
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const EDGE = `${SUPABASE_URL}/functions/v1/finnhub-proxy`;

type Quote = { c: number; d?: number; dp: number; h?: number; l?: number; o?: number; pc?: number; t?: number };
type Candles = { c: number[]; h: number[]; l: number[]; o: number[]; s: "ok" | "no_data"; t: number[]; v: number[] };

async function proxyGet<T>(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams({ path, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${EDGE}?${qs.toString()}`);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Proxy ${res.status}: ${msg}`);
  }
  return (await res.json()) as T;
}

export async function getQuote(symbol: string) {
  return proxyGet<Quote>("/quote", { symbol });
}

export async function getCandlesByCount(symbol: string, resolution: "D" | "W" | "M", count: number) {
  // Finnhub supports either (from,to) or count; we use count for simplicity
  return proxyGet<Candles>("/stock/candle", { symbol, resolution, count, adjusted: "true" });
}
