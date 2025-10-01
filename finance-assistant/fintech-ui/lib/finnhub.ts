// lib/finnhub.ts
import { Platform } from "react-native";

const FN_PROXY = process.env.EXPO_PUBLIC_SUPABASE_FN_PROXY_URL;
const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY as string; // already set

export { FINNHUB_KEY };

async function finnhubGet(path: string, params: Record<string, any>) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  // If you have a proxy, call it with Authorization header
  if (FN_PROXY) {
    const url = `${FN_PROXY}/finnhub-proxy?path=${encodeURIComponent(path)}&${qs}&token=${FINNHUB_KEY}`;

    // IMPORTANT: add Supabase anon key so the function passes JWT verification
    const headers: Record<string, string> = {};
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // same one you use to init Supabase
    if (anon) headers.Authorization = `Bearer ${anon}`;

    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Proxy ${r.status}`);
    return r.json();
  }

  // Fallback: call Finnhub directly (useful during dev)
  const url = `https://finnhub.io/api/v1/${path}?${qs}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${FINNHUB_KEY}` } });
  if (!r.ok) throw new Error(`Finnhub ${r.status}`);
  return r.json();
}

export const getQuote = (symbol: string) =>
  finnhubGet("quote", { symbol });

export const getCandlesByCount = (symbol: string, resolution: "D" | "60" | "15", count: number) => {
  // last N bars by time range
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  const span = resolution === "D" ? count * day : count * 60 * Number(resolution);
  return finnhubGet("stock/candle", {
    symbol,
    resolution,
    from: now - span,
    to: now,
  });
};
