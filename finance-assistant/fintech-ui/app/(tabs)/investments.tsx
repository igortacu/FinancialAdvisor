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
import { supabase } from "../../api";
import { positions as mockSparks } from "@/constants/mock";

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
type SparkPosition = { id: string | number; name: string; change: number; data: number[] };
type PieChartDatum = { x: string; y: number };
type BarChartDatum = { x: string; y: number };
type SupabaseInvestmentRow = {
  id?: number;
  symbol?: string;
  ticker?: string;
  name?: string;
  quantity?: number;
  avg_price?: number;
  price?: number;
  sector?: string;
};

/* ================== Config ================== */
// Public values only. Server secret stays in Edge Function.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

/* ================== Mock data ================== */
const MOCK_HOLDINGS: Holding[] = [
  { id: 1, symbol: "AAPL", name: "Apple", quantity: 12, avg_price: 165, current_price: 165, sector: "Tech" },
  { id: 2, symbol: "MSFT", name: "Microsoft", quantity: 8, avg_price: 320, current_price: 320, sector: "Tech" },
  { id: 3, symbol: "VOO", name: "Vanguard S&P 500", quantity: 5, avg_price: 433, current_price: 433, sector: "ETF" },
  { id: 4, symbol: "TSLA", name: "Tesla", quantity: 6, avg_price: 195, current_price: 195, sector: "Auto" },
  { id: 5, symbol: "CASH", name: "Cash", quantity: 1, avg_price: 1, current_price: 1, sector: "Cash" },
];
const MOCK_DIVIDENDS: Dividend[] = [
  { id: "d1", symbol: "AAPL", date: "2025-10-05", amount: 2.64 },
  { id: "d2", symbol: "VOO", date: "2025-10-15", amount: 9.3 },
  { id: "d3", symbol: "MSFT", date: "2025-10-20", amount: 3.1 },
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

/* ================== Market-data proxy ================== */
const isProxyConfigured = Boolean(SUPABASE_URL);

function proxy(params: Record<string, string>) {
  if (!isProxyConfigured) {
    return Promise.reject(new Error("SUPABASE_URL not configured - using mock data"));
  }
  const base = `${SUPABASE_URL}/functions/v1/finnhub-proxy`;
  const qs = new URLSearchParams(params).toString();
  const url = `${base}?${qs}`;
  return fetch(url, { cache: "no-store", referrerPolicy: "no-referrer" });
}

async function fetchQuote(symbol: string): Promise<number | null> {
  if (!isProxyConfigured) {
    // Return null to use fallback prices from MOCK_HOLDINGS
    return null;
  }
  try {
    const r = await proxy({ source: "finnhub", path: "quote", qs: `symbol=${encodeURIComponent(symbol)}` });
    if (r.status === 401) {
      console.warn(`fetchQuote: 401 Unauthorized for ${symbol} - API key may be invalid or expired`);
      return null;
    }
    if (!r.ok) throw new Error(`Quote ${r.status}`);
    const j = await r.json();
    const price = Number(j?.c);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (e) {
    console.error("fetchQuote error", e);
    return null;
  }
}

async function fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (!isProxyConfigured) {
    // Return empty to use MOCK_HOLDINGS prices
    return {};
  }
  const out: Record<string, number> = {};
  for (const s of symbols) {
    const p = await fetchQuote(s);
    if (p != null) out[s] = p;
    await new Promise((res) => setTimeout(res, 120)); // throttle a bit
  }
  return out;
}

async function fetchCandles(symbol = "SPY"): Promise<number[]> {
  if (!isProxyConfigured) {
    return [];
  }
  try {
    const to = Math.floor(Date.now() / 1000) - 60;
    const from = to - 220 * 86400;
    const qs = `symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`;
    const r = await proxy({ source: "finnhub", path: "stock/candle", qs });
    if (r.status === 401) {
      console.warn(`fetchCandles: 401 Unauthorized for ${symbol} - API key may be invalid or expired`);
      return [];
    }
    if (!r.ok) throw new Error(`Candle ${r.status}`);
    const j = await r.json();
    if (j?.s !== "ok" || !Array.isArray(j?.c)) return [];
    return j.c.map((v: unknown) => Number(v)).filter(Number.isFinite);
  } catch (e) {
    console.error("fetchCandles error", e);
    return [];
  }
}

// Fallback via server (no browser CORS)
async function fetchCandlesFallback(symbol = "SPY"): Promise<number[]> {
  if (!isProxyConfigured) {
    return [];
  }
  try {
    const codeMap: Record<string, string> = { SPY: "spy.us" };
    const code = codeMap[symbol] ?? `${symbol.toLowerCase()}.us`;
    const r = await proxy({ source: "stooq", code });
    if (r.status === 401) {
      console.warn(`fetchCandlesFallback: 401 Unauthorized for ${symbol}`);
      return [];
    }
    if (!r.ok) throw new Error(`Stooq ${r.status}`);
    const csv = await r.text();
    const lines = csv.trim().split("\n").slice(1);
    const closes = lines.map((l) => Number(l.split(",")[4])).filter(Number.isFinite);
    return closes.slice(-220);
  } catch (e) {
    console.error("fetchCandlesFallback error", e);
    return [];
  }
}


/* ================== Screen ================== */
export default function Investments(): React.ReactElement {
  const insets = useSafeAreaInsets();

  const [holdings, setHoldings] = React.useState<Holding[]>(MOCK_HOLDINGS);
  const [spy, setSpy] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("investments")
          .select("*")
          .order("id", { ascending: false });

        if (cancelled) return;

        let rows: Holding[] = MOCK_HOLDINGS;
        if (!error && Array.isArray(data) && data.length > 0) {
          rows = data.map((r: SupabaseInvestmentRow, idx: number) => ({
            id: r.id ?? idx,
            symbol: String(r.symbol ?? r.ticker ?? `TICK${idx}`),
            name: r.name ?? r.symbol ?? undefined,
            quantity: Number(r.quantity ?? 0),
            avg_price: Number(r.avg_price ?? r.price ?? 0),
            current_price: Number(r.avg_price ?? r.price ?? 0),
            sector: r.sector ?? undefined,
          }));
        }

        const symbols = rows.filter((h) => h.symbol !== "CASH").map((h) => h.symbol);
        const quotes = await fetchQuotes(symbols);

        if (cancelled) return;

        const merged = rows.map((h) =>
          h.symbol === "CASH" ? h : { ...h, current_price: quotes[h.symbol] ?? h.current_price }
        );
        setHoldings(merged);

        const s = await fetchCandles("SPY");

        if (cancelled) return;

        setSpy(s.length ? s : await fetchCandlesFallback("SPY"));
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Load failed";
        setErr(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .order("id", { ascending: false });

      let rows: Holding[] = MOCK_HOLDINGS;
      if (!error && Array.isArray(data) && data.length > 0) {
        rows = data.map((r: SupabaseInvestmentRow, idx: number) => ({
          id: r.id ?? idx,
          symbol: String(r.symbol ?? r.ticker ?? `TICK${idx}`),
          name: r.name ?? r.symbol ?? undefined,
          quantity: Number(r.quantity ?? 0),
          avg_price: Number(r.avg_price ?? r.price ?? 0),
          current_price: Number(r.avg_price ?? r.price ?? 0),
          sector: r.sector ?? undefined,
        }));
      }

      const symbols = rows.filter((h) => h.symbol !== "CASH").map((h) => h.symbol);
      const quotes = await fetchQuotes(symbols);
      const merged = rows.map((h) =>
        h.symbol === "CASH" ? h : { ...h, current_price: quotes[h.symbol] ?? h.current_price }
      );
      setHoldings(merged);

      const s = await fetchCandles("SPY");
      setSpy(s.length ? s : await fetchCandlesFallback("SPY"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Load failed";
      setErr(msg);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /* ===== Derived metrics ===== */
  const derived = React.useMemo(() => {
    const totalValue = sum(holdings.map((h) => h.quantity * h.current_price));
    const nonCash = holdings.filter((h) => h.symbol !== "CASH");
    const totalCost =
      sum(nonCash.map((h) => h.quantity * h.avg_price)) +
      (holdings.find((h) => h.symbol === "CASH")?.current_price ?? 0);
    const totalPL = totalValue - totalCost;
    const dayPL = sum(
      nonCash.map((h) => h.quantity * (h.current_price - h.avg_price) * 0.002)
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
  }, [holdings, spy]);

  /* ===== UI ===== */
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Snapshot */}
      <Animated.View entering={FadeInUp.duration(320)}>
        <Card>
          <Text style={s.h1}>Snapshot</Text>
          <View style={s.kpiRow}>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Value</Text>
              <Text style={s.kpiValue}>{money(derived.totalValue)}</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Day P/L</Text>
              <Text style={[s.kpiValue, { color: derived.dayPL >= 0 ? "#16a34a" : "#ef4444" }]}>
                {money(derived.dayPL)}
              </Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Total P/L</Text>
              <Text style={[s.kpiValue, { color: derived.totalPL >= 0 ? "#16a34a" : "#ef4444" }]}>
                {money(derived.totalPL)}
              </Text>
            </View>
          </View>
          <View style={[s.kpiRow, { marginTop: 8 }]}>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Benchmark (SPY YTD)</Text>
              <Text style={[s.kpiValue, { color: derived.benchYtd >= 0 ? "#16a34a" : "#ef4444" }]}>
                {pct(derived.benchYtd)}
              </Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Top Weight</Text>
              <Text style={s.kpiValue}>{nf.format((derived.topWeight || 0) * 100)}%</Text>
            </View>
          </View>
          {derived.topWeight > 0.2 && (
            <View style={s.notice}>
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
            <Text style={s.h1}>Allocation (sectors)</Text>
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
            <Text style={s.h1}>Weights by holding</Text>
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
            <Text style={s.h1}>P/L by holding</Text>
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
            <Text style={s.h1}>Benchmark drawdown (SPY YTD)</Text>
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
            <Text style={s.h1}>Rolling volatility (SPY · 30D)</Text>
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

      {/* Positions (sparklines) */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(240).duration(360)}>
          <Card>
            <Text style={s.h1}>Positions (sparklines)</Text>
            <View style={{ marginTop: 8, gap: 10 }}>
              {(mockSparks as SparkPosition[]).map((p) => (
                <View key={p.id} style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.symbol}>{p.name}</Text>
                    <Text
                      style={[
                        s.change,
                        { color: p.change >= 0 ? "#16a34a" : "#ef4444" },
                      ]}
                    >
                      {p.change >= 0 ? "+" : ""}
                      {p.change}% today
                    </Text>
                  </View>
                  <View style={{ flexBasis: 120 }}>
                    <CompactChart height={42}>
                      {(w, h) => (
                        <VictoryChart
                          width={w}
                          height={h}
                          padding={{ left: 8, right: 8, top: 8, bottom: 8 }}
                          containerComponent={<VictoryContainer responsive={false} />}
                          animate={{ duration: 600 }}
                        >
                          <VictoryLine
                            data={p.data.map((y: number, i: number) => ({ x: i + 1, y }))}
                            style={{ data: { stroke: "#5b76f7", strokeWidth: 1.3 } }}
                          />
                        </VictoryChart>
                      )}
                    </CompactChart>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Holdings list with live prices */}
      <Animated.View entering={FadeInUp.delay(280).duration(360)}>
        <Card>
          <Text style={s.h1}>Your investments</Text>
          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : err ? (
            <>
              <Text style={{ color: "#ef4444", marginTop: 8 }}>{err}</Text>
              <TouchableOpacity style={s.retry} onPress={onRefresh}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ marginTop: 8, gap: 10 }}>
              {holdings.map((h) => {
                const value = h.quantity * h.current_price;
                const pnl = h.quantity * (h.current_price - h.avg_price);
                return (
                  <View key={h.id} style={s.row}>
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
            <Text style={s.h1}>Dividends (next 30–45 days)</Text>
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
            <Text style={s.h1}>DCA cumulative (mock)</Text>
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
