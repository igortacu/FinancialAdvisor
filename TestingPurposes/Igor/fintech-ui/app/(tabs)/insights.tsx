import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from "react-native";
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

  // headlines (still simple REST)
  React.useEffect(() => {
    if (!symbols.length) return;
    let isMounted = true;
    (async () => {
      setLoadingNews(true);
      try {
        const results = await Promise.all(
          symbols.slice(0, 5).map(async (sym) => {
            try {
              const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=2024-01-01&to=2025-12-31&token=demo`);
              const json = await res.json();
              const items = Array.isArray(json)
                ? json.slice(0, 3).map((n: any) => ({ title: String(n.headline ?? n.title ?? ""), url: String(n.url ?? "") }))
                : ([] as { title: string; url: string }[]);
              return [sym, items] as const;
            } catch { return [sym, [] as { title: string; url: string }[]] as const; }
          })
        );
        if (isMounted) {
          const map: Record<SymbolKey, { title: string; url: string }[]> = {} as any;
          results.forEach(([sym, items]) => (map[sym as SymbolKey] = items));
          setNewsBySymbol(map);
        }
      } finally { if (isMounted) setLoadingNews(false); }
    })();
    return () => { isMounted = false; };
  }, [symbols]);

  // user-scoped aggregates from Transactions, Budgets, Accounts
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!user?.userId) return;
      setLoadingAgg(true);
      try {
        const tx = await supabase
          .from("transactions")
          .select("date, amount")
          .eq("user_id", user.userId)
          .order("date", { ascending: true })
          .limit(30);
        if (!tx.error && Array.isArray(tx.data) && tx.data.length) {
          const amounts = tx.data.slice(-7).map((t: any) => Number(t.amount) || 0);
          if (amounts.length >= 3 && isMounted) setCashSeries(amounts);
        }

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
        }

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
                      <TouchableOpacity key={`${sym}-${i}`} onPress={() => n.url && Linking.openURL(n.url)}>
                        <Text numberOfLines={2} style={{ fontWeight: "700" }}>{n.title}</Text>
                      </TouchableOpacity>
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
          {loadingAgg ? (
            <ActivityIndicator />
          ) : (
            <CompactChart height={160}>
              {(w, h) => (
                <VictoryChart width={w} height={h} padding={{ left: 36, right: 10, top: 8, bottom: 22 }} containerComponent={<VictoryContainer responsive={false} />} animate={{ duration: 700 }}>
                  <VictoryAxis dependentAxis tickFormat={(t: number) => `$${t}`} style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 9 } }} />
                  <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryArea interpolation="natural" data={cashData} style={{ data: { fill: "#dbe7ff" } }} />
                  <VictoryLine interpolation="natural" data={cashData} style={{ data: { stroke: "#246BFD", strokeWidth: 2 } }} />
                </VictoryChart>
              )}
            </CompactChart>
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
            <CompactChart height={150}>
              {(w, h) => (
                <VictoryPie
                  width={w} height={h} innerRadius={48} padAngle={2} labelRadius={h/2-16} animate={{ duration: 700 }}
                  data={allocation}
                  colorScale={["#246BFD","#5b76f7","#9db7ff"]}
                  labels={({ datum }: { datum: any }) => `${datum.x}\n${datum.y}%`}
                  style={{ labels: { fontSize: 10, fill: "#111827" } }}
                />
              )}
            </CompactChart>
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
            <CompactChart height={180}>
              {(w,h) => (
                <VictoryChart width={w} height={h} padding={{ left:44,right:12,top:8,bottom:28 }} domainPadding={{ x:16 }} containerComponent={<VictoryContainer responsive={false} />} animate={{ duration:700 }}>
                  <VictoryAxis dependentAxis tickFormat={(t:number)=>`$${t}`} style={{ grid:{stroke:"#EEF2F7"}, tickLabels:{fontSize:9}}} />
                  <VictoryAxis style={{ tickLabels:{ fontSize:9 } }} />
                  <VictoryGroup offset={0} style={{ data: { width: 18 } }}>
                    <VictoryBar data={monthlyMix} x="month" y="needs" style={{ data:{ fill:"#246BFD" } }} />
                    <VictoryBar data={monthlyMix} x="month" y="wants" style={{ data:{ fill:"#5b76f7" } }} />
                    <VictoryBar data={monthlyMix} x="month" y="savings" style={{ data:{ fill:"#9db7ff" } }} />
                  </VictoryGroup>
                </VictoryChart>
              )}
            </CompactChart>
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
});
