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
    detectSessionInUrl: false,
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

export const Fx = {
  async getRate(fromCurrency: string, baseCurrency: string): Promise<{ rate: number; at: string }> {
    const from = (fromCurrency || '').toUpperCase();
    const base = (baseCurrency || '').toUpperCase();
    if (!from || !base) throw new Error('Missing currency codes');
    if (from === base) return { rate: 1, at: new Date().toISOString() };

    // Try Supabase Edge Function proxy first: /fx-rate?base=FROM&quote=BASE
    if (fnProxyUrl) {
      try {
        const res = await fetch(
          `${fnProxyUrl.replace(/\/$/, '')}/fx-rate?base=${encodeURIComponent(from)}&quote=${encodeURIComponent(base)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.rate === 'number') {
            return { rate: data.rate, at: data.at ?? new Date().toISOString() };
          }
        }
      } catch {
        // fallthrough
      }
    }

    // Finnhub fallback
    if (!finnhubKey) throw new Error('Missing FINNHUB key or Function proxy for FX rates');
    const url = `https://finnhub.io/api/v1/forex/rates?base=${encodeURIComponent(from)}&token=${finnhubKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to fetch FX rates from Finnhub');
    const j = await r.json() as any;
    const rate = j?.quote?.[base];
    const at = typeof j?.timestamp === 'number'
      ? new Date(j.timestamp * 1000).toISOString()
      : new Date().toISOString();
    if (typeof rate !== 'number') throw new Error(`Missing FX rate ${from}->${base}`);
    return { rate, at };
  },

  async normalizeAmount(amount: number, fromCurrency: string, baseCurrency: string): Promise<NormalizeResult> {
    const { rate, at } = await this.getRate(fromCurrency, baseCurrency);
    // Do not round here; preserve cents
    return { normalized: amount * rate, rate, at };
  },

  // Helper to insert a transaction row that keeps original + normalized fields
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
