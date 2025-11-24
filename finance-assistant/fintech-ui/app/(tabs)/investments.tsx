import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import {
  VictoryPie,
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryContainer,
  VictoryBar,
  VictoryArea,
  ChartsReady,
  VictoryLabel,
  VictoryLegend,
} from "@/lib/charts";

/* ================== Chart Theme ================== */
// Modern, vibrant color palette for charts
const CHART_COLORS = {
  // Primary gradient palette - vibrant and modern
  primary: "#6366F1", // Indigo
  primaryLight: "#818CF8",
  primaryDark: "#4F46E5",
  
  // Accent colors for variety
  accent1: "#8B5CF6", // Violet
  accent2: "#EC4899", // Pink
  accent3: "#F59E0B", // Amber
  accent4: "#10B981", // Emerald
  accent5: "#06B6D4", // Cyan
  accent6: "#F43F5E", // Rose
  
  // Semantic colors
  positive: "#10B981", // Emerald green
  positiveLight: "#34D399",
  negative: "#EF4444", // Red
  negativeLight: "#F87171",
  
  // Neutral colors
  neutral: "#64748B", // Slate
  neutralLight: "#94A3B8",
  neutralDark: "#475569",
  
  // Chart specific
  grid: "#E2E8F0",
  axis: "#94A3B8",
  background: "#F8FAFC",
};

// Pie chart color scale - harmonious gradient
const PIE_COLORS = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#F43F5E", // Rose
];

// Axis style presets
const axisStyle = {
  axis: { stroke: CHART_COLORS.neutralLight, strokeWidth: 1 },
  grid: { stroke: CHART_COLORS.grid, strokeWidth: 1, strokeDasharray: "4,4" },
  tickLabels: { 
    fontSize: 10, 
    fontWeight: "500" as const,
    fill: CHART_COLORS.neutralDark,
    padding: 4,
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    fill: CHART_COLORS.neutral,
  },
};

const axisStyleClean = {
  axis: { stroke: "transparent" },
  grid: { stroke: CHART_COLORS.grid, strokeWidth: 1, strokeDasharray: "4,4" },
  tickLabels: { 
    fontSize: 10, 
    fontWeight: "500" as const,
    fill: CHART_COLORS.neutralDark,
    padding: 4,
  },
};

/* ================== Types ================== */
type Holding = {
  id: number | string;
  symbol: string;
  name?: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  sector?: string;
};
type Dividend = { id: string; symbol: string; date: string; amount: number };
type Point = { x: number | string; y: number };
type PieChartDatum = { x: string; y: number };
type BarChartDatum = { x: string; y: number };

/* ================== Config ================== */
// Public values only. Server secret stays in Edge Function.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

/* ================== Mock Portfolio ================== */
// Your simulated portfolio - these are your "purchased" positions
// The app will fetch real-time prices to update current_price
const MOCK_HOLDINGS: Holding[] = [
  { id: 1, symbol: "AAPL", name: "Apple Inc.", quantity: 12, avg_price: 178.50, current_price: 178.50, sector: "Tech" },
  { id: 2, symbol: "MSFT", name: "Microsoft Corp.", quantity: 8, avg_price: 378.25, current_price: 378.25, sector: "Tech" },
  { id: 3, symbol: "VOO", name: "Vanguard S&P 500 ETF", quantity: 5, avg_price: 485.00, current_price: 485.00, sector: "ETF" },
  { id: 4, symbol: "TSLA", name: "Tesla Inc.", quantity: 6, avg_price: 242.80, current_price: 242.80, sector: "Auto" },
  { id: 5, symbol: "NVDA", name: "NVIDIA Corp.", quantity: 4, avg_price: 875.00, current_price: 875.00, sector: "Tech" },
  { id: 6, symbol: "GOOGL", name: "Alphabet Inc.", quantity: 3, avg_price: 165.40, current_price: 165.40, sector: "Tech" },
  { id: 7, symbol: "CASH", name: "Cash Reserve", quantity: 2500, avg_price: 1, current_price: 1, sector: "Cash" },
];

const MOCK_DIVIDENDS: Dividend[] = [
  { id: "d1", symbol: "AAPL", date: "2025-12-05", amount: 2.88 },
  { id: "d2", symbol: "VOO", date: "2025-12-15", amount: 11.50 },
  { id: "d3", symbol: "MSFT", date: "2025-12-20", amount: 5.60 },
];

