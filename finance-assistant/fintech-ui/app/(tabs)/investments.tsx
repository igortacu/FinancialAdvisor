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

/* ================== Brokerage Types ================== */
type Brokerage = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
  accountType: string;
  accountNumber: string;
  holdings: Holding[];
  dividends: Dividend[];
};

type ConnectionStep = {
  id: number;
  label: string;
  icon: string;
  duration: number;
};

/* ================== Brokerage Data ================== */
const BROKERAGES: Brokerage[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers",
    shortName: "IBKR",
    description: "Stocks & ETFs Portfolio",
    icon: "📊",
    color: "#D41F2C",
    accentColor: "#FEE2E2",
    accountType: "Individual Brokerage",
    accountNumber: "****4821",
    holdings: [
      { id: 1, symbol: "AAPL", name: "Apple Inc.", quantity: 12, avg_price: 178.50, current_price: 178.50, sector: "Tech" },
      { id: 2, symbol: "MSFT", name: "Microsoft Corp.", quantity: 8, avg_price: 378.25, current_price: 378.25, sector: "Tech" },
      { id: 3, symbol: "VOO", name: "Vanguard S&P 500 ETF", quantity: 5, avg_price: 485.00, current_price: 485.00, sector: "ETF" },
      { id: 4, symbol: "TSLA", name: "Tesla Inc.", quantity: 6, avg_price: 242.80, current_price: 242.80, sector: "Auto" },
      { id: 5, symbol: "NVDA", name: "NVIDIA Corp.", quantity: 4, avg_price: 875.00, current_price: 875.00, sector: "Tech" },
      { id: 6, symbol: "GOOGL", name: "Alphabet Inc.", quantity: 3, avg_price: 165.40, current_price: 165.40, sector: "Tech" },
      { id: 7, symbol: "CASH", name: "Cash Reserve", quantity: 2500, avg_price: 1, current_price: 1, sector: "Cash" },
    ],
    dividends: [
      { id: "d1", symbol: "AAPL", date: "2025-12-05", amount: 2.88 },
      { id: "d2", symbol: "VOO", date: "2025-12-15", amount: 11.50 },
      { id: "d3", symbol: "MSFT", date: "2025-12-20", amount: 5.60 },
    ],
  },
  {
    id: "coinbase",
    name: "Coinbase",
    shortName: "CB",
    description: "Crypto Portfolio",
    icon: "🪙",
    color: "#0052FF",
    accentColor: "#DBEAFE",
    accountType: "Crypto Wallet",
    accountNumber: "****7392",
    holdings: [
      { id: 1, symbol: "BTC", name: "Bitcoin", quantity: 0.85, avg_price: 42000, current_price: 97500, sector: "Crypto" },
      { id: 2, symbol: "ETH", name: "Ethereum", quantity: 4.2, avg_price: 2200, current_price: 3450, sector: "Crypto" },
      { id: 3, symbol: "SOL", name: "Solana", quantity: 45, avg_price: 85, current_price: 245, sector: "Crypto" },
      { id: 4, symbol: "LINK", name: "Chainlink", quantity: 120, avg_price: 12.50, current_price: 18.75, sector: "Crypto" },
      { id: 5, symbol: "USDC", name: "USD Coin", quantity: 5000, avg_price: 1, current_price: 1, sector: "Stablecoin" },
    ],
    dividends: [],
  },
  {
    id: "fidelity",
    name: "Fidelity",
    shortName: "FID",
    description: "Retirement Account",
    icon: "🏦",
    color: "#4AA564",
    accentColor: "#D1FAE5",
    accountType: "Roth IRA",
    accountNumber: "****9156",
    holdings: [
      { id: 1, symbol: "VTI", name: "Vanguard Total Stock", quantity: 35, avg_price: 220, current_price: 268, sector: "ETF" },
      { id: 2, symbol: "VXUS", name: "Vanguard Intl Stock", quantity: 40, avg_price: 55, current_price: 62, sector: "ETF" },
      { id: 3, symbol: "BND", name: "Vanguard Total Bond", quantity: 25, avg_price: 74, current_price: 72, sector: "Bonds" },
      { id: 4, symbol: "SCHD", name: "Schwab Dividend ETF", quantity: 20, avg_price: 72, current_price: 81, sector: "ETF" },
      { id: 5, symbol: "QQQ", name: "Invesco QQQ Trust", quantity: 8, avg_price: 380, current_price: 505, sector: "ETF" },
      { id: 6, symbol: "CASH", name: "Cash Reserve", quantity: 1200, avg_price: 1, current_price: 1, sector: "Cash" },
    ],
    dividends: [
      { id: "d1", symbol: "VTI", date: "2025-12-18", amount: 8.75 },
      { id: "d2", symbol: "SCHD", date: "2025-12-22", amount: 12.40 },
    ],
  },
];

