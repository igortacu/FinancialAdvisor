import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import Victory, { HasVictory } from "../../lib/victory";
import { cashFlow7d, allocation502030, monthlySpend } from "@/constants/mock";

const {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryPie,
  VictoryGroup,
} = Victory;

export default function Insights() {
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
          <Animated.View entering={FadeInUp.duration(420)}>
            <Card>
              <Text style={s.h1}>Cash flow (7d)</Text>
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
                <VictoryAxis
                  tickFormat={(t: number) => `D${t}`}
                  style={{ tickLabels: { fontSize: 10 } }}
                />
                <VictoryArea
                  interpolation="natural"
                  data={cashFlow7d}
                  style={{ data: { fill: "#cfe3ff" } }}
                />
                <VictoryLine
                  interpolation="natural"
                  data={cashFlow7d}
                  style={{ data: { stroke: "#246BFD", strokeWidth: 2.5 } }}
                />
              </VictoryChart>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(420)}>
            <Card>
              <Text style={s.h1}>50/30/20 — current vs goal</Text>
              <View style={s.row}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <VictoryPie
                    height={210}
                    innerRadius={58}
                    padAngle={2}
                    animate={{ duration: 900 }}
                    data={allocation502030}
                    colorScale={["#246BFD", "#5b76f7", "#9db7ff"]}
                    labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                    style={{ labels: { fontSize: 12, fill: "#111827" } }}
                  />
                  <Text style={s.hint}>Current</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <VictoryPie
                    height={210}
                    innerRadius={58}
                    padAngle={2}
                    animate={{ duration: 900 }}
                    data={[
                      { x: "Needs", y: 50 },
                      { x: "Wants", y: 30 },
                      { x: "Savings", y: 20 },
                    ]}
                    colorScale={["#C7D2FE", "#E0E7FF", "#F3F4FF"]}
                    labels={({ datum }: any) => `${datum.y}%`}
                    style={{ labels: { fontSize: 11, fill: "#6B7280" } }}
                  />
                  <Text style={s.hint}>Goal</Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220).duration(420)}>
            <Card>
              <Text style={s.h1}>Monthly mix (stacked)</Text>
              <VictoryChart
                padding={{ left: 50, right: 18, top: 12, bottom: 40 }}
                height={240}
                animate={{ duration: 800 }}
                domainPadding={{ x: 24 }}
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
                <VictoryGroup offset={0} style={{ data: { width: 26 } }}>
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
  row: { flexDirection: "row", gap: 8 },
  hint: { color: "#6B7280", fontSize: 12, marginTop: 4 },
});
