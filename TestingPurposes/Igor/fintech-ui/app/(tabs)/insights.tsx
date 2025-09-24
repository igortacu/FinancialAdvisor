import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryPie,
  VictoryGroup,
  VictoryContainer,
  ChartsReady,
} from "@/lib/charts";
import { cashFlow7d, allocation502030, monthlySpend } from "@/constants/mock";
import { supabase } from "../../api";

export default function Insights() {
  const insets = useSafeAreaInsets();

  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [loadingSymbols, setLoadingSymbols] = React.useState<boolean>(false);
  const [newsBySymbol, setNewsBySymbol] = React.useState<Record<string, { title: string; url: string }[]>>({});
  const [loadingNews, setLoadingNews] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingSymbols(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("investments")
          .select("symbol")
          .not("symbol", "is", null);
        if (error) throw error;
        const unique = Array.from(new Set((data ?? []).map((r: any) => String(r.symbol).trim()).filter(Boolean)));
        if (isMounted) setSymbols(unique.length ? unique.slice(0, 5) : ["AAPL", "MSFT", "SPY"]);
      } catch (e: any) {
        if (isMounted) {
          setSymbols(["AAPL", "MSFT", "SPY"]);
          setError(e?.message ?? "Failed to read investments");
        }
      } finally {
        if (isMounted) setLoadingSymbols(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!symbols.length) return;
    let isMounted = true;
    (async () => {
      setLoadingNews(true);
      try {
        // Use finnhub demo for simplicity; fetch limited items per symbol
        const results = await Promise.all(
          symbols.slice(0, 5).map(async (sym) => {
            try {
              const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=2024-01-01&to=2025-12-31&token=demo`);
              const json = await res.json();
              const items = Array.isArray(json)
                ? json.slice(0, 3).map((n: any) => ({ title: String(n.headline ?? n.title ?? ""), url: String(n.url ?? "") }))
                : ([] as { title: string; url: string }[]);
              return [sym, items] as const;
            } catch {
              return [sym, [] as { title: string; url: string }[]] as const;
            }
          })
        );
        if (isMounted) {
          const map: Record<string, { title: string; url: string }[]> = {};
          results.forEach(([sym, items]) => (map[sym] = items.length ? items : ([{ title: `${sym}: potential opportunity — check recent momentum and volume`, url: "" }] as { title: string; url: string }[])));
          setNewsBySymbol(map);
        }
      } finally {
        if (isMounted) setLoadingNews(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [symbols]);

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Investment news based on your holdings (simple REST) */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <Card>
          <Text style={s.h1}>Insights — stocks & ETFs to watch</Text>
          {loadingSymbols ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {symbols.map((sym) => (
                <View key={sym} style={s.badge}><Text style={s.badgeText}>{sym}</Text></View>
              ))}
            </View>
          )}

          {loadingNews ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 10 }}>
              {symbols.map((sym) => (
                <View key={`sec-${sym}`}>
                  <Text style={s.symbolTitle}>{sym}</Text>
                  {!newsBySymbol[sym] || newsBySymbol[sym].length === 0 ? (
                    <Text style={{ color: "#6B7280" }}>No recent headlines.</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {newsBySymbol[sym].map((n, i) => (
                        <TouchableOpacity key={`${sym}-${i}`} onPress={() => n.url && Linking.openURL(n.url)}>
                          <Text numberOfLines={2} style={{ fontWeight: "700" }}>{n.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
      </Animated.View>

      {!ChartsReady ? (
        <Card>
          <Text style={{ fontWeight: "800" }}>Charts unavailable</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Install victory, victory-native, react-native-svg. Then run: npx
            expo start -c
          </Text>
        </Card>
      ) : (
        <>
          {/* Cash flow */}
          <Animated.View entering={FadeInUp.duration(420)}>
            <Card>
              <Text style={s.h1}>Cash flow (7d)</Text>
              <CompactChart height={160}>
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
                      tickFormat={(t: number) => `$${t}`}
                      style={{
                        grid: { stroke: "#EEF2F7" },
                        tickLabels: { fontSize: 9 },
                      }}
                    />
                    <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                    <VictoryArea
                      interpolation="natural"
                      data={cashFlow7d}
                      style={{ data: { fill: "#dbe7ff" } }}
                    />
                    <VictoryLine
                      interpolation="natural"
                      data={cashFlow7d}
                      style={{ data: { stroke: "#246BFD", strokeWidth: 2 } }}
                    />
                  </VictoryChart>
                )}
              </CompactChart>
            </Card>
          </Animated.View>

          {/* 50/30/20 pies */}
          <Animated.View entering={FadeInUp.delay(120).duration(420)}>
            <Card>
              <Text style={s.h1}>50/30/20 — current vs goal</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <CompactChart height={150}>
                  {(w, h) => (
                    <VictoryPie
                      width={w}
                      height={h}
                      innerRadius={48}
                      padAngle={2}
                      labelRadius={h / 2 - 16}
                      animate={{ duration: 800 }}
                      data={allocation502030}
                      colorScale={["#246BFD", "#5b76f7", "#9db7ff"]}
                      labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                      style={{ labels: { fontSize: 10, fill: "#111827" } }}
                    />
                  )}
                </CompactChart>

                <CompactChart height={150}>
                  {(w, h) => (
                    <VictoryPie
                      width={w}
                      height={h}
                      innerRadius={48}
                      padAngle={2}
                      labelRadius={h / 2 - 16}
                      animate={{ duration: 800 }}
                      data={[
                        { x: "Needs", y: 50 },
                        { x: "Wants", y: 30 },
                        { x: "Savings", y: 20 },
                      ]}
                      colorScale={["#C7D2FE", "#E0E7FF", "#F3F4FF"]}
                      labels={({ datum }: any) => `${datum.y}%`}
                      style={{ labels: { fontSize: 9, fill: "#6B7280" } }}
                    />
                  )}
                </CompactChart>
              </View>
            </Card>
          </Animated.View>

          {/* Monthly stacked bars */}
          <Animated.View entering={FadeInUp.delay(220).duration(420)}>
            <Card>
              <Text style={s.h1}>Monthly mix (stacked)</Text>
              <CompactChart height={180}>
                {(w, h) => (
                  <VictoryChart
                    width={w}
                    height={h}
                    padding={{ left: 44, right: 12, top: 8, bottom: 28 }}
                    domainPadding={{ x: 16 }}
                    containerComponent={<VictoryContainer responsive={false} />}
                    animate={{ duration: 700 }}
                  >
                    <VictoryAxis
                      dependentAxis
                      tickFormat={(t: number) => `$${t}`}
                      style={{
                        grid: { stroke: "#EEF2F7" },
                        tickLabels: { fontSize: 9 },
                      }}
                    />
                    <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                    <VictoryGroup offset={0} style={{ data: { width: 18 } }}>
                      <VictoryBar
                        data={monthlySpend}
                        x="month"
                        y="needs"
                        style={{ data: { fill: "#246BFD" } }}
                      />
                      <VictoryBar
                        data={monthlySpend}
                        x="month"
                        y="wants"
                        style={{ data: { fill: "#5b76f7" } }}
                      />
                      <VictoryBar
                        data={monthlySpend}
                        x="month"
                        y="savings"
                        style={{ data: { fill: "#9db7ff" } }}
                      />
                    </VictoryGroup>
                  </VictoryChart>
                )}
              </CompactChart>
            </Card>
          </Animated.View>
        </>
      )}
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
