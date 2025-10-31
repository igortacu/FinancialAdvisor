export type AnalyzeRequest = {
  user_id?: string | number | null;
  merchant?: string | null;
  amount: number; // signed; negative = expense
  currency?: string;
  date_iso?: string | null;
  meta?: any;
};

export type Risk = {
  flag: boolean;
  level: "low" | "medium" | "high";
  reasons: string[];
};

export type AnalyzeResponse = {
  category: string;
  risk: Risk;
  advice: string[];
};

export type ForecastResponse = {
  user_id: string;
  n: number;
  values: number[];
};

const BASE =
  process.env.EXPO_PUBLIC_ML_API_URL?.replace(/\/$/, "") ||
  process.env.ML_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8090";

async function doJson<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const method = ((init?.method as string) || "GET").toUpperCase();
    const hdrs: Record<string, string> = { ...(init?.headers as any) };
    // Avoid setting Content-Type on GET/HEAD to prevent CORS preflight
    if (method !== "GET" && method !== "HEAD") {
      hdrs["Content-Type"] = hdrs["Content-Type"] || "application/json";
    }
    const res = await fetch(`${BASE}${path}`, {
      ...(init || {}),
      headers: hdrs,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`ML API ${res.status}: ${msg}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function analyzeTransaction(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  return doJson<AnalyzeResponse>(`/analyze`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getForecast(user_id: string | number, n = 6): Promise<ForecastResponse> {
  const qs = new URLSearchParams({ user_id: String(user_id), n: String(n) }).toString();
  return doJson<ForecastResponse>(`/forecast?${qs}`);
}