/* ================== Utils ================== */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const money = (v: number) => `$${nf.format(v)}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${nf.format(v)}%`;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function drawdownSeries(values: number[]): Point[] {
  if (!values.length) return [{ x: 1, y: 0 }];
  let peak = values[0];
  const out: Point[] = [];
  values.forEach((v, i) => {
    if (v > peak) peak = v;
    const dd = (v / peak - 1) * 100;
    out.push({ x: i + 1, y: dd });
  });
  return out;
}

function rollingVol(values: number[], window = 30): Point[] {
  if (values.length < window + 1) return [{ x: 1, y: 0 }];
  const pts: Point[] = [];
  for (let i = window; i < values.length; i++) {
    const slice = values.slice(i - window, i + 1);
    const rets: number[] = [];
    for (let j = 1; j < slice.length; j++) {
      const r = (slice[j] - slice[j - 1]) / slice[j - 1];
      rets.push(r);
    }
    const avg = sum(rets) / rets.length;
    const variance = sum(rets.map((r) => (r - avg) ** 2)) / rets.length;
    const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
    pts.push({ x: i + 1, y: vol });
  }
  return pts;
}

/* ================== Market Data (Yahoo Finance via Proxy) ================== */
// Uses Supabase Edge Function proxy to avoid CORS issues on web

const USE_PROXY = Platform.OS === "web" || Boolean(SUPABASE_URL);

type YahooQuoteResult = {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
};

type QuoteData = {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
};

// Parse Yahoo Finance quote response
function parseQuoteResponse(data: { quoteResponse?: { result?: YahooQuoteResult[] } }): Record<string, QuoteData> {
  const quotes = data?.quoteResponse?.result ?? [];
  const result: Record<string, QuoteData> = {};
  
  for (const q of quotes as YahooQuoteResult[]) {
    if (q.symbol && typeof q.regularMarketPrice === "number") {
      result[q.symbol] = {
        price: q.regularMarketPrice,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
      };
    }
  }
  return result;
}

// Parse Yahoo Finance chart response
function parseChartResponse(data: { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> } }): number[] {
  const chartData = data?.chart?.result?.[0];
  if (!chartData) return [];
  
  const closes = chartData.indicators?.quote?.[0]?.close ?? [];
  return closes.filter((v: unknown): v is number => 
    typeof v === "number" && Number.isFinite(v) && v > 0
  );
}

