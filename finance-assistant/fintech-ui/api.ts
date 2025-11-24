import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set EXPO_PUBLIC_SUPABASE_URL in your environment.');
}
if (!supabaseAnonKey) {
  throw new Error('Missing Supabase anon key. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable OAuth callback detection on web
  },
  global: {
    fetch: (url, options = {}) => {
      // Add timeout to all fetch requests (10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

// FX helpers
// Collect extras from multiple Expo sources
const extraSources = [
  Constants.expoConfig?.extra,
  (Constants as any).manifest?.extra,
  (Constants as any).manifest2?.extra,
  (Constants as any).expoGoConfig?.extra,
].filter(Boolean) as Array<Record<string, string | undefined>>;
const extra = Object.assign({}, ...extraSources);

const fnProxyUrl =
  process.env.EXPO_PUBLIC_SUPABASE_FN_PROXY_URL ??
  process.env.SUPABASE_FN_PROXY_URL ??
  extra.EXPO_PUBLIC_SUPABASE_FN_PROXY_URL ??
  extra.SUPABASE_FN_PROXY_URL;

const finnhubKey =
  process.env.EXPO_PUBLIC_FINNHUB_KEY ??
  extra.EXPO_PUBLIC_FINNHUB_KEY;

export type NormalizeResult = {
  normalized: number; // amount in base currency
  rate: number;
  at: string; // ISO
};

// 5-minute in-memory cache for FX rates
const rateCache = new Map<string, { rate: number; atISO: string; ts: number }>();

export const Fx = {
  async getRate(fromCurrency: string, baseCurrency: string): Promise<{ rate: number; at: string }> {
    const from = (fromCurrency || '').toUpperCase();
    const base = (baseCurrency || '').toUpperCase();
    if (!from || !base) throw new Error('Missing currency codes');
    if (from === base) return { rate: 1, at: new Date().toISOString() };

    const key = `${from}->${base}`;
    const nowTs = Date.now();
    const cached = rateCache.get(key);
    if (cached && nowTs - cached.ts < 5 * 60_000) {
      return { rate: cached.rate, at: cached.atISO };
    }

    const providers: Array<() => Promise<{ rate: number; at: string }>> = [];

    // 1) Supabase Edge Function proxy
    if (fnProxyUrl) {
      providers.push(async () => {
        const url = `${fnProxyUrl.replace(/\/$/, '')}/fx-rate?base=${encodeURIComponent(from)}&quote=${encodeURIComponent(base)}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error(`Function proxy HTTP ${res.status}`);
        const data = await res.json();
        const rate = typeof data?.rate === 'number' ? data.rate : undefined;
        if (!rate) throw new Error('Function proxy missing rate');
        const at = data?.at ?? new Date().toISOString();
        return { rate, at };
      });
    }

    // 2) exchangerate.host latest (no key, CORS-friendly)
    providers.push(async () => {
      const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(base)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`exchangerate.host HTTP ${res.status}`);
      const j = await res.json() as any;
      const rate = typeof j?.rates?.[base] === 'number' ? j.rates[base] : undefined;
      if (!rate) throw new Error(`exchangerate.host missing rate ${from}->${base}`);
      const at = j?.date ? new Date(j.date).toISOString() : new Date().toISOString();
      return { rate, at };
    });

    // 3) exchangerate.host convert (helps with MDL)
    providers.push(async () => {
      const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(base)}&amount=1`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`exchangerate.host/convert HTTP ${res.status}`);
      const j = await res.json() as any;
      const rate = typeof j?.info?.rate === 'number' ? j.info.rate : undefined;
      if (!rate) throw new Error(`exchangerate.host/convert missing rate ${from}->${base}`);
      const at = j?.date ? new Date(j.date).toISOString() : new Date().toISOString();
      return { rate, at };
    });

    // 4) Frankfurter (ECB)
    providers.push(async () => {
      const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(base)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
      const j = await res.json() as any;
      const rate = typeof j?.rates?.[base] === 'number' ? j.rates[base] : undefined;
      if (!rate) throw new Error(`Frankfurter missing rate ${from}->${base}`);
      const at = j?.date ? new Date(j.date).toISOString() : new Date().toISOString();
      return { rate, at };
    });

    // 5) Finnhub (keyed; last due to CORS on web)
    if (finnhubKey) {
      providers.push(async () => {
        const url = `https://finnhub.io/api/v1/forex/rates?base=${encodeURIComponent(from)}&token=${finnhubKey}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
        const j = await res.json() as any;
        const rate =
          typeof j?.quote?.[base] === 'number'
            ? j.quote[base]
            : typeof j?.rates?.[base] === 'number'
            ? j.rates[base]
            : undefined;
        if (!rate) throw new Error(`Finnhub missing rate ${from}->${base}`);
        const at =
          typeof j?.timestamp === 'number'
            ? new Date(j.timestamp * 1000).toISOString()
            : new Date().toISOString();
        return { rate, at };
      });
    }

    const errs: string[] = [];
    for (const fn of providers) {
      try {
        const out = await fn();
        rateCache.set(key, { rate: out.rate, atISO: out.at, ts: nowTs });
        return out;
      } catch (e: any) {
        errs.push(String(e?.message || e));
      }
    }

    // Offline last-resort via USD cross-rates (approximate)
    const usdPerUnit: Record<string, number> = {
      USD: 1,
      EUR: 1.08,
      GBP: 1.25,
      RON: 0.22,
      MDL: 0.056,
    };
    if (usdPerUnit[from] && usdPerUnit[base]) {
      const rate = usdPerUnit[from] / usdPerUnit[base];
      const at = new Date().toISOString();
      rateCache.set(key, { rate, atISO: at, ts: nowTs });
      return { rate, at };
    }

    throw new Error(`FX failed for ${from}->${base}. Tried ${providers.length}. Errors: ${errs.join(' | ')}`);
  },

  async normalizeAmount(amount: number, fromCurrency: string, baseCurrency: string) {
    const { rate, at } = await this.getRate(fromCurrency, baseCurrency);
    return { normalized: amount * rate, rate, at };
  },

  async insertNormalizedTransaction(row: {
    // your other transaction fields...
    user_id?: string;
    ts: string; // ISO
    merchant: string;
    // original
    amount_original: number;
    currency_original: string;
    // normalized
    amount_base: number;
    base_currency: string;
    fx_rate: number;
    fx_at: string;
    // optional metadata
    type?: string;
    notes?: string;
  }) {
    const { error } = await supabase.from('transactions').insert([row]);
    if (error) throw error;
  },
};
