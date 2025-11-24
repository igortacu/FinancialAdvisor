// supabase/functions/yahoo-finance-proxy/index.ts
// Deno Deploy / Supabase Edge Function for Yahoo Finance API
// No API key required - uses public Yahoo Finance endpoints

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

function jsonResponse(data: unknown, status = 200) {
  return corsify(
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
}

// Yahoo Finance v8 API endpoints (no key required)
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance";

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return corsify(new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "quote";
  const symbols = url.searchParams.get("symbols") ?? "";

  if (!symbols) {
    return jsonResponse({ error: "Missing 'symbols' parameter" }, 400);
  }

  try {
    if (action === "quote") {
      // Fetch real-time quotes for one or more symbols
      // Example: ?action=quote&symbols=AAPL,MSFT,TSLA
      const upstream = `${YAHOO_BASE}/quote?symbols=${encodeURIComponent(symbols)}`;
      const r = await fetch(upstream, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FinanceApp/1.0)",
        },
      });

      if (!r.ok) {
        return jsonResponse(
          { error: "Yahoo Finance quote request failed", status: r.status },
          r.status
        );
      }

      const data = await r.json();
      const quotes = data?.quoteResponse?.result ?? [];

      // Transform to simplified format
      const result: Record<string, { price: number; change: number; changePercent: number; previousClose: number }> = {};
      for (const q of quotes) {
        if (q.symbol && typeof q.regularMarketPrice === "number") {
          result[q.symbol] = {
            price: q.regularMarketPrice,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
            previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
          };
        }
      }

      return jsonResponse({ quotes: result });
    }

    if (action === "chart") {
      // Fetch historical chart data
      // Example: ?action=chart&symbols=SPY&range=1y&interval=1d
      const symbol = symbols.split(",")[0]; // Only first symbol for chart
      const range = url.searchParams.get("range") ?? "1y";
      const interval = url.searchParams.get("interval") ?? "1d";

      const upstream = `${YAHOO_BASE}/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
      const r = await fetch(upstream, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FinanceApp/1.0)",
        },
      });

      if (!r.ok) {
        return jsonResponse(
          { error: "Yahoo Finance chart request failed", status: r.status },
          r.status
        );
      }

      const data = await r.json();
      const chartData = data?.chart?.result?.[0];

      if (!chartData) {
        return jsonResponse({ error: "No chart data available" }, 404);
      }

      // Extract closing prices
      const timestamps = chartData.timestamp ?? [];
      const closes = chartData.indicators?.quote?.[0]?.close ?? [];

      // Filter out null values and return clean array
      const prices: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        if (typeof closes[i] === "number" && !isNaN(closes[i])) {
          prices.push(closes[i]);
        }
      }

      return jsonResponse({
        symbol,
        range,
        interval,
        prices,
        timestamps: timestamps.filter((_: number, i: number) => typeof closes[i] === "number"),
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse(
      { error: "Proxy request failed", detail: String(err) },
      502
    );
  }
});
