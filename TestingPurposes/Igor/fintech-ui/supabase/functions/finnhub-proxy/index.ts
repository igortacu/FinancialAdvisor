import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FINNHUB = Deno.env.get("FINNHUB_TOKEN") ?? "";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? "finnhub"; // finnhub | stooq

  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "cache-control": "public, max-age=60",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (source === "finnhub") {
      if (!FINNHUB) return new Response("Missing FINNHUB_TOKEN", { status: 500, headers: cors });
      const path = url.searchParams.get("path") ?? "quote";
      const qs = url.searchParams.get("qs") ?? "";
      const upstream = `https://finnhub.io/api/v1/${path}${qs ? "?" + qs : ""}`;
      const resp = await fetch(upstream, { headers: { "X-Finnhub-Token": FINNHUB } });
      return new Response(await resp.arrayBuffer(), {
        status: resp.status,
        headers: { ...cors, "content-type": resp.headers.get("content-type") ?? "application/json" },
      });
    }

    if (source === "stooq") {
      const code = url.searchParams.get("code") ?? "spy.us";
      const upstream = `https://stooq.com/q/d/l/?s=${encodeURIComponent(code)}&i=d`;
      const resp = await fetch(upstream);
      const text = await resp.text();
      return new Response(text, {
        status: resp.status,
        headers: { ...cors, "content-type": "text/csv; charset=utf-8" },
      });
    }

    return new Response("Unknown source", { status: 400, headers: cors });
  } catch (e) {
    return new Response(`Proxy error: ${e?.message ?? "unknown"}`, {
      status: 500,
      headers: { "access-control-allow-origin": "*" },
    });
  }
});
