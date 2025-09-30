import React from "react";
import { Pressable, View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import { VictoryChart,VictoryStack, VictoryLine, VictoryArea, VictoryAxis, VictoryBar, VictoryPie, VictoryGroup, VictoryContainer } from "@/lib/charts";
import { supabase } from "../../api";
import { useAuth } from "@/store/auth";

// --- Types & constants ---
type SymbolKey = "AAPL" | "MSFT" | "SPY" | "TSLA" | "GOOGL" | "AMZN" | "META" | "NVDA" | "NFLX";
const allowedSymbols: SymbolKey[] = ["AAPL", "MSFT", "SPY", "TSLA", "GOOGL", "AMZN", "META", "NVDA", "NFLX"];

const mockedNews: Record<SymbolKey, { title: string; url: string }[]> = {
  AAPL: [
    {
      title: "Apple hits 2025 highs on strong iPhone 17 demand.",
      url: "https://www.marketwatch.com/story/apples-stock-surges-to-a-2025-high-on-hot-iphone-17-demand-can-the-rally-continue-56afe428",
    },
  ],
  MSFT: [
    {
      title: "Microsoft signs $17.4B Nebius GPU deal to boost AI cloud capacity.",
      url: "https://www.tipranks.com/news/microsoft-msft-delivers-stock-catalyst-via-17-4b-nbis-deal",
    },
  ],
  SPY: [
    {
      title: "Traders eye SPY put spreads as hedge amid market volatility.",
      url: "https://seekingalpha.com/article/4825481-s-and-p-500-buy-put-spreads-before-the-tide-turns",
    },
  ],
  TSLA: [
    {
      title: "Tesla focuses on autonomy pipeline as delivery growth slows.",
      url: "https://www.reuters.com/markets/us/tesla-q3-outlook-autonomy-focus-2025-09-18/",
    },
  ],
  GOOGL: [
    {
      title: "Google Cloud expands AI services to compete with AWS & Azure.",
      url: "https://www.cnbc.com/2025/09/10/google-cloud-expands-ai-offerings.html",
    },
  ],
  AMZN: [
    {
      title: "Amazon Web Services sees strong growth in enterprise AI adoption.",
      url: "https://www.cnbc.com/2025/09/15/amazon-aws-ai-growth.html",
    },
  ],
  META: [
    {
      title: "Meta's Reality Labs division shows promising VR/AR revenue growth.",
      url: "https://www.techcrunch.com/2025/09/20/meta-reality-labs-growth.html",
    },
  ],
  NVDA: [
    {
      title: "NVIDIA's data center revenue continues to surge amid AI boom.",
      url: "https://www.reuters.com/technology/nvidia-data-center-ai-2025-09-22/",
    },
  ],
  NFLX: [
    {
      title: "Netflix subscriber growth accelerates with new content strategy.",
      url: "https://www.variety.com/2025/09/18/netflix-subscriber-growth.html",
    },
  ],
};

// Fallback data
const fallbackCash = [
  { x: 1, y: 1200 },
  { x: 2, y: 1100 },
  { x: 3, y: 1400 },
  { x: 4, y: 1300 },
  { x: 5, y: 1500 },
  { x: 6, y: 1250 },
  { x: 7, y: 1600 }
];

const fallbackAlloc = [
  { x: "Current", y: [50, 30, 20] }, // [Needs, Wants, Savings]
  { x: "Goal", y: [50, 30, 20] }
];

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

// Utility for random numbers in range
const rand = (min: number, max: number, decimals = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));

function formatMoney(val: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(val);
  } catch {
    return `${val.toFixed(2)} ${currency}`;
  }
}

// Generate mock stock data for charts
function generateStockData(symbol: SymbolKey, days = 30) {
  const basePrice = symbol === "AAPL" ? 175 : symbol === "MSFT" ? 320 : symbol === "SPY" ? 450 : symbol === "TSLA" ? 200 : symbol === "GOOGL" ? 140 : symbol === "AMZN" ? 180 : symbol === "META" ? 280 : symbol === "NVDA" ? 450 : 380;
  
  return Array.from({ length: days }, (_, i) => ({
    x: i + 1,
    y: basePrice + (Math.random() - 0.5) * 20 + Math.sin(i * 0.1) * 10
  }));
}

