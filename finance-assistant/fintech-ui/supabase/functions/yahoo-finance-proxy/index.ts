// supabase/functions/yahoo-finance-proxy/index.ts
// Deno Deploy / Supabase Edge Function for Yahoo Finance API
// No API key required - uses public Yahoo Finance endpoints

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get(k: string): string | undefined };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "content-type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

// Yahoo Finance endpoints
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

// Browser-like headers to avoid being blocked
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "quote";
  const symbols = url.searchParams.get("symbols") ?? "";

  if (!symbols) {
    return jsonResponse({ error: "Missing 'symbols' parameter" }, 400);
  }

  try {
    if (action === "quote") {
      // Try v7 API first (more reliable)
      const upstream = `${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,shortName,symbol`;
      
      const r = await fetch(upstream, { headers: BROWSER_HEADERS });

      if (!r.ok) {
        // Return mock data if Yahoo is blocking us
        console.error(`Yahoo API returned ${r.status}`);
        return jsonResponse({ 
          quotes: generateMockQuotes(symbols.split(",")),
          mock: true 
        });
      }

      const data = await r.json();
      const quotes = data?.quoteResponse?.result ?? [];

      if (quotes.length === 0) {
        // Return mock data if no results
        return jsonResponse({ 
          quotes: generateMockQuotes(symbols.split(",")),
          mock: true 
        });
      }

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
      const symbol = symbols.split(",")[0];
      const range = url.searchParams.get("range") ?? "1y";
      const interval = url.searchParams.get("interval") ?? "1d";

      const upstream = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
      const r = await fetch(upstream, { headers: BROWSER_HEADERS });

      if (!r.ok) {
        console.error(`Yahoo chart API returned ${r.status}`);
        return jsonResponse({ 
          prices: generateMockPrices(250),
          symbol,
          mock: true 
        });
      }

      const data = await r.json();
      const chartData = data?.chart?.result?.[0];

      if (!chartData) {
        return jsonResponse({ 
          prices: generateMockPrices(250),
          symbol,
          mock: true 
        });
      }

      const closes = chartData.indicators?.quote?.[0]?.close ?? [];
      const prices: number[] = closes.filter((v: unknown): v is number => 
        typeof v === "number" && !isNaN(v)
      );

      return jsonResponse({ symbol, range, interval, prices });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("Proxy error:", err);
    // Return mock data on any error
    if (action === "quote") {
      return jsonResponse({ 
        quotes: generateMockQuotes(symbols.split(",")),
        mock: true 
      });
    }
    return jsonResponse({ 
      prices: generateMockPrices(250),
      mock: true 
    });
  }
});

// Generate realistic mock quote data
function generateMockQuotes(symbols: string[]): Record<string, { price: number; change: number; changePercent: number; previousClose: number }> {
  const basePrices: Record<string, number> = {
    "AAPL": 234.50,
    "MSFT": 425.80,
    "GOOGL": 175.20,
    "AMZN": 198.30,
    "TSLA": 352.40,
    "NVDA": 142.50,
    "META": 567.80,
    "VOO": 545.20,
    "SPY": 595.30,
    "QQQ": 510.40,
  };

  const result: Record<string, { price: number; change: number; changePercent: number; previousClose: number }> = {};
  
  for (const symbol of symbols) {
    const basePrice = basePrices[symbol.toUpperCase()] ?? 100 + Math.random() * 200;
    const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
    const change = basePrice * (changePercent / 100);
    const previousClose = basePrice - change;
    
    result[symbol.toUpperCase()] = {
      price: Math.round(basePrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
    };
  }
  
  return result;
}

// Generate realistic mock price history
function generateMockPrices(days: number): number[] {
  const prices: number[] = [];
  let price = 500; // Starting price (like SPY)
  
  for (let i = 0; i < days; i++) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * 0.02 * price;
    price = Math.max(price + change, price * 0.5);
    prices.push(Math.round(price * 100) / 100);
  }
  
  return prices;
}
