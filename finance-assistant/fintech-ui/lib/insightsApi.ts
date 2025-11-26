import { FINNHUB_KEY, getQuote, getCandlesByCount } from "@/lib/finnhub";
import { calcAlphaLens } from "@/lib/alphaLens";
import { SymbolKey, StockCardData, SparkPoint } from "@/components/insights/types";

// Simple in-memory cache
const marketCache: Record<string, { data: StockCardData; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export type Headline = { title: string; url: string };

export const mockedNews: Record<SymbolKey, Headline[]> = {
  AAPL: [{ title: "Apple hits 2025 highs on strong iPhone 17 demand.", url: "https://www.marketwatch.com/story/apples-stock-surges-to-a-2025-high-on-hot-iphone-17-demand-can-the-rally-continue-56afe428" }],
  MSFT: [{ title: "Microsoft signs $17.4B Nebius GPU deal to boost AI cloud capacity.", url: "https://www.tipranks.com/news/microsoft-msft-delivers-stock-catalyst-via-17-4b-nbis-deal" }],
  SPY: [{ title: "Traders eye SPY put spreads as hedge amid market volatility.", url: "https://seekingalpha.com/article/4825481-s-and-p-500-buy-put-spreads-before-the-tide-turns" }],
  TSLA: [{ title: "Tesla focuses on autonomy pipeline as delivery growth slows.", url: "https://www.reuters.com/markets/us/tesla-q3-outlook-autonomy-focus-2025-09-18/" }],
  GOOGL: [{ title: "Google Cloud expands AI services to compete with AWS & Azure.", url: "https://www.cnbc.com/2025/09/10/google-cloud-expands-ai-offerings.html" }],
  AMZN: [{ title: "Amazon Web Services sees strong growth in enterprise AI adoption.", url: "https://www.cnbc.com/2025/09/15/amazon-aws-ai-growth.html" }],
  META: [{ title: "Meta's Reality Labs division shows promising VR/AR revenue growth.", url: "https://www.techcrunch.com/2025/09/20/meta-reality-labs-growth.html" }],
  NVDA: [{ title: "NVIDIA's data center revenue continues to surge amid AI boom.", url: "https://www.reuters.com/technology/nvidia-data-center-ai-2025-09-22/" }],
  NFLX: [{ title: "Netflix subscriber growth accelerates with new content strategy.", url: "https://www.variety.com/2025/09/18/netflix-subscriber-growth.html" }],
};

export async function fetchMarketData(
  symbols: SymbolKey[],
  signal?: AbortSignal
): Promise<Partial<Record<SymbolKey, StockCardData>>> {
  if (!FINNHUB_KEY) {
    console.warn("FINNHUB key missing — using mock data");
    return generateMockData(symbols);
  }

  // 1. Fetch SPY candles for Alpha Lens (needed for all stocks)
  // We try to cache SPY specifically or just fetch it once per batch if possible.
  // For simplicity, we'll fetch it every time but we could cache it too.
  let spyCloses: number[] = [];
  try {
    // Check cache for SPY
    const cachedSpy = marketCache["SPY_CANDLES"];
    if (cachedSpy && Date.now() - cachedSpy.timestamp < CACHE_DURATION) {
      // We need to store spyCloses in a way we can retrieve, but StockCardData structure is different.
      // Let's just fetch it for now to keep it simple, or add a specific cache entry.
      // Actually, let's just fetch it.
    }
    
    const spyC = await getCandlesByCount("SPY", "D", 260);
    spyCloses = spyC.c ?? [];
  } catch (e) {
    console.warn("SPY candles 403, alpha metrics will degrade", e);
    spyCloses = [];
  }

  const out: Partial<Record<SymbolKey, StockCardData>> = {};

  for (const s of symbols) {
    if (signal?.aborted) break;

    // Check cache
    const cached = marketCache[s];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      out[s] = cached.data;
      continue;
    }

    try {
      const [q, c] = await Promise.all([getQuote(s), getCandlesByCount(s, "D", 260)]);
      
      const series: SparkPoint[] = (c.t ?? []).map((t: number, i: number) => ({
        x: new Date(t * 1000),
        y: c.c[i]
      }));
      
      const stats = spyCloses.length ? calcAlphaLens(c.c ?? [], spyCloses) : null;
      
      const data: StockCardData = {
        symbol: s,
        price: q.c,
        changePct: q.dp,
        series,
        stats
      };

      // Update cache
      marketCache[s] = { data, timestamp: Date.now() };
      out[s] = data;

    } catch (e) {
      // Fallback / Mock on error
      const q = await getQuote(s).catch(() => ({ c: 0, dp: 0 }));
      const mockSeries: SparkPoint[] = Array.from({ length: 30 }, (_, i) => ({
        x: new Date(Date.now() - (29 - i) * 86400000),
        y: (q.c || 100) + Math.sin(i / 3) * 2
      }));
      
      const data: StockCardData = {
        symbol: s,
        price: q.c || 0,
        changePct: q.dp || 0,
        series: mockSeries,
        stats: null
      };
      
      out[s] = data;
    }

    // Pace requests
    await new Promise((r) => setTimeout(r, 220));
  }

  return out;
}

export function getNewsForSymbol(symbol: SymbolKey): Headline[] {
  return mockedNews[symbol] || [];
}

function generateMockData(symbols: SymbolKey[]): Partial<Record<SymbolKey, StockCardData>> {
  const out: Partial<Record<SymbolKey, StockCardData>> = {};
  
  symbols.forEach(s => {
    const basePrice = Math.random() * 100 + 50;
    const mockSeries: SparkPoint[] = Array.from({ length: 30 }, (_, i) => ({
      x: new Date(Date.now() - (29 - i) * 86400000),
      y: basePrice + Math.sin(i / 3) * 10 + (Math.random() * 5)
    }));

    out[s] = {
      symbol: s,
      price: mockSeries[mockSeries.length - 1].y,
      changePct: (Math.random() * 4) - 2,
      series: mockSeries,
      stats: {
        trendScore: Math.floor(Math.random() * 5) + 1,
        volPercentile: Math.floor(Math.random() * 100),
        breakout: Math.random() > 0.5 ? "New High" : "Range",
        beta: Number((Math.random() * 1.5 + 0.5).toFixed(2)),
        idioTodayPct: Number(((Math.random() * 4) - 2).toFixed(2))
      }
    };
  });

  return out;
}
