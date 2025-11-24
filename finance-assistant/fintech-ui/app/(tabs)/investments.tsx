import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
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
} from "@/lib/charts";

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

/* ================== Market Data (Yahoo Finance Direct) ================== */
// Using Yahoo Finance v8 API directly - works on mobile/Expo without CORS issues

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

async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
  if (symbols.length === 0) return {};
  
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols.join(",")}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    
    if (!r.ok) {
      console.warn(`Yahoo quotes failed: ${r.status}`);
      return {};
    }
    
    const data = await r.json();
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
  } catch (e) {
    console.error("fetchYahooQuotes error:", e);
    return {};
  }
}

async function fetchYahooChart(symbol: string, range = "1y", interval = "1d"): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    
    if (!r.ok) {
      console.warn(`Yahoo chart failed for ${symbol}: ${r.status}`);
      return [];
    }
    
    const data = await r.json();
    const chartData = data?.chart?.result?.[0];
    
    if (!chartData) return [];
    
    const closes = chartData.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((v: unknown): v is number => 
      typeof v === "number" && Number.isFinite(v) && v > 0
    );
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
          <Text style={s.h1} accessibilityRole="header">Snapshot</Text>
          <View style={s.kpiRow} accessibilityRole="summary">
            <View style={s.kpi} accessibilityLabel={`Portfolio value: ${money(derived.totalValue)}`}>
              <Text style={s.kpiLabel}>Value</Text>
              <Text style={s.kpiValue}>{money(derived.totalValue)}</Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Day profit or loss: ${money(derived.dayPL)}`}>
              <Text style={s.kpiLabel}>Day P/L</Text>
              <Text style={[s.kpiValue, { color: derived.dayPL >= 0 ? "#16a34a" : "#ef4444" }]}>
                {money(derived.dayPL)}
              </Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Total profit or loss: ${money(derived.totalPL)}`}>
              <Text style={s.kpiLabel}>Total P/L</Text>
              <Text style={[s.kpiValue, { color: derived.totalPL >= 0 ? "#16a34a" : "#ef4444" }]}>
                {money(derived.totalPL)}
              </Text>
            </View>
          </View>
          <View style={[s.kpiRow, { marginTop: 8 }]}>
            <View style={s.kpi} accessibilityLabel={`Benchmark SPY year to date: ${pct(derived.benchYtd)}`}>
              <Text style={s.kpiLabel}>Benchmark (SPY YTD)</Text>
              <Text style={[s.kpiValue, { color: derived.benchYtd >= 0 ? "#16a34a" : "#ef4444" }]}>
                {pct(derived.benchYtd)}
              </Text>
            </View>
            <View style={s.kpi} accessibilityLabel={`Top holding weight: ${nf.format((derived.topWeight || 0) * 100)} percent`}>
              <Text style={s.kpiLabel}>Top Weight</Text>
              <Text style={s.kpiValue}>{nf.format((derived.topWeight || 0) * 100)}%</Text>
            </View>
          </View>
          {derived.topWeight > 0.2 && (
            <View style={s.notice} accessibilityRole="alert">
              <Text style={s.noticeText}>
                Risk: top position {Math.round(derived.topWeight * 100)}% of portfolio.
              </Text>
            </View>
          )}
          {err && err.includes("403") && (
            <Text style={{ color: "#ef4444", marginTop: 8 }}>
              Live candles blocked earlier. Proxy + fallback active.
            </Text>
          )}
        </Card>
      </Animated.View>

      {/* Allocation Pie */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.duration(360)}>
          <Card>
            <Text style={s.h1} accessibilityRole="header">Allocation (sectors)</Text>
            <CompactChart height={190}>
              {(w, h) => (
                <VictoryPie
                  width={w}
                  height={h}
                  innerRadius={58}
                  padAngle={2}
                  labelRadius={h / 2 - 18}
                  animate={{ duration: 800 }}
                  data={derived.allocPie.length ? derived.allocPie : [{ x: "Unclassified", y: 100 }]}
                  colorScale={["#246BFD", "#5b76f7", "#9db7ff", "#111827", "#a78bfa", "#f59e0b", "#10b981"]}
                  labels={({ datum }: { datum: PieChartDatum }) => `${datum.x}\n${nf.format(datum.y)}%`}
                  style={{ labels: { fontSize: 10, fill: "#111827" } }}
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
            <Text style={s.h1} accessibilityRole="header">Weights by holding</Text>
            <CompactChart height={200}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${t}%`}
                    style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryBar
                    data={derived.weightBars.length ? derived.weightBars : [{ x: "N/A", y: 0 }]}
                    style={{ data: { fill: "#246BFD" } }}
                    barRatio={0.6}
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
            <Text style={s.h1} accessibilityRole="header">P/L by holding</Text>
            <CompactChart height={200}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => money(t)}
                    style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryBar
                    data={derived.pnlBars.length ? derived.pnlBars : [{ x: "N/A", y: 0 }]}
                    style={{
                      data: ({ datum }: { datum: BarChartDatum }) => ({ fill: datum.y >= 0 ? "#16a34a" : "#ef4444" }),
                    }}
                    barRatio={0.6}
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
            <Text style={s.h1} accessibilityRole="header">Benchmark drawdown (SPY YTD)</Text>
            <CompactChart height={190}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${t}%`}
                    style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryLine
                    data={
                      derived.spyDD.length
                        ? derived.spyDD
                        : [
                            { x: 1, y: 0 },
                            { x: 2, y: 0 },
                          ]
                    }
                    style={{ data: { stroke: "#ef4444", strokeWidth: 1.8 } }}
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
            <Text style={s.h1} accessibilityRole="header">Rolling volatility (SPY · 30D)</Text>
            <CompactChart height={190}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => `${nf.format(t)}%`}
                    style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
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
                        fillOpacity: 0.25,
                        fill: "#5b76f7",
                        stroke: "#5b76f7",
                        strokeWidth: 1.5,
                      },
                    }}
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
            <Text style={s.h1} accessibilityRole="header">Positions (real-time)</Text>
            <View style={{ marginTop: 8, gap: 10 }}>
              {holdings.filter(h => h.symbol !== "CASH").map((h) => {
                const quote = quoteData[h.symbol];
                const changePercent = quote?.changePercent ?? 0;
                // Generate mini sparkline from recent movement (simulated from change)
                const basePrice = quote?.previousClose ?? h.current_price;
                const sparkData = Array.from({ length: 12 }, (_, i) => {
                  const progress = i / 11;
                  const noise = (Math.random() - 0.5) * 0.002 * basePrice;
                  return basePrice + (h.current_price - basePrice) * progress + noise;
                });
                
                return (
                  <View key={h.id} style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.symbol}>{h.symbol}</Text>
                      <Text
                        style={[
                          s.change,
                          { color: changePercent >= 0 ? "#16a34a" : "#ef4444" },
                        ]}
                      >
                        {changePercent >= 0 ? "+" : ""}
                        {nf.format(changePercent)}% today
                      </Text>
                    </View>
                    <View style={{ flexBasis: 120 }}>
                      <CompactChart height={42}>
                        {(w, ht) => (
                          <VictoryChart
                            width={w}
                            height={ht}
                            padding={{ left: 8, right: 8, top: 8, bottom: 8 }}
                            containerComponent={<VictoryContainer responsive={false} />}
                          >
                            <VictoryLine
                              data={sparkData.map((y: number, i: number) => ({ x: i + 1, y }))}
                              style={{ data: { stroke: changePercent >= 0 ? "#16a34a" : "#ef4444", strokeWidth: 1.3 } }}
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
          <Text style={s.h1} accessibilityRole="header">Your investments</Text>
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
                      <Text style={{ color: "#6B7280", marginTop: 2 }}>
                        Qty {h.quantity} @ {money(h.avg_price)} · Value {money(value)}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "800", color: pnl >= 0 ? "#16a34a" : "#ef4444" }}>
                      {money(pnl)}
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
            <Text style={s.h1} accessibilityRole="header">Dividends (next 30–45 days)</Text>
            <CompactChart height={180}>
              {(w, h) => (
                <VictoryChart
                  width={w}
                  height={h}
                  padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                  containerComponent={<VictoryContainer responsive={false} />}
                  animate={{ duration: 600 }}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => money(t)}
                    style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryBar
                    data={MOCK_DIVIDENDS.map((d) => ({ x: d.date.slice(5), y: d.amount }))}
                    style={{ data: { fill: "#246BFD" } }}
                    barRatio={0.6}
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
            <Text style={s.h1} accessibilityRole="header">DCA cumulative (mock)</Text>
            <CompactChart height={180}>
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
                    padding={{ left: 48, right: 12, top: 8, bottom: 28 }}
                    containerComponent={<VictoryContainer responsive={false} />}
                    animate={{ duration: 600 }}
                  >
                    <VictoryAxis
                      dependentAxis
                      tickFormat={(t: number) => money(t)}
                      style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }}
                    />
                    <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                    <VictoryArea
                      data={series}
                      style={{
                        data: {
                          fillOpacity: 0.25,
                          fill: "#10b981",
                          stroke: "#10b981",
                          strokeWidth: 1.6,
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
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  symbol: { fontWeight: "800", fontSize: 14 },
  change: { marginTop: 2, fontWeight: "700" },
  kpiRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  kpiLabel: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  kpiValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  notice: {
    marginTop: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 10,
  },
  noticeText: { color: "#C2410C", fontWeight: "700" },
  retry: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
