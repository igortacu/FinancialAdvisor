import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import Victory, { HasVictory } from "../../lib/victory";
import { positions } from "@/constants/mock";

const { VictoryPie, VictoryChart, VictoryLine, VictoryAxis } = Victory;

export default function Investments() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
    >
      {!HasVictory ? (
        <Card>
          <Text style={{ fontWeight: "800" }}>Charts unavailable</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Install <Text style={{ fontWeight: "700" }}>victory-native</Text>{" "}
            and <Text style={{ fontWeight: "700" }}>react-native-svg</Text>.
          </Text>
        </Card>
      ) : (
        <>
          <Animated.View entering={FadeInUp.duration(380)}>
            <Card>
              <Text style={s.h1}>Allocation</Text>
              <View style={{ alignItems: "center" }}>
                <VictoryPie
                  height={220}
                  innerRadius={60}
                  padAngle={2}
                  animate={{ duration: 900 }}
                  data={[
                    { x: "Equity", y: 65 },
                    { x: "ETF", y: 25 },
                    { x: "Cash", y: 10 },
                  ]}
                  colorScale={["#246BFD", "#5b76f7", "#9db7ff"]}
                  labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                  style={{ labels: { fontSize: 12, fill: "#111827" } }}
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(380)}>
            <Card>
              <Text style={s.h1}>Portfolio performance</Text>
              <VictoryChart
                padding={{ left: 40, right: 18, top: 12, bottom: 28 }}
                height={200}
                animate={{ duration: 900 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t: number) => `$${t}`}
                  style={{
                    grid: { stroke: "#EEF2F7" },
                    tickLabels: { fontSize: 10 },
                  }}
                />
                <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
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
                  style={{ data: { stroke: "#246BFD", strokeWidth: 2.5 } }}
                />
              </VictoryChart>
            </Card>
          </Animated.View>

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
                    <View style={{ width: 120, height: 40 }}>
                      <VictoryChart
                        padding={{ left: 10, right: 10, top: 10, bottom: 10 }}
                        height={40}
                        animate={{ duration: 700 }}
                      >
                        <VictoryLine
                          data={p.data.map((y, i) => ({ x: i + 1, y }))}
                          style={{
                            data: { stroke: "#5b76f7", strokeWidth: 1.5 },
                          }}
                        />
                      </VictoryChart>
                    </View>
                  </View>
                ))}
              </View>
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
