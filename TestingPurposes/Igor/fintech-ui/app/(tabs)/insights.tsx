import React from "react";
import { Pressable, View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryBar, VictoryPie, VictoryGroup, VictoryContainer } from "@/lib/charts";
import { supabase } from "../../api";
import { useAuth } from "@/store/auth";

// --- Types & constants ---
type SymbolKey = "AAPL" | "MSFT" | "SPY" | "TSLA" | "GOOGL";
const allowedSymbols: SymbolKey[] = ["AAPL", "MSFT", "SPY", "TSLA", "GOOGL"];

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
};

// Fallback data
const fallbackCash = [1200, 1100, 1400, 1300, 1500, 1250, 1600];
const fallbackAlloc = [
  { x: "Needs", y: 50 },
  { x: "Wants", y: 30 },
  { x: "Savings", y: 20 },
];
const fallbackMonthly = [
  { month: "Jan", needs: 500, wants: 300, savings: 200 },
  { month: "Feb", needs: 520, wants: 280, savings: 200 },
  { month: "Mar", needs: 510, wants: 290, savings: 200 },
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

export default function Insights() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [symbols, setSymbols] = React.useState<SymbolKey[]>(["AAPL", "MSFT", "SPY"]);
  const [loadingSymbols, setLoadingSymbols] = React.useState(false);
  const [newsBySymbol, setNewsBySymbol] = React.useState<Record<SymbolKey, { title: string; url: string }[]>>({} as any);
  const [loadingNews, setLoadingNews] = React.useState(false);

  // Auth email (from Authentication page)
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authEmail, setAuthEmail] = React.useState<string | null>(null);

  // User-scoped aggregates
  const [cashSeries, setCashSeries] = React.useState<number[]>(fallbackCash);
  const [allocation, setAllocation] = React.useState<{ x: string; y: number }[]>(fallbackAlloc);
  const [monthlyMix, setMonthlyMix] = React.useState<{ month: string; needs: number; wants: number; savings: number }[]>(fallbackMonthly);
  const [loadingAgg, setLoadingAgg] = React.useState(false);

  // Extras: show currency & spent amounts for allocation; money received in last 7d
  const [currency, setCurrency] = React.useState<string>("USD");
  const [spentNeeds, setSpentNeeds] = React.useState<number>(0);
  const [spentWants, setSpentWants] = React.useState<number>(0);
  const [spentSavings, setSpentSavings] = React.useState<number>(0);
  const [received7d, setReceived7d] = React.useState<number>(0);
  const [receivedTransactions, setReceivedTransactions] = React.useState<{ amount: number; description: string; category: string }[]>([]);

  // Derived: market snapshot for current symbols
  const marketSnapshot = React.useMemo(() => {
    const details: Record<string, { price: number; change: number; focus: string }> = {};
    const make = (sym: SymbolKey) => {
      if (sym === "AAPL") return { price: rand(150, 200), change: rand(-2, 2), focus: "Services growth, iPhone sales, supply chain" };
      if (sym === "MSFT") return { price: rand(280, 350), change: rand(-2, 2), focus: "Azure cloud, AI integration, enterprise adoption" };
      if (sym === "SPY") return { price: rand(400, 500), change: rand(-1.5, 1.5), focus: "US market breadth, diversification" };
      if (sym === "TSLA") return { price: rand(150, 260), change: rand(-3, 3), focus: "Deliveries, margins, autonomy pipeline" };
      return { price: rand(110, 170), change: rand(-2, 2), focus: "Fundamentals and momentum" };
    };
    symbols.forEach((s) => (details[s] = make(s)));
    
    // Simple stacked categories snapshot
    const base = { 
      Housing: rand(25, 40), 
      Food: rand(15, 25), 
      Transport: rand(10, 20), 
      Entertainment: rand(5, 15), 
      Healthcare: rand(5, 15) 
    } as Record<string, number>;
    const sum = Object.values(base).reduce((a, b) => a + b, 0);
    base.Other = Number((100 - sum).toFixed(2));
    const mix = base;
    
    return { details, mix };
  }, [symbols]);

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
          const unique = Array.from(new Set(data.map((r: any) => String(r.type).trim()).filter(Boolean))).slice(0, 5);
          const filtered = unique.filter((s): s is SymbolKey => (allowedSymbols as string[]).includes(s));
          if (filtered.length && isMounted) setSymbols(filtered);
        }
      } catch {}
      finally { if (isMounted) setLoadingSymbols(false); }
    })();
    return () => { isMounted = false; };
  }, [user?.userId]);

  // headlines (mocked fallback data)
  React.useEffect(() => {
    if (!symbols.length) return;
    setLoadingNews(true);
    setTimeout(() => {
      const map: Record<SymbolKey, { title: string; url: string }[]> = {} as any;
      symbols.forEach((s) => {
        map[s] = mockedNews[s] || [];
      });
      setNewsBySymbol(map);
      setLoadingNews(false);
    }, 400); // small delay for realism
  }, [symbols]);

  // user-scoped aggregates from Transactions, Budgets, Accounts
