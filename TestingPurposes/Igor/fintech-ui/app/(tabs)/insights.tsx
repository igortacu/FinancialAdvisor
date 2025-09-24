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

export default function Insights() {
  const insets = useSafeAreaInsets();
  const [loadingNews, setLoadingNews] = React.useState<boolean>(false);
  const [news, setNews] = React.useState<Array<{ title: string; url: string }>>([]);
  const [newsError, setNewsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingNews(true);
      setNewsError(null);
      try {
        // Simple REST: finnhub demo news endpoint (financial news)
        // This uses their demo token, returns generic market news
        const res = await fetch("https://finnhub.io/api/v1/news?category=general&token=demo");
        const json = await res.json();
        const items = Array.isArray(json)
          ? json.slice(0, 6).map((n: any) => ({ title: String(n.headline ?? n.title ?? ""), url: String(n.url ?? "") }))
          : [];
        if (isMounted) setNews(items);
      } catch (e: any) {
        if (isMounted) setNewsError(e?.message ?? "Failed to load news");
      } finally {
        if (isMounted) setLoadingNews(false);
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
      {/* Investment news (brief) */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <Card>
          <Text style={s.h1}>Investment news</Text>
          {loadingNews ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : newsError ? (
            <Text style={{ color: "#ef4444" }}>{newsError}</Text>
          ) : news.length === 0 ? (
            <Text style={{ color: "#6B7280" }}>No news available.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {news.map((n, idx) => (
                <TouchableOpacity key={`${idx}-${n.url}`} onPress={() => n.url && Linking.openURL(n.url)}>
                  <Text numberOfLines={2} style={{ fontWeight: "700" }}>{n.title}</Text>
                </TouchableOpacity>
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
});
