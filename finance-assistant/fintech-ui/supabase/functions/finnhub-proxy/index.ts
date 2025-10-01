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

  const FINNHUB_KEY = Deno.env.get("FINNHUB_KEY");
  if (!FINNHUB_KEY) {
    return corsify(new Response(JSON.stringify({ error: "Missing FINNHUB_KEY" }), { status: 500, headers: { "content-type": "application/json" } }));
  }

  const upstream = `https://finnhub.io/api/v1/${path}?${qs}`;
  const r = await fetch(upstream, {
    headers: {
      // Finnhub accepts either header or `token=` query param. Header is cleaner.
      "X-Finnhub-Token": FINNHUB_KEY,
    },
  });

  const body = await r.text();
  return corsify(new Response(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  }));
});