async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};
  
  try {
    let url: string;
    let headers: HeadersInit = {};
    
    if (USE_PROXY && SUPABASE_URL) {
      // Use Supabase Edge Function proxy (avoids CORS on web)
      url = `${SUPABASE_URL}/functions/v1/yahoo-finance-proxy?action=quote&symbols=${symbols.join(",")}`;
      // Don't send custom headers to proxy - CORS won't allow them
    } else {
      // Direct API call (works on mobile)
      url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols.join(",")}`;
      headers = { "User-Agent": "Mozilla/5.0" };
    }
    
    const r = await fetch(url, { headers });
    
    if (!r.ok) {
      console.warn(`Yahoo quotes failed: ${r.status}`);
      return {};
    }
    
    const data = await r.json();
    
    // Proxy returns { quotes: { AAPL: {...}, ... } }
    // Direct API returns { quoteResponse: { result: [...] } }
    if (data.quotes) {
      // Proxy response format
      const result: Record<string, QuoteData> = {};
      for (const [symbol, info] of Object.entries(data.quotes)) {
        const q = info as QuoteData;
        if (q.price) {
          result[symbol] = q;
        }
      }
      return result;
    }
    
    return parseQuoteResponse(data);
  } catch (e) {
    console.error("fetchYahooQuotes error:", e);
    return {};
  }
}

async function fetchYahooChart(symbol: string, range = "1y", interval = "1d"): Promise<number[]> {
  try {
    let url: string;
    let headers: HeadersInit = {};
    
    if (USE_PROXY && SUPABASE_URL) {
      // Use Supabase Edge Function proxy
      url = `${SUPABASE_URL}/functions/v1/yahoo-finance-proxy?action=chart&symbols=${symbol}&range=${range}&interval=${interval}`;
      // Don't send custom headers to proxy - CORS won't allow them
    } else {
      // Direct API call
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
      headers = { "User-Agent": "Mozilla/5.0" };
    }
    
    const r = await fetch(url, { headers });
    
    if (!r.ok) {
      console.warn(`Yahoo chart failed for ${symbol}: ${r.status}`);
      return [];
    }
    
    const data = await r.json();
    
    // Proxy returns { prices: [...] }
    // Direct API returns { chart: { result: [...] } }
    if (Array.isArray(data.prices)) {
      return data.prices.filter((v: unknown): v is number => 
        typeof v === "number" && Number.isFinite(v) && v > 0
      );
    }
    
    return parseChartResponse(data);
  } catch (e) {
    console.error("fetchYahooChart error:", e);
    return [];
  }
}


/* ================== Screen ================== */
export default function Investments(): React.ReactElement {
  const insets = useSafeAreaInsets();

  const [holdings, setHoldings] = React.useState<Holding[]>(MOCK_HOLDINGS);
  const [quoteData, setQuoteData] = React.useState<Record<string, QuoteData>>({});
  const [spy, setSpy] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Load real-time market data
  const loadMarketData = React.useCallback(async () => {
    try {
      // Get symbols from mock portfolio (excluding CASH)
      const symbols = MOCK_HOLDINGS.filter((h) => h.symbol !== "CASH").map((h) => h.symbol);
      
      // Fetch real-time quotes from Yahoo Finance
      const quotes = await fetchYahooQuotes(symbols);
      setQuoteData(quotes);
      
      // Update holdings with real prices
      const updatedHoldings = MOCK_HOLDINGS.map((h) => {
        if (h.symbol === "CASH") return h;
        const quote = quotes[h.symbol];
        if (quote) {
          return { ...h, current_price: quote.price };
        }
        return h;
      });
      setHoldings(updatedHoldings);
      
      // Fetch SPY historical data for benchmark charts
      const spyData = await fetchYahooChart("SPY", "1y", "1d");
      if (spyData.length > 0) {
        setSpy(spyData);
      }
      
      setErr(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load market data";
      setErr(msg);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      await loadMarketData();
      if (!cancelled) {
        setLoading(false);
      }
    };

    loadData();

    // Refresh prices every 30 seconds
    const interval = setInterval(() => {
      if (!cancelled) {
        loadMarketData();
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadMarketData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
  }, [loadMarketData]);

  /* ===== Derived metrics ===== */
  const derived = React.useMemo(() => {
    const totalValue = sum(holdings.map((h) => h.quantity * h.current_price));
    const nonCash = holdings.filter((h) => h.symbol !== "CASH");
    const cashHolding = holdings.find((h) => h.symbol === "CASH");
    const cashValue = cashHolding ? cashHolding.quantity * cashHolding.current_price : 0;
    
    const totalCost = sum(nonCash.map((h) => h.quantity * h.avg_price)) + cashValue;
    const totalPL = totalValue - totalCost;
    
    // Calculate actual day P/L using previous close from Yahoo data
    const dayPL = sum(
      nonCash.map((h) => {
        const quote = quoteData[h.symbol];
        if (quote) {
          // Day change = (current price - previous close) * quantity
          return h.quantity * (quote.price - quote.previousClose);
        }
        return 0;
      })
    );

    const weights = holdings
      .map((h) => ({
        symbol: h.symbol,
        name: h.name ?? h.symbol,
        value: h.quantity * h.current_price,
        weight: totalValue > 0 ? (h.quantity * h.current_price) / totalValue : 0,
        sector: h.sector ?? "Other",
        pnl: h.quantity * (h.current_price - h.avg_price),
      }))
      .sort((a, b) => b.weight - a.weight);
    const topWeight = weights[0]?.weight ?? 0;

    const allocMap: Record<string, number> = {};
    weights.forEach((w) => {
      allocMap[w.sector] = (allocMap[w.sector] ?? 0) + w.weight;
    });

    const weightBars = weights
      .filter((w) => w.symbol !== "CASH")
      .map((w) => ({ x: w.symbol, y: Math.round(w.weight * 10000) / 100 }));

    const pnlBars = weights
      .filter((w) => w.symbol !== "CASH")
      .map((w) => ({ x: w.symbol, y: w.pnl }));

    const allocPie =
      Object.entries(allocMap).map(([k, w]) => ({
        x: k,
        y: Math.round(w * 10000) / 100,
      })) || [{ x: "Unclassified", y: 100 }];

    const spyDD = drawdownSeries(spy);
    const spyVol = rollingVol(spy, 30);
    const benchYtd = spy.length > 1 ? (spy.at(-1)! / spy[0] - 1) * 100 : 0;

    return {
      totalValue,
      totalPL,
      dayPL,
      topWeight,
      weightBars,
      pnlBars,
      allocPie,
      spyDD,
      spyVol,
      benchYtd,
    };
  }, [holdings, spy, quoteData]);

  /* ===== UI ===== */
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          accessibilityLabel="Pull to refresh investments"
        />
      }
    >
      {/* Snapshot */}
      <Animated.View entering={FadeInUp.duration(320)}>
        <Card>
          <View style={s.chartHeader}>
            <Text style={s.h1} accessibilityRole="header">Portfolio Snapshot</Text>
            <View style={[s.chartBadge, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[s.chartBadgeText, { color: CHART_COLORS.positive }]}>Live</Text>
            </View>
          </View>
          <View style={s.kpiRow} accessibilityRole="summary">
            <View style={s.kpi} accessibilityLabel={`Portfolio value: ${money(derived.totalValue)}`}>
              <Text style={s.kpiLabel}>Value</Text>
              <Text style={s.kpiValue}>{money(derived.totalValue)}</Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Day profit or loss: ${money(derived.dayPL)}`}>
              <Text style={s.kpiLabel}>Day P/L</Text>
              <Text style={[s.kpiValue, { color: derived.dayPL >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                {derived.dayPL >= 0 ? "+" : ""}{money(derived.dayPL)}
              </Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Total profit or loss: ${money(derived.totalPL)}`}>
              <Text style={s.kpiLabel}>Total P/L</Text>
              <Text style={[s.kpiValue, { color: derived.totalPL >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                {derived.totalPL >= 0 ? "+" : ""}{money(derived.totalPL)}
              </Text>
            </View>
          </View>
          <View style={s.kpiRow}>
            <View style={s.kpi} accessibilityLabel={`Benchmark SPY year to date: ${pct(derived.benchYtd)}`}>
              <Text style={s.kpiLabel}>Benchmark (SPY YTD)</Text>
              <Text style={[s.kpiValue, { color: derived.benchYtd >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                {derived.benchYtd >= 0 ? "+" : ""}{pct(derived.benchYtd)}
              </Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Top holding weight: ${nf.format((derived.topWeight || 0) * 100)} percent`}>
              <Text style={s.kpiLabel}>Top Weight</Text>
              <Text style={[s.kpiValue, { color: derived.topWeight > 0.2 ? CHART_COLORS.accent3 : CHART_COLORS.neutralDark }]}>
                {nf.format((derived.topWeight || 0) * 100)}%
              </Text>
            </View>
          </View>
          {derived.topWeight > 0.2 && (
            <View style={s.notice} accessibilityRole="alert">
              <Text style={s.noticeText}>
                ⚠️ Concentration risk: top position {Math.round(derived.topWeight * 100)}% of portfolio
              </Text>
            </View>
          )}
          {err && err.includes("403") && (
            <Text style={{ color: CHART_COLORS.negative, marginTop: 8, fontSize: 12 }}>
              Live candles blocked. Using fallback data.
            </Text>
          )}
        </Card>
      </Animated.View>

      {/* Allocation Pie */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Allocation</Text>
              <View style={s.chartBadge}>
                <Text style={s.chartBadgeText}>Sectors</Text>
              </View>
            </View>
            <CompactChart height={210}>
              {(w, h) => (
                <VictoryPie
                  width={w}
                  height={h}
                  innerRadius={62}
                  padAngle={3}
                  cornerRadius={6}
                  labelRadius={90}
                  animate={{ duration: 800, easing: "backOut" }}
                  data={derived.allocPie.length ? derived.allocPie : [{ x: "Unclassified", y: 100 }]}
                  colorScale={PIE_COLORS}
                  labels={({ datum }: { datum: PieChartDatum }) => `${datum.x}\n${nf.format(datum.y)}%`}
                  style={{ 
                    labels: { 
                      fontSize: 10, 
                      fontWeight: "600",
                      fill: CHART_COLORS.neutralDark,
                    },
                    data: {
                      stroke: "#fff",
                      strokeWidth: 2,
                    }
                  }}
                />
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* Weights per holding */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(80).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Weights</Text>
              <View style={s.chartBadge}>
                <Text style={s.chartBadgeText}>By Holding</Text>
              </View>
            </View>
            <CompactChart height={220}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 52, right: 16, top: 16, bottom: 36 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600, easing: "backOut" }}
                  domainPadding={{ x: 20 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${t}%`}
                    style={axisStyleClean}
                  />
                  <VictoryAxis 
                    style={{
                      ...axisStyleClean,
                      tickLabels: { 
                        ...axisStyleClean.tickLabels, 
                        fontSize: 11,
                        fontWeight: "600" as const,
                        angle: -15,
                      }
                    }} 
                  />
                  <VictoryBar
                    data={derived.weightBars.length ? derived.weightBars : [{ x: "N/A", y: 0 }]}
                    cornerRadius={{ top: 6 }}
                    barRatio={0.65}
                    style={{ 
                      data: { 
                        fill: CHART_COLORS.primary,
                        fillOpacity: 0.9,
                      } 
                    }}
                  />
                </VictoryChart>
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* P/L contribution */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(120).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Profit / Loss</Text>
              <View style={[s.chartBadge, { backgroundColor: derived.totalPL >= 0 ? "#ECFDF5" : "#FEF2F2" }]}>
                <Text style={[s.chartBadgeText, { color: derived.totalPL >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                  {derived.totalPL >= 0 ? "▲" : "▼"} {money(Math.abs(derived.totalPL))}
                </Text>
              </View>
            </View>
            <CompactChart height={220}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 56, right: 16, top: 16, bottom: 36 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600, easing: "backOut" }}
                  domainPadding={{ x: 20 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => money(t)}
                    style={axisStyleClean}
                  />
                  <VictoryAxis 
                    style={{
                      ...axisStyleClean,
                      tickLabels: { 
                        ...axisStyleClean.tickLabels, 
                        fontSize: 11,
                        fontWeight: "600" as const,
                        angle: -15,
                      }
                    }} 
                  />
                  <VictoryBar
                    data={derived.pnlBars.length ? derived.pnlBars : [{ x: "N/A", y: 0 }]}
                    cornerRadius={({ datum }: { datum: BarChartDatum }) => datum.y >= 0 ? { top: 6 } : { bottom: 6 }}
                    barRatio={0.65}
                    style={{
                      data: ({ datum }: { datum: BarChartDatum }) => ({ 
                        fill: datum.y >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative,
                        fillOpacity: 0.9,
                      }),
                    }}
                  />
                </VictoryChart>
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* Benchmark drawdown */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(160).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Benchmark Drawdown</Text>
              <View style={[s.chartBadge, { backgroundColor: "#FEF2F2" }]}>
                <Text style={[s.chartBadgeText, { color: CHART_COLORS.negative }]}>SPY YTD</Text>
              </View>
            </View>
            <CompactChart height={200}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 52, right: 16, top: 16, bottom: 32 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 700, easing: "cubicInOut" }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${t}%`}
                    style={axisStyleClean}
                  />
                  <VictoryAxis style={axisStyleClean} />
                  <VictoryArea
                    data={
                      derived.spyDD.length
                        ? derived.spyDD
                        : [
                            { x: 1, y: 0 },
                            { x: 2, y: 0 },
                          ]
                    }
                    style={{
                      data: {
                        fill: CHART_COLORS.negative,
                        fillOpacity: 0.15,
                        stroke: CHART_COLORS.negative,
                        strokeWidth: 2.5,
                        strokeLinecap: "round",
                      },
                    }}
                    interpolation="monotoneX"
                  />
                </VictoryChart>
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* Rolling volatility */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(200).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Rolling Volatility</Text>
              <View style={[s.chartBadge, { backgroundColor: "#EEF2FF" }]}>
                <Text style={[s.chartBadgeText, { color: CHART_COLORS.primary }]}>SPY · 30D</Text>
              </View>
            </View>
            <CompactChart height={200}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 52, right: 16, top: 16, bottom: 32 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 700, easing: "cubicInOut" }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${nf.format(t)}%`}
                    style={axisStyleClean}
                  />
                  <VictoryAxis style={axisStyleClean} />
                  <VictoryArea
                    data={
                      derived.spyVol.length
                        ? derived.spyVol
                        : [
                            { x: 1, y: 0 },
                            { x: 2, y: 0 },
                          ]
                    }
                    style={{
                      data: {
                        fill: CHART_COLORS.accent1,
                        fillOpacity: 0.2,
                        stroke: CHART_COLORS.accent1,
                        strokeWidth: 2.5,
                        strokeLinecap: "round",
                      },
                    }}
                    interpolation="monotoneX"
                  />
                </VictoryChart>
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* Positions (sparklines) - Real-time from portfolio */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(240).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Positions</Text>
              <View style={[s.chartBadge, { backgroundColor: "#F0FDF4" }]}>
                <Text style={[s.chartBadgeText, { color: CHART_COLORS.positive }]}>Real-time</Text>
              </View>
            </View>
            <View style={{ marginTop: 12, gap: 12 }}>
              {holdings.filter(h => h.symbol !== "CASH").map((h) => {
                const quote = quoteData[h.symbol];
                const changePercent = quote?.changePercent ?? 0;
                const isPositive = changePercent >= 0;
                // Generate mini sparkline from recent movement (simulated from change)
                const basePrice = quote?.previousClose ?? h.current_price;
                const sparkData = Array.from({ length: 16 }, (_, i) => {
                  const progress = i / 15;
                  const noise = (Math.random() - 0.5) * 0.002 * basePrice;
                  return basePrice + (h.current_price - basePrice) * progress + noise;
                });
                const sparkColor = isPositive ? CHART_COLORS.positive : CHART_COLORS.negative;
                
                return (
                  <View key={h.id} style={s.sparkRow}>
                    <View style={{ flex: 1, minWidth: 80 }}>
                      <Text style={s.sparkSymbol}>{h.symbol}</Text>
                      <View style={[s.changeChip, { backgroundColor: isPositive ? "#F0FDF4" : "#FEF2F2" }]}>
                        <Text
                          style={[
                            s.changeChipText,
                            { color: isPositive ? CHART_COLORS.positive : CHART_COLORS.negative },
                          ]}
                        >
                          {isPositive ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexBasis: 140 }}>
                      <CompactChart height={48}>
                        {(w, ht) => (
                          <VictoryChart
                            width={w}
                            height={ht}
                            padding={{ left: 4, right: 4, top: 6, bottom: 6 }}
                            containerComponent={<VictoryContainer responsive={false} />}
                          >
                            <VictoryArea
                              data={sparkData.map((y: number, i: number) => ({ x: i + 1, y }))}
                              interpolation="monotoneX"
                              style={{ 
                                data: { 
                                  fill: sparkColor,
                                  fillOpacity: 0.15,
                                  stroke: sparkColor, 
                                  strokeWidth: 2,
                                  strokeLinecap: "round",
                                } 
                              }}
                            />
                          </VictoryChart>
                        )}
                      </CompactChart>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Holdings list with live prices */}
      <Animated.View entering={FadeInUp.delay(280).duration(360)}>
        <Card>
          <View style={s.chartHeader}>
            <Text style={s.h1} accessibilityRole="header">Your Investments</Text>
            <View style={s.chartBadge}>
              <Text style={s.chartBadgeText}>{holdings.length} holdings</Text>
            </View>
          </View>
          {loading ? (
            <View style={{ paddingVertical: 16 }} accessibilityLabel="Loading investments">
              <ActivityIndicator accessibilityLabel="Loading indicator" />
            </View>
          ) : err ? (
            <>
              <Text style={{ color: "#ef4444", marginTop: 8 }} accessibilityRole="alert">{err}</Text>
              <TouchableOpacity 
                style={s.retry} 
                onPress={onRefresh}
                accessibilityLabel="Retry loading investments"
                accessibilityRole="button"
                accessibilityHint="Double tap to retry loading your investment data"
              >
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ marginTop: 8, gap: 10 }}>
              {holdings.map((h) => {
                const value = h.quantity * h.current_price;
                const pnl = h.quantity * (h.current_price - h.avg_price);
                return (
                  <View 
                    key={h.id} 
                    style={s.row}
                    accessibilityLabel={`${h.symbol}${h.name ? `, ${h.name}` : ""}. Quantity ${h.quantity} at ${money(h.avg_price)}. Value ${money(value)}. Profit or loss ${money(pnl)}`}
                    accessibilityRole="text"
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.symbol}>
                        {h.symbol}
                        {h.name ? ` · ${h.name}` : ""}
                      </Text>
                      <Text style={s.holdingDetails}>
                        Qty {h.quantity} @ {money(h.avg_price)} · Value {money(value)}
                      </Text>
                    </View>
                    <Text style={[s.pnlValue, { color: pnl >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                      {pnl >= 0 ? "+" : ""}{money(pnl)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Dividends timeline */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(320).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Dividends</Text>
              <View style={[s.chartBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[s.chartBadgeText, { color: "#D97706" }]}>Next 30–45 days</Text>
              </View>
            </View>
            <CompactChart height={200}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 52, right: 16, top: 16, bottom: 36 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600, easing: "backOut" }}
                  domainPadding={{ x: 20 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => money(t)}
                    style={axisStyleClean}
                  />
                  <VictoryAxis 
                    style={{
                      ...axisStyleClean,
                      tickLabels: { ...axisStyleClean.tickLabels, fontSize: 10 }
                    }} 
                  />
                  <VictoryBar
                    data={MOCK_DIVIDENDS.map((d) => ({ x: d.date.slice(5), y: d.amount }))}
                    cornerRadius={{ top: 5 }}
                    barRatio={0.6}
                    style={{ 
                      data: { 
                        fill: CHART_COLORS.accent3,
                        fillOpacity: 0.9,
                      } 
                    }}
                  />
                </VictoryChart>
              )}
            </CompactChart>
          </Card>
        </Animated.View>
      )}

      {/* DCA cumulative */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(360).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">DCA Cumulative</Text>
              <View style={[s.chartBadge, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[s.chartBadgeText, { color: CHART_COLORS.positive }]}>Investing</Text>
              </View>
            </View>
            <CompactChart height={200}>
              {(w, h) => {
                const seq = [200, 100, 200, 100, 200, 100, 200];
                let acc = 0;
                const series = seq.map((v, i) => {
                  acc += v;
                  return { x: i + 1, y: acc };
                });
                return (
                  <VictoryChart
                    width={w}
                    height={h}
                    padding={{ left: 52, right: 16, top: 16, bottom: 32 }}
                    containerComponent={<VictoryContainer responsive={false} />}
                    animate={{ duration: 700, easing: "cubicInOut" }}
                  >
                    <VictoryAxis
                      dependentAxis
                      tickFormat={(t: number) => money(t)}
                      style={axisStyleClean}
                    />
                    <VictoryAxis style={axisStyleClean} />
                    <VictoryArea
                      data={series}
                      interpolation="monotoneX"
                      style={{
                        data: {
                          fill: CHART_COLORS.positive,
                          fillOpacity: 0.2,
                          stroke: CHART_COLORS.positive,
                          strokeWidth: 2.5,
                          strokeLinecap: "round",
                        },
                      }}
                    />
                  </VictoryChart>
                );
              }}
            </CompactChart>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  h1: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  
  // Chart header with badge
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chartBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: CHART_COLORS.primary,
  },
  
  // Holdings row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  symbol: { fontWeight: "800", fontSize: 15, color: "#1E293B" },
  change: { marginTop: 2, fontWeight: "700" },
  
  // Sparkline rows
  sparkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFBFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sparkSymbol: { 
    fontWeight: "800", 
    fontSize: 15, 
    color: "#1E293B",
    marginBottom: 4,
  },
  changeChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changeChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  
  // Holdings details
  holdingDetails: {
    color: "#64748B",
    marginTop: 3,
    fontSize: 13,
  },
  pnlValue: {
    fontWeight: "800",
    fontSize: 15,
  },
  
  // KPI section
  kpiRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  kpi: { 
    flex: 1, 
    backgroundColor: "#FAFBFC", 
    borderRadius: 14, 
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  kpiValue: { fontSize: 18, fontWeight: "800", marginTop: 3, color: "#1E293B" },
  
  // Notice/Alert
  notice: {
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  noticeText: { color: "#C2410C", fontWeight: "700", fontSize: 13 },
  
  // Retry button
  retry: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