const CONNECTION_STEPS: ConnectionStep[] = [
  { id: 1, label: "Connecting to server...", icon: "🔗", duration: 800 },
  { id: 2, label: "Authenticating...", icon: "🔐", duration: 1200 },
  { id: 3, label: "Verifying credentials...", icon: "✓", duration: 600 },
  { id: 4, label: "Fetching account data...", icon: "📥", duration: 1000 },
  { id: 5, label: "Syncing positions...", icon: "📊", duration: 800 },
  { id: 6, label: "Loading market data...", icon: "📈", duration: 700 },
  { id: 7, label: "Finalizing...", icon: "✨", duration: 400 },
];

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

  // Brokerage connection state
  const [selectedBroker, setSelectedBroker] = React.useState<Brokerage | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectionStep, setConnectionStep] = React.useState(0);
  const [isConnected, setIsConnected] = React.useState(false);

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

  /* ===== Broker Connection Handler ===== */
  const handleSelectBroker = React.useCallback((broker: Brokerage) => {
    setSelectedBroker(broker);
    setIsConnecting(true);
    setConnectionStep(0);
    
    // Animate through connection steps
    let stepIndex = 0;
    const runStep = () => {
      if (stepIndex < CONNECTION_STEPS.length) {
        setConnectionStep(stepIndex);
        setTimeout(() => {
          stepIndex++;
          runStep();
        }, CONNECTION_STEPS[stepIndex].duration);
      } else {
        // Connection complete
        setTimeout(() => {
          setIsConnecting(false);
          setIsConnected(true);
          // Load the broker's holdings
          setHoldings(broker.holdings);
        }, 300);
      }
    };
    runStep();
  }, []);

  const handleDisconnect = React.useCallback(() => {
    setSelectedBroker(null);
    setIsConnected(false);
    setConnectionStep(0);
    setHoldings(MOCK_HOLDINGS);
  }, []);

  /* ===== Broker Selection Screen ===== */
  if (!isConnected && !isConnecting) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 6 }]}>
        <ScrollView 
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <Text style={s.brokerTitle}>Connect Your Brokerage</Text>
            <Text style={s.brokerSubtitle}>
              Select an account to view your portfolio and real-time market data
            </Text>
          </Animated.View>

          {/* Broker Cards */}
          <View style={{ marginTop: 24, gap: 16 }}>
            {BROKERAGES.map((broker, index) => {
              const totalValue = broker.holdings.reduce(
                (acc, h) => acc + h.quantity * h.current_price, 0
              );
              const totalPL = broker.holdings.reduce(
                (acc, h) => acc + h.quantity * (h.current_price - h.avg_price), 0
              );
              const isProfit = totalPL >= 0;
              
              return (
                <Animated.View 
                  key={broker.id}
                  entering={FadeInUp.delay(200 + index * 100).duration(400)}
                >
                  <TouchableOpacity
                    style={[s.brokerCard, { borderColor: broker.color + "40" }]}
                    onPress={() => handleSelectBroker(broker)}
                    activeOpacity={0.7}
                  >
                    {/* Accent Strip */}
                    <View style={[s.brokerAccent, { backgroundColor: broker.color }]} />
                    
                    {/* Card Content */}
                    <View style={s.brokerCardContent}>
                      {/* Header Row */}
                      <View style={s.brokerCardHeader}>
                        <View style={[s.brokerIcon, { backgroundColor: broker.accentColor }]}>
                          <Text style={{ fontSize: 24 }}>{broker.icon}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.brokerName}>{broker.name}</Text>
                          <Text style={s.brokerType}>{broker.accountType}</Text>
                        </View>
                        <View style={[s.brokerBadge, { backgroundColor: broker.accentColor }]}>
                          <Text style={[s.brokerBadgeText, { color: broker.color }]}>
                            {broker.accountNumber}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Description */}
                      <Text style={s.brokerDescription}>{broker.description}</Text>
                      
                      {/* Stats Row */}
                      <View style={s.brokerStats}>
                        <View style={s.brokerStat}>
                          <Text style={s.brokerStatLabel}>Portfolio Value</Text>
                          <Text style={s.brokerStatValue}>{money(totalValue)}</Text>
                        </View>
                        <View style={s.brokerStat}>
                          <Text style={s.brokerStatLabel}>Total Return</Text>
                          <Text style={[s.brokerStatValue, { color: isProfit ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                            {isProfit ? "+" : ""}{money(totalPL)}
                          </Text>
                        </View>
                        <View style={s.brokerStat}>
                          <Text style={s.brokerStatLabel}>Holdings</Text>
                          <Text style={s.brokerStatValue}>{broker.holdings.length}</Text>
                        </View>
                      </View>
                      
                      {/* Connect Button */}
                      <View style={[s.brokerConnectBtn, { backgroundColor: broker.color }]}>
                        <Text style={s.brokerConnectText}>Connect Account →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
          
          {/* Security Note */}
          <Animated.View entering={FadeInUp.delay(600).duration(400)} style={s.securityNote}>
            <Text style={s.securityIcon}>🔒</Text>
            <Text style={s.securityText}>
              Your credentials are encrypted and never stored. We use secure OAuth connections.
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  /* ===== Connection Animation Screen ===== */
  if (isConnecting && selectedBroker) {
    const currentStep = CONNECTION_STEPS[connectionStep];
    const progress = ((connectionStep + 1) / CONNECTION_STEPS.length) * 100;
    
    return (
      <View style={[s.root, s.connectionScreen, { paddingTop: insets.top + 20 }]}>
        <Animated.View entering={FadeInUp.duration(400)} style={s.connectionContent}>
          {/* Broker Icon */}
          <View style={[s.connectionIcon, { backgroundColor: selectedBroker.accentColor }]}>
            <Text style={{ fontSize: 48 }}>{selectedBroker.icon}</Text>
          </View>
          
          {/* Broker Name */}
          <Text style={s.connectionTitle}>{selectedBroker.name}</Text>
          <Text style={s.connectionSubtitle}>Establishing secure connection...</Text>
          
          {/* Progress Bar */}
          <View style={s.progressContainer}>
            <View style={s.progressBar}>
              <Animated.View 
                style={[
                  s.progressFill, 
                  { width: `${progress}%`, backgroundColor: selectedBroker.color }
                ]} 
              />
            </View>
            <Text style={s.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          
          {/* Current Step */}
          <View style={s.stepContainer}>
            <Animated.View 
              key={connectionStep}
              entering={FadeInUp.duration(200)}
              style={s.stepContent}
            >
              <Text style={s.stepIcon}>{currentStep?.icon}</Text>
              <Text style={s.stepLabel}>{currentStep?.label}</Text>
            </Animated.View>
          </View>
          
          {/* Steps Timeline */}
          <View style={s.timeline}>
            {CONNECTION_STEPS.map((step, index) => (
              <View key={step.id} style={s.timelineItem}>
                <View style={[
                  s.timelineDot,
                  index < connectionStep && { backgroundColor: selectedBroker.color },
                  index === connectionStep && { backgroundColor: selectedBroker.color, transform: [{ scale: 1.3 }] },
                  index > connectionStep && { backgroundColor: "#E2E8F0" },
                ]} />
                {index < CONNECTION_STEPS.length - 1 && (
                  <View style={[
                    s.timelineLine,
                    index < connectionStep && { backgroundColor: selectedBroker.color },
                  ]} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  /* ===== Main UI (Connected) ===== */
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
      {/* Connected Broker Banner */}
      {selectedBroker && (
        <Animated.View entering={FadeInUp.duration(280)}>
          <View style={s.connectedHeader}>
            <View style={s.connectedHeaderLeft}>
              <View style={[s.connectedHeaderIcon, { backgroundColor: selectedBroker.accentColor }]}>
                <Text style={{ fontSize: 20 }}>{selectedBroker.icon}</Text>
              </View>
              <View>
                <Text style={s.connectedHeaderName}>{selectedBroker.name}</Text>
                <View style={s.connectedHeaderStatus}>
                  <View style={s.connectedDot} />
                  <Text style={s.connectedHeaderType}>{selectedBroker.accountType}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={s.switchAccountBtn}
              onPress={handleDisconnect}
              accessibilityLabel="Switch brokerage account"
            >
              <Text style={s.switchAccountText}>Switch</Text>
              <Text style={{ fontSize: 12 }}>🔄</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

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
                  labelRadius={90}
                  animate={{ duration: 800 }}
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
                  animate={{ duration: 600 }}
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

      {/* P/L contribution - Modern Card Layout */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(120).duration(360)}>
          <Card>
            <View style={s.chartHeader}>
              <Text style={s.h1} accessibilityRole="header">Performance</Text>
              <View style={[s.chartBadge, { backgroundColor: derived.totalPL >= 0 ? "#ECFDF5" : "#FEF2F2" }]}>
                <Text style={[s.chartBadgeText, { color: derived.totalPL >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                  {derived.totalPL >= 0 ? "+" : ""}{money(derived.totalPL)}
                </Text>
              </View>
            </View>
            
            {/* Total P/L Hero */}
            <View style={s.plHero}>
              <Text style={s.plHeroLabel}>Total Return</Text>
              <Text style={[s.plHeroValue, { color: derived.totalPL >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                {derived.totalPL >= 0 ? "+" : ""}{money(derived.totalPL)}
              </Text>
              <View style={[s.plHeroChip, { backgroundColor: derived.totalPL >= 0 ? "#D1FAE5" : "#FEE2E2" }]}>
                <Text style={[s.plHeroChipText, { color: derived.totalPL >= 0 ? "#065F46" : "#991B1B" }]}>
                  {derived.totalPL >= 0 ? "▲" : "▼"} {((derived.totalPL / (derived.totalValue - derived.totalPL)) * 100).toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Individual Holdings P/L */}
            <View style={{ marginTop: 16, gap: 10 }}>
              {holdings.filter(h => h.symbol !== "CASH").map((h) => {
                const pnl = h.quantity * (h.current_price - h.avg_price);
                const pnlPercent = ((h.current_price - h.avg_price) / h.avg_price) * 100;
                const isPositive = pnl >= 0;
                const maxPnl = Math.max(...holdings.filter(x => x.symbol !== "CASH").map(x => Math.abs(x.quantity * (x.current_price - x.avg_price))));
                const barWidth = Math.min(Math.abs(pnl) / maxPnl * 100, 100);
                
                return (
                  <View key={h.id} style={s.plCard}>
                    <View style={s.plCardHeader}>
                      <View style={s.plCardSymbolWrap}>
                        <View style={[s.plCardDot, { backgroundColor: isPositive ? CHART_COLORS.positive : CHART_COLORS.negative }]} />
                        <Text style={s.plCardSymbol}>{h.symbol}</Text>
                      </View>
                      <Text style={[s.plCardValue, { color: isPositive ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                        {isPositive ? "+" : ""}{money(pnl)}
                      </Text>
                    </View>
                    <View style={s.plCardBarBg}>
                      <Animated.View 
                        style={[
                          s.plCardBar, 
                          { 
                            width: `${barWidth}%`,
                            backgroundColor: isPositive ? CHART_COLORS.positive : CHART_COLORS.negative,
                          }
                        ]} 
                      />
                    </View>
                    <View style={s.plCardFooter}>
                      <Text style={s.plCardFooterText}>
                        {h.quantity} shares @ {money(h.avg_price)}
                      </Text>
                      <Text style={[s.plCardPercent, { color: isPositive ? CHART_COLORS.positive : CHART_COLORS.negative }]}>
                        {isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
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
                  animate={{ duration: 600 }}
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
                  animate={{ duration: 600 }}
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

      {/* Live Positions - Modern Glass Design */}
      {ChartsReady && (
        <Animated.View entering={FadeInUp.delay(240).duration(360)}>
          <View style={s.positionsContainer}>
            <View style={s.positionsHeader}>
              <View>
                <Text style={s.positionsTitle}>Market Watch</Text>
                <Text style={s.positionsSubtitle}>Real-time price updates</Text>
              </View>
              <View style={s.liveIndicator}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
              style={{ marginHorizontal: -16, paddingVertical: 8 }}
            >
              {holdings.filter(h => h.symbol !== "CASH").map((h, index) => {
                const quote = quoteData[h.symbol];
                const changePercent = quote?.changePercent ?? 0;
                const changeDollar = (quote?.change ?? 0);
                const isPositive = changePercent >= 0;
                const value = h.quantity * h.current_price;
                
                // Generate sparkline data
                const basePrice = quote?.previousClose ?? h.current_price;
                const sparkData = Array.from({ length: 24 }, (_, i) => {
                  const progress = i / 23;
                  const trend = (h.current_price - basePrice) * progress;
                  const volatility = Math.sin(i * 0.8) * 0.002 * basePrice;
                  const noise = (Math.random() - 0.5) * 0.001 * basePrice;
                  return basePrice + trend + volatility + noise;
                });
                
                const accentColor = isPositive ? "#10B981" : "#EF4444";
                const bgColor = isPositive ? "#ECFDF5" : "#FEF2F2";
                
                return (
                  <Animated.View 
                    key={h.id} 
                    entering={FadeInUp.delay(260 + index * 60).duration(350)}
                  >
                    <View style={[s.tickerCard, { borderColor: accentColor + "30" }]}>
                      {/* Header */}
                      <View style={s.tickerHeader}>
                        <View style={[s.tickerBadge, { backgroundColor: bgColor }]}>
                          <Text style={[s.tickerBadgeText, { color: accentColor }]}>{h.symbol}</Text>
                        </View>
                        <View style={[s.tickerChange, { backgroundColor: bgColor }]}>
                          <Text style={[s.tickerChangeText, { color: accentColor }]}>
                            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                      
                      {/* Price */}
                      <Text style={s.tickerPrice}>{money(h.current_price)}</Text>
                      <Text style={[s.tickerDelta, { color: accentColor }]}>
                        {isPositive ? "+" : ""}{money(changeDollar)} today
                      </Text>
                      
                      {/* Mini Chart */}
                      <View style={[s.tickerChartWrap, { backgroundColor: bgColor, borderRadius: 8 }]}>
                        <CompactChart height={55}>
                          {(w, ht) => (
                            <VictoryChart
                              width={w}
                              height={ht}
                              padding={{ left: 0, right: 0, top: 8, bottom: 8 }}
                              containerComponent={<VictoryContainer responsive={false} />}
                            >
                              <VictoryLine
                                data={sparkData.map((y: number, i: number) => ({ x: i, y }))}
                                interpolation="monotoneX"
                                style={{ 
                                  data: { 
                                    stroke: accentColor, 
                                    strokeWidth: 2.5,
                                  } 
                                }}
                              />
                            </VictoryChart>
                          )}
                        </CompactChart>
                      </View>
                      
                      {/* Footer */}
                      <View style={s.tickerFooter}>
                        <Text style={s.tickerShares}>{h.quantity} shares</Text>
                        <Text style={s.tickerValue}>{money(value)}</Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
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
                  animate={{ duration: 600 }}
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
                    animate={{ duration: 600 }}
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
  
  // P/L Hero Section
  plHero: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  plHeroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  plHeroValue: {
    fontSize: 36,
    fontWeight: "800",
    marginTop: 4,
  },
  plHeroChip: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  plHeroChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  
  // P/L Card Styles
  plCard: {
    backgroundColor: "#FAFBFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  plCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plCardSymbolWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  plCardSymbol: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  plCardValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  plCardBarBg: {
    marginTop: 12,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  plCardBar: {
    height: "100%",
    borderRadius: 3,
  },
  plCardFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plCardFooterText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  plCardPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  
  // Premium Position Card Styles
  positionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  positionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  positionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  positionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  positionIconText: {
    fontSize: 18,
    fontWeight: "800",
  },
  positionSymbol: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  positionShares: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  positionRight: {
    alignItems: "flex-end",
  },
  positionPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  positionChangeChip: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positionChangeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  positionChartWrap: {
    marginTop: 12,
    marginHorizontal: -8,
  },
  positionBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  positionValueLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  positionValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  
  // Market Watch / Ticker Styles
  positionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  positionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  positionsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  positionsSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 1,
  },
  tickerCard: {
    width: 165,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tickerBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  tickerChange: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tickerChangeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tickerPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 12,
  },
  tickerDelta: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  tickerChartWrap: {
    marginTop: 10,
    marginHorizontal: -4,
    overflow: "hidden",
  },
  tickerFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  tickerShares: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  tickerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },

  // Brokerage Selection Styles
  brokerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  brokerSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  brokerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  brokerAccent: {
    height: 4,
    width: "100%",
  },
  brokerCardContent: {
    padding: 20,
  },
  brokerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  brokerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  brokerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  brokerType: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  brokerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: "auto",
  },
  brokerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brokerDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
  brokerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginBottom: 16,
  },
  brokerStat: {
    alignItems: "center",
  },
  brokerStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brokerStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  brokerConnectBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  brokerConnectText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Connection Animation Overlay
  connectOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  connectModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 32,
    width: "85%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  connectLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  connectBrokerName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 28,
  },
  connectSteps: {
    width: "100%",
    marginBottom: 24,
  },
  connectStepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  connectStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  connectStepLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  connectProgress: {
    width: "100%",
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  connectProgressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Connected State Banner
  connectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  connectedBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
    marginLeft: 8,
  },
  disconnectBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  disconnectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // Security Note
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // Connection Animation Screen
  connectionScreen: {
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  connectionContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
    maxWidth: 360,
  },
  connectionIcon: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  connectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  connectionSubtitle: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 40,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 32,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "right",
  },
  stepContainer: {
    height: 60,
    justifyContent: "center",
    marginBottom: 32,
  },
  stepContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  stepIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 24,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },

  // Connected Header (Switch Account)
  connectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  connectedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectedHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  connectedHeaderName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  connectedHeaderStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  connectedHeaderType: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  switchAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  switchAccountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});