export default function Insights() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedSymbols, setSelectedSymbols] = React.useState<SymbolKey[]>(["AAPL", "MSFT", "SPY"]);
  const [loadingSymbols, setLoadingSymbols] = React.useState(false);
  const [newsBySymbol, setNewsBySymbol] = React.useState<Record<SymbolKey, { title: string; url: string }[]>>({} as any);
  const [loadingNews, setLoadingNews] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  // Auth email (from Authentication page)
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authEmail, setAuthEmail] = React.useState<string | null>(null);
  // User-scoped aggregates
  const [cashSeries, setCashSeries] = React.useState(fallbackCash);
  const [allocation, setAllocation] = React.useState({ current: [50, 30, 20], goal: [50, 30, 20] }); // [Needs, Wants, Savings]
  const [monthlyMix, setMonthlyMix] = React.useState(fallbackMonthly);
  const [loadingAgg, setLoadingAgg] = React.useState(false);

  // Extras: show currency & spent amounts for allocation; money received in last 7d
  const [currency, setCurrency] = React.useState<string>("USD");
  const [spentNeeds, setSpentNeeds] = React.useState<number>(1200);
  const [spentWants, setSpentWants] = React.useState<number>(700);
  const [spentSavings, setSpentSavings] = React.useState<number>(400);
  const [received7d, setReceived7d] = React.useState<number>(3810);
  const [receivedTransactions, setReceivedTransactions] = React.useState<{ amount: number; description: string; category: string }[]>([
    { amount: 2850.0, description: "Victoria Bank", category: "Salary" },
    { amount: 450.0, description: "Freelance Client", category: "Consulting Fee" },
    { amount: 125.0, description: "PayPal Transfer", category: "Online Sales" },
    { amount: 85.0, description: "Cash Refund", category: "Return" },
    { amount: 200.0, description: "Family Transfer", category: "Gift" },
  ]);

  const filteredMonthlyData = selectedMonth === "All" 
    ? fallbackMonthly 
    : fallbackMonthly.filter(item => item.month === selectedMonth);

  // Stock data for selected symbols
  const stockData = React.useMemo(() => {
    const data: Record<SymbolKey, any> = {} as Record<SymbolKey, any>;
    selectedSymbols.forEach(symbol => {
      const chartData = generateStockData(symbol);
      const currentPrice = chartData[chartData.length - 1].y;
      const previousPrice = chartData[chartData.length - 2].y;
      const change = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      data[symbol] = {
        chartData,
        currentPrice,
        change,
        todayReturn: rand(50, 200),
        totalReturn: rand(1000, 5000),
        revenueReturn: rand(10000, 50000)
      };
    });
    return data;
  }, [selectedSymbols]);

  // Fixed chart data preparation
  const chartData = React.useMemo(() => {
    if (selectedMonth === "All") {
      // Transform data for grouped bars - create separate entries for each category
      const transformedData: any[] = [];
      fallbackMonthly.forEach(month => {
        transformedData.push(
          { month: month.month, category: "Needs", amount: month.needs, color: "#EF4444" },
          { month: month.month, category: "Wants", amount: month.wants, color: "#F59E0B" },
          { month: month.month, category: "Savings", amount: month.savings, color: "#10B981" }
        );
      });
      return transformedData;
    } else {
      // Single month data
      const monthData = filteredMonthlyData[0];
      if (!monthData) return [];
      return [
        { month: monthData.month, category: "Needs", amount: monthData.needs, color: "#EF4444" },
        { month: monthData.month, category: "Wants", amount: monthData.wants, color: "#F59E0B" },
        { month: monthData.month, category: "Savings", amount: monthData.savings, color: "#10B981" }
      ];
    }
  }, [selectedMonth, filteredMonthlyData]);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setDropdownOpen(false);
  };

  // load current auth user email
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setAuthLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user && isMounted) {
          setAuthEmail(data.user.email ?? null);
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // symbols from user's investments
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingSymbols(true);
      try {
        if (!user?.userId) return;
        const { data, error } = await supabase
          .from("investments")
          .select("type")
          .eq("user_id", user.userId);
        if (!error && Array.isArray(data) && data.length) {
          const unique = Array.from(new Set(data.map((r: any) => String(r.type).trim()).filter(Boolean))).slice(0, 3);
          const filtered = unique.filter((s): s is SymbolKey => (allowedSymbols as string[]).includes(s));
          if (filtered.length && isMounted) setSelectedSymbols(filtered);
        }
      } catch {}
      finally { if (isMounted) setLoadingSymbols(false); }
    })();
    return () => { isMounted = false; };
  }, [user?.userId]);

  // headlines (mocked fallback data)
  React.useEffect(() => {
    if (!selectedSymbols.length) return;
    setLoadingNews(true);
    setTimeout(() => {
      const map: Record<SymbolKey, { title: string; url: string }[]> = {} as any;
      selectedSymbols.forEach((s) => {
        map[s] = mockedNews[s] || [];
      });
      setNewsBySymbol(map);
      setLoadingNews(false);
    }, 400);
  }, [selectedSymbols]);

  // user-scoped aggregates
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!user?.userId) return;
      setLoadingAgg(true);

      try {
        // Your existing data fetching logic here...
        // For now, using fallback data
        
        // Set allocation data
        if (isMounted) {
          setAllocation({
            current: [55, 35, 10], // Current spending
            goal: [50, 30, 20] // Goal allocation
          });
        }

      } finally {
        if (isMounted) setLoadingAgg(false);
      }
    })();

    return () => { isMounted = false; };
  }, [user?.userId]);

  const handleSymbolSelect = (symbol: SymbolKey) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      }
      if (prev.length >= 3) {
        return [symbol, ...prev.slice(0, 2)];
      }
      return [symbol, ...prev];
    });
  };

  // Prepare pie chart data for current vs goal
  const pieChartData = React.useMemo(() => {
    const currentTotal = spentNeeds + spentWants + spentSavings;
    const goalTotal = 100; // percentage

    return {
      current: [
        { x: "Needs", y: (spentNeeds / currentTotal) * 100 },
        { x: "Wants", y: (spentWants / currentTotal) * 100 },
        { x: "Savings", y: (spentSavings / currentTotal) * 100 }
      ],
      goal: [
        { x: "Needs", y: 50 },
        { x: "Wants", y: 30 },
        { x: "Savings", y: 20 }
      ]
    };
  }, [spentNeeds, spentWants, spentSavings]);

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

      {/* Stock Market Cards */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <Text style={[s.h1, { marginBottom: 12 }]}>Market Overview</Text>
        <View style={s.stockCardsContainer}>
          {selectedSymbols.map((symbol, index) => {
            const data = stockData[symbol];
            const colors = [
              { bg: "#FFB020", accent: "#FF8C00" }, // Orange
              { bg: "#A855F7", accent: "#7C3AED" }, // Purple
              { bg: "#1F2937", accent: "#374151" }  // Dark
            ];
            const color = colors[index] || colors[0];

            return (
              <View key={symbol} style={[s.stockCard, { backgroundColor: color.bg }]}>
                {/* Header */}
                <View style={s.stockCardHeader}>
                  <Text style={s.stockCardTitle}>{symbol}</Text>
                  <Text style={s.stockCardSubtitle}>
                    {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                  </Text>
                </View>

                {/* Price */}
                <Text style={s.stockCardPrice}>
                  ${data.currentPrice.toFixed(2)}
                </Text>

                {/* Mini Chart */}
                <View style={s.miniChartContainer}>
                  <CompactChart height={200}>
                    {(w, h) => (
                      <VictoryChart
                        width={w || 300} 
                        height={h || 200} 
                        padding={{ left: 50, right: 10, top: 20, bottom: 30 }}
                        containerComponent={<VictoryContainer responsive={false} />}
                      >
                        <VictoryAxis dependentAxis tickFormat={(t: number) => `$${(t / 1000).toFixed(1)}k`} />
                        <VictoryAxis />
                        <VictoryBar data={monthlyMix} x="month" y="needs" />
                      </VictoryChart>
                    )}
                  </CompactChart>
                </View>

                {/* Returns */}
                <View style={s.stockCardReturns}>
                  <Text style={s.stockCardReturnLabel}>Today: ${data.todayReturn}</Text>
                  <Text style={s.stockCardReturnLabel}>Total: ${data.totalReturn}</Text>
                </View>

                {/* View More */}
                <Pressable 
                  style={s.viewMoreButton}
                  onPress={() => {
                    const news = newsBySymbol[symbol];
                    if (news && news.length > 0) {
                      Linking.openURL(news[0].url);
                    }
                  }}
                >
                  <Text style={s.viewMoreText}>View More</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  
  // Symbol selector styles
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
  symbolSelectorText: { 
    color: "#1f2937", 
    fontWeight: "700",
    fontSize: 12
  },
  symbolSelectorTextActive: { 
    color: "#FFFFFF"
  },
  
  // Stock cards styles
  stockCardsContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap"
  },
  stockCard: {
    flex: 1,
    minWidth: 110,
    maxWidth: "31%",
    borderRadius: 16,
    padding: 12,
    minHeight: 200
  },
  stockCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  stockCardTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14
  },
  stockCardSubtitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12
  },
  stockCardPrice: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12
  },
  miniChartContainer: {
    height: 60,
    marginBottom: 12
  },
  stockCardReturns: {
    gap: 4,
    marginBottom: 12
  },
  stockCardReturnLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.9
  },
  viewMoreButton: {
    alignItems: "center",
    paddingVertical: 6
  },
  viewMoreText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    textDecorationLine: "underline"
  },
  
  // Transaction styles
  transactionItem: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8
  },
  transactionAmount: {
    fontWeight: "700",
    fontSize: 14, 
    marginBottom: 2
  },
  transactionDesc: {
    fontSize: 12,
    color: "#374151", 
    marginBottom: 2
  },
  transactionCategory: {
    fontSize: 11,
    color: "#6B7280"
  },  
  
  // Pie chart styles
  pieChartTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  legendItem: {
    flexDirection: "row",   
    alignItems: "center",
    gap: 6
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  kvKey: {  
    fontSize: 13,
    color: "#374151",
    fontWeight: "600"
  },
  kvVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827"
  },
  percentageText: {
    fontSize: 11,
    color: "#6B7280"
  },
  
  // Enhanced monthly mix styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  
  // Fixed dropdown styles
  dropdownContainer: {
    position: "relative",
    zIndex: 9999,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
    fontWeight: "600",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: 4,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: "#246BFD",
    fontWeight: "700",
  },
  
  // Enhanced chart styles
  chartLegend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  legendText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  
  // Enhanced monthly breakdown styles
  monthlyBreakdown: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthlyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  monthTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  monthlyStats: {
    gap: 16,
  },
  statItemEnhanced: {
    gap: 8,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  statAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statPercent: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
  },
});