React.useEffect(() => {
  let isMounted = true;
  (async () => {
    if (!user?.userId) return;
    setLoadingAgg(true);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const iso7 = sevenDaysAgo.toISOString();

      // --- Transactions ---
      const tx = await supabase
        .from("transactions")
        .select("date, amount, currency, category, institution_name, from")
        .eq("user_id", user.userId)
        .order("date", { ascending: true })
        .limit(200);

      if (!tx.error && Array.isArray(tx.data)) {
        // Received transactions in last 7 days
        const recent = tx.data
          .filter((t: any) => new Date(t.date) >= sevenDaysAgo && Number(t.amount) > 0)
          .map((t: any) => ({
            amount: Number(t.amount || 0),
            description: t.institution_name || t.from || "",
            category: t.category || "",
          }));

        if (isMounted) {
          if (recent.length > 0) {
            setReceivedTransactions(recent);
            setReceived7d(recent.reduce((sum, t) => sum + t.amount, 0));
          } else {
            // fallback
            setReceivedTransactions([
              { amount: 2850.0, description: "Victoria Bank", category: "Salary" },
              { amount: 450.0, description: "Freelance Client", category: "Consulting Fee" },
              { amount: 125.0, description: "PayPal Transfer", category: "Online Sales" },
              { amount: 85.0, description: "Cash Refund", category: "Return" },
              { amount: 200.0, description: "Family Transfer", category: "Gift" },
            ]);
            setReceived7d(3810); // sum of fallback amounts
          }

          // Cash flow series (last 7 days)
          const amounts = tx.data.slice(-7).map((t: any) => Number(t.amount) || 0);
          setCashSeries(amounts.length > 0 ? amounts : fallbackCash);
        }

        // Determine main currency
        const freq: Record<string, number> = {};
        tx.data.forEach((t: any) => {
          const c = String(t.currency || "USD");
          freq[c] = (freq[c] || 0) + 1;
        });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
        if (isMounted) setCurrency(top);

        // Spending classification (Needs / Wants / Savings) for current month
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const needsKeys = ["rent", "housing", "utility", "bill", "grocery", "transport", "fuel", "insurance", "internet", "phone"];
        const wantsKeys = ["entertainment", "shopping", "travel", "restaurant", "coffee", "fun", "game"];
        const saveKeys = ["saving", "investment", "invest", "deposit"];

        let n = 0, w = 0, s = 0;
        tx.data.forEach((t: any) => {
          const d = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (key !== monthKey) return;
          const amt = Math.abs(Number(t.amount) || 0);
          const cat = String(t.category || "").toLowerCase();
          if (saveKeys.some(k => cat.includes(k))) s += amt;
          else if (needsKeys.some(k => cat.includes(k))) n += amt;
          else if (wantsKeys.some(k => cat.includes(k))) w += amt;
          else n += amt; // default to needs
        });

        if (isMounted) {
          setSpentNeeds(n || 1200); // fallback values if zero
          setSpentWants(w || 700);
          setSpentSavings(s || 400);
        }
      } else {
        // No transactions -> apply fallback
        if (isMounted) {
          setCashSeries(fallbackCash);
          setReceivedTransactions([
            { amount: 2850.0, description: "Victoria Bank", category: "Salary" },
            { amount: 450.0, description: "Freelance Client", category: "Consulting Fee" },
            { amount: 125.0, description: "PayPal Transfer", category: "Online Sales" },
            { amount: 85.0, description: "Cash Refund", category: "Return" },
            { amount: 200.0, description: "Family Transfer", category: "Gift" },
          ]);
          setReceived7d(3810);
          setSpentNeeds(1200);
          setSpentWants(700);
          setSpentSavings(400);
        }
      }

      // --- Budgets for allocation ---
      const budgets = await supabase
        .from("budgets")
        .select("month, category, budget_amount")
        .eq("user_id", user.userId)
        .order("month", { ascending: false })
        .limit(50);

      if (!budgets.error && Array.isArray(budgets.data) && budgets.data.length) {
        const latestMonth = budgets.data[0].month;
        const rows = budgets.data.filter((b: any) => b.month === latestMonth);
        const sums: Record<string, number> = { Needs: 0, Wants: 0, Savings: 0 };
        rows.forEach((r: any) => {
          const k = String(r.category || "").toLowerCase();
          if (k.includes("need")) sums.Needs += Number(r.budget_amount) || 0;
          else if (k.includes("save")) sums.Savings += Number(r.budget_amount) || 0;
          else sums.Wants += Number(r.budget_amount) || 0;
        });
        const total = Math.max(1, sums.Needs + sums.Wants + sums.Savings);
        if (isMounted) setAllocation([
          { x: "Needs", y: Math.round((sums.Needs / total) * 100) },
          { x: "Wants", y: Math.round((sums.Wants / total) * 100) },
          { x: "Savings", y: Math.round((sums.Savings / total) * 100) },
        ]);
      } else {
        if (isMounted) setAllocation(fallbackAlloc);
      }

      // --- Accounts for monthly mix ---
      const accounts = await supabase
        .from("accounts")
        .select("balance, type, institution_name")
        .eq("user_id", user.userId)
        .limit(100);

      if (!accounts.error && Array.isArray(accounts.data) && accounts.data.length) {
        const total = accounts.data.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
        const need = Math.round(total * 0.5);
        const want = Math.round(total * 0.3);
        const save = Math.round(total * 0.2);
        if (isMounted) setMonthlyMix([
          { month: "Jan", needs: need, wants: want, savings: save },
          { month: "Feb", needs: Math.round(need * 1.02), wants: Math.round(want * 0.98), savings: Math.round(save * 1.01) },
          { month: "Mar", needs: Math.round(need * 1.01), wants: Math.round(want * 1.01), savings: Math.round(save * 1.02) },
        ]);
      } else {
        if (isMounted) setMonthlyMix(fallbackMonthly);
      }

    } finally {
      if (isMounted) setLoadingAgg(false);
    }
  })();

  return () => { isMounted = false; };
}, [user?.userId]);


  const cashData = cashSeries.map((y, i) => ({ x: i + 1, y }));

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Auth user email */}
      <Animated.View entering={FadeInUp.duration(320)}>
        <Card>
          <Text style={s.h1}>Account</Text>
          {authLoading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ fontWeight: "700" }}>{authEmail ?? "Not signed in"}</Text>
          )}
        </Card>
      </Animated.View>

      {/* Market snapshot */}
      <Animated.View entering={FadeInUp.duration(340)}>
        <Card>
          <Text style={s.h1}>Market snapshot</Text>
          <View style={{ gap: 8, marginTop: 6 }}>
            {symbols.map((sym) => (
              <View key={`snap-${sym}`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700" }}>{sym}</Text>
                <Text>
                  ${marketSnapshot.details[sym]?.price}  ({marketSnapshot.details[sym]?.change}%)
                </Text>
              </View>
            ))}
            <Text style={{ color: "#6B7280", marginTop: 4 }}>
              Focus: {symbols.map((s) => marketSnapshot.details[s].focus).join(" • ")}
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Holdings-based headlines */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <Card>
          <Text style={s.h1}>Insights — stocks & ETFs to watch</Text>
          {loadingSymbols ? (
            <ActivityIndicator />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {symbols.map((sym) => (
                <View key={sym} style={s.badge}><Text style={s.badgeText}>{sym}</Text></View>
              ))}
            </View>
          )}

          {loadingNews ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : (
            <View style={{ gap: 12, marginTop: 10 }}>
              {symbols.map((sym) => (
                <View key={`sec-${sym}`}>
                  <Text style={s.symbolTitle}>{sym}</Text>
                  {!newsBySymbol[sym] || newsBySymbol[sym].length === 0 ? (
                    <Text style={{ color: "#6B7280" }}>No recent headlines.</Text>
                  ) : (
                    newsBySymbol[sym].map((n, i) => (
                      <Pressable
                        key={`${sym}-${i}`}
                        onPress={() => n.url && Linking.openURL(n.url)}
                        style={{ marginTop: 4 }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            fontWeight: "700",
                            color: "#2563eb",
                            textDecorationLine: "underline",
                          }}
                        >
                          {n.title}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Cash flow (7d) */}
      <Animated.View entering={FadeInUp.duration(420)}>
        <Card>
          <Text style={s.h1}>Cash flow (7d)</Text>
          <Text style={{ fontWeight: "700", color: "#16a34a", marginBottom: 8 }}>
            Total Received: {formatMoney(received7d, currency)}
          </Text>
          {loadingAgg ? (
            <ActivityIndicator />
          ) : (
            <>
              <View style={{ marginTop: 8, gap: 8 }}>
                {receivedTransactions.length > 0 ? (
                  receivedTransactions.map((tx, i) => (
                    <View key={`tx-${i}`} style={{ 
                      backgroundColor: "#f0fdf4", 
                      padding: 12, 
                      borderRadius: 8, 
                      borderLeftWidth: 3, 
                      borderLeftColor: "#16a34a" 
                    }}>
                      <Text style={{ fontWeight: "700", color: "#15803d", fontSize: 16 }}>
                        {formatMoney(tx.amount, currency)}
                      </Text>
                      <Text style={{ color: "#374151", fontWeight: "600" }}>
                        {tx.description || "Financial Institution"}
                      </Text>
                      <Text style={{ color: "#6B7280", fontSize: 12 }}>
                        {tx.category || "Income"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: "#6B7280" }}>No received transactions in last 7 days.</Text>
                )}
              </View>
              <CompactChart height={170}>
                {(w, h) => (
                  <VictoryChart 
                    width={w} 
                    height={h} 
                    padding={{ left: 36, right: 10, top: 8, bottom: 22 }} 
                    containerComponent={<VictoryContainer responsive={false} />} 
                    animate={{ duration: 700 }}
                  >
                    <VictoryAxis 
                      dependentAxis 
                      tickFormat={(t: number) => `${formatMoney(t, currency)}`} 
                      style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }} 
                    />
                    <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                    <VictoryArea 
                      interpolation="natural" 
                      data={cashData} 
                      style={{ data: { fill: "#dbe7ff" } }} 
                    />
                    <VictoryLine 
                      interpolation="natural" 
                      data={cashData} 
                      style={{ data: { stroke: "#246BFD", strokeWidth: 2 } }} 
                    />
                  </VictoryChart>
                )}
              </CompactChart>
            </>
          )}
        </Card>
      </Animated.View>

      {/* 50/30/20 — current vs goal */}
      <Animated.View entering={FadeInUp.delay(120).duration(420)}>
        <Card>
          <Text style={s.h1}>50/30/20 — current vs goal</Text>
          {loadingAgg ? (
            <ActivityIndicator />
          ) : (
            <>
              <CompactChart height={150}>
                {(w, h) => (
                  <VictoryPie
                    width={w} 
                    height={h} 
                    innerRadius={48} 
                    padAngle={2} 
                    labelRadius={h/2-16} 
                    animate={{ duration: 700 }}
                    data={allocation}
                    colorScale={["#246BFD","#5b76f7","#9db7ff"]}
                    labels={({ datum }: { datum: any }) => `${datum.x} ${datum.y}%`}
                    style={{ labels: { fontSize: 10, fill: "#111827" } }}
                  />
                )}
              </CompactChart>
              {/* Amounts with currency */}
              <View style={{ marginTop: 8, gap: 6 }}>
                <View style={s.rowBetween}>
                  <Text style={s.kvKey}>Needs</Text>
                  <Text style={s.kvVal}>
                    {formatMoney(spentNeeds || 1200, currency)} · {allocation.find(a=>a.x==="Needs")?.y ?? 0}%
                  </Text>
                </View>
                <View style={s.rowBetween}>
                  <Text style={s.kvKey}>Wants</Text>
                  <Text style={s.kvVal}>
                    {formatMoney(spentWants || 700, currency)} · {allocation.find(a=>a.x==="Wants")?.y ?? 0}%
                  </Text>
                </View>
                <View style={s.rowBetween}>
                  <Text style={s.kvKey}>Savings</Text>
                  <Text style={s.kvVal}>
                    {formatMoney(spentSavings || 400, currency)} · {allocation.find(a=>a.x==="Savings")?.y ?? 0}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </Card>
      </Animated.View>

      {/* Monthly mix (stacked) */}
      <Animated.View entering={FadeInUp.delay(220).duration(420)}>
        <Card>
          <Text style={s.h1}>Monthly mix (stacked)</Text>
          {loadingAgg ? (
            <ActivityIndicator />
          ) : (
            <>
              <CompactChart height={190}>
                {(w,h) => (
                  <VictoryChart 
                    width={w} 
                    height={h} 
                    padding={{ left:44,right:12,top:8,bottom:28 }} 
                    domainPadding={{ x:16 }} 
                    containerComponent={<VictoryContainer responsive={false} />} 
                    animate={{ duration:700 }}
                  >
                    <VictoryAxis 
                      dependentAxis 
                      tickFormat={(t:number)=>`${formatMoney(t, currency)}`} 
                      style={{ grid:{stroke:"#EEF2F7"}, tickLabels:{fontSize:9}}} 
                    />
                    <VictoryAxis style={{ tickLabels:{ fontSize:9 } }} />
                    <VictoryGroup offset={0} style={{ data: { width: 18 } }}>
                      <VictoryBar data={monthlyMix} x="month" y="needs" style={{ data:{ fill:"#246BFD" } }} />
                      <VictoryBar data={monthlyMix} x="month" y="wants" style={{ data:{ fill:"#5b76f7" } }} />
                      <VictoryBar data={monthlyMix} x="month" y="savings" style={{ data:{ fill:"#9db7ff" } }} />
                    </VictoryGroup>
                  </VictoryChart>
                )}
              </CompactChart>
              {/* Sample category split */}
              <View style={{ marginTop: 8, gap: 6 }}>
                {Object.entries(marketSnapshot.mix).map(([cat, pct], i) => {
                  // Example amounts – base your calc on monthlyMix[0] or random scaling
                  const base = monthlyMix[0]?.needs + monthlyMix[0]?.wants + monthlyMix[0]?.savings || 2000;
                  const amt = (pct / 100) * base;
                  return (
                    <View key={`mix-${i}`} style={s.rowBetween}>
                      <Text style={s.kvKey}>{cat}</Text>
                      <Text style={s.kvVal}>{formatMoney(amt, currency)} · {pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  badge: { backgroundColor: "#EEF4FF", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { color: "#1f2937", fontWeight: "700" },
  symbolTitle: { fontWeight: "800", marginTop: 10, marginBottom: 6 },
  badgePill: { backgroundColor: "#EEF4FF", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgePillText: { color: "#1f2937", fontWeight: "700", fontSize: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kvKey: { fontWeight: "700", color: "#111827" },
  kvVal: { fontWeight: "700", color: "#246BFD" },
});