import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from "react-native";
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
  ChartsReady,
} from "@/lib/charts";
import { positions } from "@/constants/mock";
import { supabase } from "../../api";

export default function Investments() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [investments, setInvestments] = React.useState<Array<any>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<Array<{ title: string; url: string }>>([]);
  const [loadingSug, setLoadingSug] = React.useState<boolean>(false);
  const [sugError, setSugError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from("investments").select("*").order("id", { ascending: false });
        if (error) throw error;
        if (isMounted) setInvestments(data ?? []);
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? "Failed to load investments");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    (async () => {
      setLoadingSug(true);
      setSugError(null);
      try {
        const res = await fetch("https://finnhub.io/api/v1/news?category=general&token=demo");
        const json = await res.json();
        const items = Array.isArray(json)
          ? json.slice(0, 5).map((n: any) => ({ title: String(n.headline ?? n.title ?? ""), url: String(n.url ?? "") }))
          : [];
        if (isMounted) setSuggestions(items);
      } catch (e: any) {
        if (isMounted) setSugError(e?.message ?? "Failed to load suggestions");
      } finally {
        if (isMounted) setLoadingSug(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
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
          {/* Allocation */}
          <Animated.View entering={FadeInUp.duration(380)}>
            <Card>
              <Text style={s.h1}>Allocation</Text>
              <CompactChart height={160}>
                {(w, h) => (
                  <VictoryPie
                    width={w}
                    height={h}
                    innerRadius={52}
                    padAngle={2}
                    labelRadius={h / 2 - 16}
                    animate={{ duration: 800 }}
                    data={[
                      { x: "Equity", y: 65 },
                      { x: "ETF", y: 25 },
                      { x: "Cash", y: 10 },
                    ]}
                    colorScale={["#246BFD", "#5b76f7", "#9db7ff"]}
                    labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                    style={{ labels: { fontSize: 10, fill: "#111827" } }}
                  />
                )}
              </CompactChart>
            </Card>
          </Animated.View>

          {/* Performance line */}
          <Animated.View entering={FadeInUp.delay(120).duration(380)}>
            <Card>
              <Text style={s.h1}>Portfolio performance</Text>
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
                      tickFormat={(t: number) => `$${t}`}
                      style={{
                        grid: { stroke: "#EEF2F7" },
                        tickLabels: { fontSize: 9 },
                      }}
                    />
                    <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
                    <VictoryLine
                      data={[
                        { x: 1, y: 100 },
                        { x: 2, y: 110 },
                        { x: 3, y: 108 },
                        { x: 4, y: 116 },
                        { x: 5, y: 124 },
                        { x: 6, y: 131 },
                        { x: 7, y: 137 },
                      ]}
                      style={{ data: { stroke: "#246BFD", strokeWidth: 2 } }}
                    />
                  </VictoryChart>
                )}
              </CompactChart>
            </Card>
          </Animated.View>

          {/* Positions with sparklines */}
          <Animated.View entering={FadeInUp.delay(220).duration(380)}>
            <Card>
              <Text style={s.h1}>Positions</Text>
              <View style={{ marginTop: 8, gap: 10 }}>
                {positions.map((p) => (
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
                        {p.change}%
                      </Text>
                    </View>

                    <View style={{ flexBasis: 120 }}>
                      <CompactChart height={40}>
                        {(w, h) => (
                          <VictoryChart
                            width={w}
                            height={h}
                            padding={{ left: 8, right: 8, top: 8, bottom: 8 }}
                            containerComponent={
                              <VictoryContainer responsive={false} />
                            }
                            animate={{ duration: 600 }}
                          >
                            <VictoryLine
                              data={p.data.map((y, i) => ({ x: i + 1, y }))}
                              style={{
                                data: { stroke: "#5b76f7", strokeWidth: 1.3 },
                              }}
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

          {/* Investments from Supabase */}
          <Animated.View entering={FadeInUp.delay(320).duration(380)}>
            <Card>
              <Text style={s.h1}>Your investments</Text>
              {loading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : error ? (
                <Text style={{ color: "#ef4444", marginTop: 8 }}>{error}</Text>
              ) : investments.length === 0 ? (
                <Text style={{ color: "#6B7280", marginTop: 8 }}>No investments yet.</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 10 }}>
                  {investments.map((inv) => (
                    <View key={inv.id} style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.symbol}>{inv.symbol ?? inv.name ?? "Instrument"}</Text>
                        {inv.quantity != null && (
                          <Text style={{ color: "#6B7280", marginTop: 2 }}>
                            Qty: {inv.quantity} @ ${inv.avg_price ?? inv.price ?? "-"}
                          </Text>
                        )}
                      </View>
                      {inv.current_price != null && (
                        <Text style={{ fontWeight: "800" }}>${inv.current_price}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Suggestions (brief) */}
          <Animated.View entering={FadeInUp.delay(400).duration(380)}>
            <Card>
              <Text style={s.h1}>Suggestions</Text>
              {loadingSug ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator />
                </View>
              ) : sugError ? (
                <Text style={{ color: "#ef4444" }}>{sugError}</Text>
              ) : suggestions.length === 0 ? (
                <Text style={{ color: "#6B7280" }}>No suggestions available.</Text>
              ) : (
                <View style={{ gap: 10, marginTop: 8 }}>
                  {suggestions.map((sug, idx) => (
                    <TouchableOpacity key={`${idx}-${sug.url}`} onPress={() => sug.url && Linking.openURL(sug.url)}>
                      <Text numberOfLines={2} style={{ fontWeight: "700" }}>{sug.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>
        </>
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
});
