// Deno Deploy
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FINNHUB = Deno.env.get("FINNHUB_TOKEN") ?? "";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "quote";
    const qs = url.searchParams.get("qs") ?? "";

    if (!FINNHUB) {
      return new Response("Missing FINNHUB_TOKEN", { status: 500 });
    }

    // Forward to Finnhub with server-side token
    const upstream = `https://finnhub.io/api/v1/${path}${qs ? "?" + qs : ""}`;
    const resp = await fetch(upstream, {
      headers: { "X-Finnhub-Token": FINNHUB },
    });

    const headers = new Headers(resp.headers);
    headers.set("access-control-allow-origin", "*");
    headers.set("cache-control", "public, max-age=60");

    return new Response(await resp.arrayBuffer(), {
      status: resp.status,
      headers,
    });
  } catch (e) {
    return new Response(`Proxy error: ${e?.message ?? "unknown"}`, {
      status: 500,
    });
  }
});
