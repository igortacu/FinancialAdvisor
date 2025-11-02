import React from "react";
import { Pressable, View, Text, StyleSheet, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryAxis, VictoryBar, VictoryLine, VictoryContainer } from "@/lib/charts";
import { supabase } from "../../api";
import { useAuth } from "@/store/auth";
import { FINNHUB_KEY, getQuote, getCandlesByCount } from "@/lib/finnhub";

// --- Types & constants ---
export type SymbolKey =
  | "AAPL" | "MSFT" | "SPY" | "TSLA" | "GOOGL" | "AMZN" | "META" | "NVDA" | "NFLX";

type Headline = { title: string; url: string };
type SparkPoint = { x: Date; y: number };
type StockCard = {
  symbol: SymbolKey;
  price: number;
  changePct: number;
  series: SparkPoint[];
  stats: AlphaLensStats | null;
};

type AlphaLensStats = {
  trendScore: number;           // 0..5
  volPercentile: number;        // 0..100
  breakout: "New High" | "Near High" | "Range" | "Near Low" | "New Low";
  beta: number;                 // vs SPY
  idioTodayPct: number;         // today move minus beta*SPY move
};

const allowedSymbols: SymbolKey[] = ["AAPL", "MSFT", "SPY", "TSLA", "GOOGL", "AMZN", "META", "NVDA", "NFLX"];

const mockedNews: Record<SymbolKey, Headline[]> = {
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

// kept from your original chart section
const fallbackMonthly = [
  { month: "Jan", needs: 1200, wants: 700, savings: 400 },
  { month: "Feb", needs: 1500, wants: 600, savings: 500 },
  { month: "Mar", needs: 1300, wants: 800, savings: 450 },
  { month: "Apr", needs: 1400, wants: 750, savings: 600 },
  { month: "May", needs: 1600, wants: 900, savings: 700 },
  { month: "Jun", needs: 1700, wants: 800, savings: 600 },
  { month: "Jul", needs: 1500, wants: 700, savings: 500 },
  { month: "Aug", needs: 1800, wants: 1000, savings: 800 },
  { month: "Sep", needs: 1600, wants: 900, savings: 700 },
];

// ---------- math helpers (strict types, no any) ----------
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  out.push(prev);
  for (let i = 1; i < values.length; i += 1) {
    const v = values[i];
    const next = v * k + prev * (1 - k);
    out.push(next);
    prev = next;
  }
  return out;
}

function returnsFromCloses(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

function percentileRank(sample: number[], value: number): number {
  if (!sample.length) return 0;
  const sorted = [...sample].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v > value);
  const rank = idx === -1 ? sorted.length : idx;
  return Math.round((rank / sorted.length) * 100);
}

function cov(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  for (let i = 0; i < n; i += 1) s += (x[i] - mx) * (y[i] - my);
  return s / n;
}

function variance(x: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const m = x.reduce((a, b) => a + b, 0) / n;
  return x.reduce((a, b) => a + (b - m) * (b - m), 0) / n;
}

function calcAlphaLens(
  closes: number[],
  spyCloses: number[]
): AlphaLensStats | null {
  if (closes.length < 50 || spyCloses.length < 50) return null;

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const last = closes.length - 1;

  // Trend score: 0..5 based on EMA20 above EMA50 and slope
  const slope20 = ema20[last] - ema20[last - 5];
  const slope50 = ema50[last] - ema50[last - 5];
  let trend = 0;
  if (ema20[last] > ema50[last]) trend += 2;
  if (slope20 > 0) trend += 2;
  if (slope50 > 0) trend += 1;
  const trendScore = Math.max(0, Math.min(5, trend));

  // Volatility percentile: 60d std vs last 12 months sample (fallback to 60d window)
  const rets = returnsFromCloses(closes);
  const window = rets.slice(-60);
  const vol60 = Math.sqrt(252) * Math.sqrt(variance(window));
  const longSample = rets.length >= 240 ? rets.slice(-240) : rets;
  const rollingVols: number[] = [];
  for (let i = 60; i <= longSample.length; i += 1) {
    const sub = longSample.slice(i - 60, i);
    rollingVols.push(Math.sqrt(252) * Math.sqrt(variance(sub)));
  }
  const volPercentile = percentileRank(rollingVols, vol60);

  // Breakout status vs 60d range
  const lastClose = closes[last];
  const look = closes.slice(-60);
  const hi = Math.max(...look);
  const lo = Math.min(...look);
  const pos = (lastClose - lo) / Math.max(1e-9, hi - lo);
  const breakout: AlphaLensStats["breakout"] =
    pos >= 1 ? "New High" :
      pos >= 0.9 ? "Near High" :
        pos <= 0 ? "New Low" :
          pos <= 0.1 ? "Near Low" : "Range";

  // Beta vs SPY and idiosyncratic move today
  const symR = returnsFromCloses(closes);
  const spyR = returnsFromCloses(spyCloses);
  const n = Math.min(symR.length, spyR.length);
  const symSlice = symR.slice(-n);
  const spySlice = spyR.slice(-n);
  const b = variance(spySlice) === 0 ? 0 : cov(symSlice, spySlice) / variance(spySlice);

  const todaySym = symR[symR.length - 1] ?? 0;
  const todaySpy = spyR[spyR.length - 1] ?? 0;
  const idioTodayPct = (todaySym - b * todaySpy) * 100;

  return {
    trendScore,
    volPercentile,
    breakout,
    beta: Number(b.toFixed(2)),
    idioTodayPct: Number(idioTodayPct.toFixed(2)),
  };
}

