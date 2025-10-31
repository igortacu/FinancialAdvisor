// supabase/functions/finnhub-proxy/index.ts
// Deno Deploy / Supabase Edge Function
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get(k: string): string | undefined };
};

function corsify(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(res.body, { status: res.status, headers: h });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return corsify(new Response(null, { status: 204 }));

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "quote";

  // Build query string for Finnhub (copy all params except "path" and "token")
  const entries = [...url.searchParams].filter(([k]) => k !== "path" && k !== "token");
  const qs = new URLSearchParams(entries).toString();

  // Allow overriding the FINNHUB key via query param `token` for debugging/local dev.
  // In production prefer setting FINNHUB_KEY as an environment variable in Supabase.
  const tokenParam = url.searchParams.get("token");
  const FINNHUB_KEY = tokenParam ?? Deno.env.get("FINNHUB_KEY");
  if (!FINNHUB_KEY) {
    return corsify(new Response(JSON.stringify({ error: "Missing FINNHUB_KEY (set env var or pass ?token=...)" }), { status: 500, headers: { "content-type": "application/json" } }));
  }

  const upstream = `https://finnhub.io/api/v1/${path}?${qs}`;
  // Forward request to Finnhub with token in header (preferred).
  // Add simple error context to help debugging 401/403 responses.
  let r: Response;
  try {
    r = await fetch(upstream, {
      headers: {
        "X-Finnhub-Token": FINNHUB_KEY,
      },
    });
  }
  catch (err) {
    // Network-level error
    return corsify(new Response(JSON.stringify({ error: "Upstream fetch failed", detail: String(err) }), { status: 502, headers: { "content-type": "application/json" } }));
  }

  const body = await r.text();
  // If Finnhub returned 401/403, include upstream body for debugging (may contain JSON error).
  if (r.status === 401 || r.status === 403) {
    return corsify(new Response(JSON.stringify({ error: "Upstream authentication/permission error", status: r.status, upstream: body }), { status: r.status, headers: { "content-type": "application/json" } }));
  }

  return corsify(new Response(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  }));
});