// --------------------------------------------

export default function Insights() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedSymbols, setSelectedSymbols] = React.useState<SymbolKey[]>(["AAPL", "MSFT", "SPY"]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingSymbols, setLoadingSymbols] = React.useState(false);

  const [newsBySymbol, setNewsBySymbol] =
    React.useState<Record<SymbolKey, Headline[]>>({} as Record<SymbolKey, Headline[]>);

  const [stockMap, setStockMap] =
    React.useState<Partial<Record<SymbolKey, StockCard>>>({});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingMarket, setLoadingMarket] = React.useState(false);

  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const handleMonthSelect = (month: string) => { setSelectedMonth(month); setDropdownOpen(false); };

  // load symbols from user investments
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSymbols(true);
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from("investments")
          .select("type")
          .eq("user_id", user.id);
        if (!error && Array.isArray(data) && data.length) {
          const unique = Array.from(
            new Set(
              (data as { type: string }[])
                .map((r) => String(r.type).trim())
                .filter(Boolean)
            )
          ).slice(0, 3);
          const filtered = unique.filter((s): s is SymbolKey =>
            (allowedSymbols as string[]).includes(s)
          );
          if (filtered.length && mounted) setSelectedSymbols(filtered);
        }
      } finally {
        if (mounted) setLoadingSymbols(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // headlines
  React.useEffect(() => {
    const map: Record<SymbolKey, Headline[]> = {} as Record<SymbolKey, Headline[]>;
    selectedSymbols.forEach((s) => { map[s] = mockedNews[s] || []; });
    setNewsBySymbol(map);
  }, [selectedSymbols]);

  // market data from Finnhub + SPY for beta/idio
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedSymbols.length) return;

      // give a clear, non-crashy hint if key is missing
      if (!FINNHUB_KEY) {
        console.warn("FINNHUB key missing — set EXPO_PUBLIC_FINNHUB_KEY to enable insights");
        return;
      }

      setLoadingMarket(true);
      try {
        let spyCloses: number[] = [];
        try {
          const spyC = await getCandlesByCount("SPY", "D", 260);
          spyCloses = spyC.c ?? [];
        } catch (e) {
          console.warn("SPY candles 403, alpha metrics will degrade", e);
          spyCloses = [];
        }

        const out: Partial<Record<SymbolKey, StockCard>> = {};
        for (const s of selectedSymbols) {
          try {
            const [q, c] = await Promise.all([getQuote(s), getCandlesByCount(s, "D", 260)]);
            const series: SparkPoint[] =
              (c.t ?? []).map((t: number, i: number) => ({ x: new Date(t * 1000), y: c.c[i] }));
            const stats = spyCloses.length ? calcAlphaLens(c.c ?? [], spyCloses) : null;
            out[s] = { symbol: s as SymbolKey, price: q.c, changePct: q.dp, series, stats };
          } catch {
            // 403 or other: show price, hide stats, mock a short series so card looks alive
            const q = await getQuote(s);
            const mockSeries: SparkPoint[] = Array.from({ length: 30 }, (_, i) => ({
              x: new Date(Date.now() - (29 - i) * 86400000),
              y: q.c + Math.sin(i / 3) * 2
            }));
            out[s] = { symbol: s as SymbolKey, price: q.c, changePct: q.dp, series: mockSeries, stats: null };
          }
          // pace requests to be gentle on free tier
          await new Promise((r) => setTimeout(r, 220));
        }

        if (alive) setStockMap(out);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoadingMarket(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedSymbols]);

  // UI helpers
  const handleSymbolSelect = (symbol: SymbolKey) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) return prev.filter(s => s !== symbol);
      if (prev.length >= 3) return [symbol, ...prev.slice(0, 2)];
      return [symbol, ...prev];
    });
  };

  const monthlyMix = fallbackMonthly;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chartData = React.useMemo(() => {
    if (selectedMonth === "All") {
      const transformed: { month: string; category: string; amount: number; color: string }[] = [];
      monthlyMix.forEach(m => {
        transformed.push(
          { month: m.month, category: "Needs", amount: m.needs, color: "#EF4444" },
          { month: m.month, category: "Wants", amount: m.wants, color: "#F59E0B" },
          { month: m.month, category: "Savings", amount: m.savings, color: "#10B981" }
        );
      });
      return transformed;
    }
    const m = monthlyMix.find(x => x.month === selectedMonth);
    if (!m) return [];
    return [
      { month: m.month, category: "Needs", amount: m.needs, color: "#EF4444" },
      { month: m.month, category: "Wants", amount: m.wants, color: "#F59E0B" },
      { month: m.month, category: "Savings", amount: m.savings, color: "#10B981" }
    ];
  }, [selectedMonth, monthlyMix]);

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Stock Selection */}
      <Animated.View entering={FadeInUp.duration(340)}>
        <Card>
          <Text style={s.h1}>Select Stocks to Track</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {allowedSymbols.map((symbol) => (
              <Pressable
                key={symbol}
                onPress={() => handleSymbolSelect(symbol)}
                style={[
                  s.symbolSelector,
                  selectedSymbols.includes(symbol) && s.symbolSelectorActive
                ]}
              >
                <Text style={[
                  s.symbolSelectorText,
                  selectedSymbols.includes(symbol) && s.symbolSelectorTextActive
                ]}>
                  {symbol}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </Animated.View>

      {/* Market Overview + Alpha Lens */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <Text style={[s.h1, { marginBottom: 12 }]}>Market Overview</Text>
        <View style={s.stockCardsContainer}>
          {selectedSymbols.map((symbol, index) => {
            const card = stockMap[symbol];
            const colors = [
              { bg: "#FFB020", accent: "#FF8C00" },
              { bg: "#A855F7", accent: "#7C3AED" },
              { bg: "#1F2937", accent: "#374151" }
            ];
            const color = colors[index] || colors[0];

            return (
              <View key={symbol} style={[s.stockCard, { backgroundColor: color.bg }]}>
                {/* Header */}
                <View style={s.stockCardHeader}>
                  <Text style={s.stockCardTitle}>{symbol}</Text>
                  <Text style={s.stockCardSubtitle}>
                    {card ? `${card.changePct >= 0 ? "+" : ""}${card.changePct.toFixed(2)}%` : "…"}
                  </Text>
                </View>

                {/* Price */}
                <Text style={s.stockCardPrice}>
                  {card ? `$${card.price.toFixed(2)}` : "—"}
                </Text>

                {/* Sparkline */}
                <View style={s.miniChartContainer}>
                  <CompactChart height={200}>
                    {(w, h) => (
                      <VictoryChart
                        width={w || 300}
                        height={h || 200}
                        padding={{ left: 40, right: 10, top: 12, bottom: 26 }}
                        containerComponent={<VictoryContainer responsive={false} />}
                      >
                        {/* Hide axis labels for compact sparkline look (restore old visual) */}
                        <VictoryAxis
                          dependentAxis
                          tickFormat={() => ""}
                          style={{ grid: { stroke: "#EEE" }, tickLabels: { fill: "transparent" }, axis: { stroke: "#EEE" } }}
                        />
                        <VictoryAxis
                          tickFormat={() => ""}
                          style={{ tickLabels: { fill: "transparent" }, axis: { stroke: "#EEE" } }}
                        />
                        <VictoryLine
                          data={(card?.series ?? []).slice(-60)}
                          x="x"
                          y="y"
                        />
                      </VictoryChart>
                    )}
                  </CompactChart>
                </View>

                {/* Alpha Lens */}
                <View style={s.alphaBox}>
                  <Text style={s.alphaTitle}>Alpha Lens</Text>
                  {card?.stats ? (
                    <View style={s.alphaGrid}>
                      <View style={s.alphaCell}>
                        <Text style={s.alphaKey}>Trend</Text>
                        <Text style={s.alphaVal}>{card.stats.trendScore}/5</Text>
                      </View>
                      <View style={s.alphaCell}>
                        <Text style={s.alphaKey}>Vol %</Text>
                        <Text style={s.alphaVal}>{card.stats.volPercentile}</Text>
                      </View>
                      <View style={s.alphaCell}>
                        <Text style={s.alphaKey}>Breakout</Text>
                        <Text style={s.alphaVal}>{card.stats.breakout}</Text>
                      </View>
                      <View style={s.alphaCell}>
                        <Text style={s.alphaKey}>Beta</Text>
                        <Text style={s.alphaVal}>{card.stats.beta}</Text>
                      </View>
                      <View style={s.alphaCell}>
                        <Text style={s.alphaKey}>Idio Today</Text>
                        <Text style={s.alphaVal}>
                          {card.stats.idioTodayPct >= 0 ? "+" : ""}
                          {card.stats.idioTodayPct}%
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={s.alphaLoading}>Loading…</Text>
                  )}
                </View>

                {/* View More */}
                <Pressable
                  style={s.viewMoreButton}
                  onPress={() => {
                    const news = newsBySymbol[symbol];
                    if (news && news.length > 0) Linking.openURL(news[0].url);
                  }}
                >
                  <Text style={s.viewMoreText}>Top Headline</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Keep your grouped bar sample (optional visual) */}
      <Animated.View entering={FadeInUp.duration(380)}>
        <Card>
          <View style={s.sectionHeader}>
            <Text style={s.h1}>Monthly Mix (sample)</Text>
            <View style={s.dropdownContainer}>
              <Pressable onPress={toggleDropdown} style={s.dropdownButton}>
                <Text style={s.dropdownButtonText}>{selectedMonth}</Text>
                <Text style={s.dropdownArrow}>▾</Text>
              </Pressable>
              {dropdownOpen && (
                <View style={s.dropdownList}>
                  {["All", ...fallbackMonthly.map(m => m.month)].map((m) => (
                    <Pressable key={m} onPress={() => handleMonthSelect(m)} style={s.dropdownItem}>
                      <Text style={[
                        s.dropdownItemText,
                        selectedMonth === m && s.dropdownItemTextActive
                      ]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <CompactChart height={220}>
            {(w, h) => (
              <VictoryChart
                width={w || 340}
                height={h || 220}
                padding={{ left: 40, right: 10, top: 12, bottom: 30 }}
                containerComponent={<VictoryContainer responsive={false} />}
              >
                <VictoryAxis />
                <VictoryAxis dependentAxis />
                <VictoryBar
                  data={fallbackMonthly}
                  x="month"
                  y="needs"
                />
              </VictoryChart>
            )}
          </CompactChart>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },

  symbolSelector: {
    backgroundColor: "#EEF4FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent"
  },
  symbolSelectorActive: {
    backgroundColor: "#246BFD",
    borderColor: "#1E40AF"
  },
  symbolSelectorText: { color: "#1f2937", fontWeight: "700", fontSize: 12 },
  symbolSelectorTextActive: { color: "#FFFFFF" },

  stockCardsContainer: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  stockCard: { flex: 1, minWidth: 110, maxWidth: "31%", borderRadius: 16, padding: 12, minHeight: 260 },
  stockCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  stockCardTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  stockCardSubtitle: { color: "#FFFFFF", fontWeight: "600", fontSize: 12 },
  stockCardPrice: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 8 },
  miniChartContainer: { height: 60, marginBottom: 10 },

  alphaBox: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 8, marginBottom: 8 },
  alphaTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 12, marginBottom: 6 },
  alphaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alphaCell: { backgroundColor: "rgba(0,0,0,0.15)", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  alphaKey: { color: "#E5E7EB", fontSize: 10, fontWeight: "700" },
  alphaVal: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  alphaLoading: { color: "#FFFFFF", fontSize: 12 },

  viewMoreButton: { alignItems: "center", paddingVertical: 6 },
  viewMoreText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12, textDecorationLine: "underline" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 },

  dropdownContainer: { position: "relative", zIndex: 9999 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 130
  },
  dropdownButtonText: { fontSize: 14, fontWeight: "600", color: "#374151", flex: 1 },
  dropdownArrow: { fontSize: 12, color: "#6B7280", marginLeft: 8, fontWeight: "600" },
  dropdownList: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: 4,
    minWidth: 160
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  dropdownItemTextActive: { color: "#246BFD", fontWeight: "700" }
});
