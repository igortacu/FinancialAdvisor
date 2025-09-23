import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import {
  VictoryChart,
  VictoryAxis,
  VictoryGroup,
  VictoryBar,
  VictoryPie,
  ChartsReady,
} from "../../lib/charts";
import { allocation502030, monthlySpend } from "@/constants/mock";

function KPI({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: "#6B7280", fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 4 }}>
        {value}
      </Text>
      {delta ? (
        <Text
          style={{
            color: delta.startsWith("+") ? "#16a34a" : "#ef4444",
            marginTop: 2,
          }}
        >
          {delta}
        </Text>
      ) : null}
    </Card>
  );
}

export default function Analytics() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInUp.duration(380)}
        style={{ flexDirection: "row", gap: 12 }}
      >
        <KPI label="Income (M)" value="$4,100" delta="+3.2%" />
        <KPI label="Expenses (M)" value="$2,320" delta="-1.1%" />
      </Animated.View>

      {!ChartsReady ? (
        <Card>
          <Text style={{ fontWeight: "800" }}>Charts unavailable</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Install <Text style={{ fontWeight: "700" }}>victory</Text>,{" "}
            <Text style={{ fontWeight: "700" }}>victory-native</Text> and{" "}
            <Text style={{ fontWeight: "700" }}>react-native-svg</Text>. Then
            run
            <Text style={{ fontWeight: "700" }}> npx expo start -c</Text>.
          </Text>
        </Card>
      ) : (
        <>
          <Animated.View entering={FadeInUp.delay(100).duration(420)}>
            <Card>
              <Text style={s.h1}>Category share</Text>
              <View style={{ alignItems: "center" }}>
                <VictoryPie
                  height={220}
                  innerRadius={60}
                  padAngle={2}
                  animate={{ duration: 900 }}
                  data={[
                    { x: "Bills", y: 34 },
                    { x: "Groceries", y: 26 },
                    { x: "Transport", y: 14 },
                    { x: "Fun", y: 12 },
                    { x: "Other", y: 14 },
                  ]}
                  colorScale={[
                    "#246BFD",
                    "#5b76f7",
                    "#9db7ff",
                    "#cfe3ff",
                    "#e5edff",
                  ]}
                  labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                  style={{ labels: { fontSize: 12, fill: "#111827" } }}
                />
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(420)}>
            <Card>
              <Text style={s.h1}>50/30/20 adherence (monthly)</Text>
              <VictoryChart
                padding={{ left: 50, right: 18, top: 12, bottom: 40 }}
                height={240}
                animate={{ duration: 800 }}
                domainPadding={{ x: 24 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t: number) => `${t}%`}
                  style={{
                    grid: { stroke: "#EEF2F7" },
                    tickLabels: { fontSize: 10 },
                  }}
                />
                <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
                <VictoryGroup offset={0} style={{ data: { width: 26 } }}>
                  <VictoryBar
                    data={[
                      { x: "Jan", y: 52 },
                      { x: "Feb", y: 49 },
                      { x: "Mar", y: 51 },
                      { x: "Apr", y: 50 },
                    ]}
                    style={{ data: { fill: "#246BFD" } }}
                  />
                  <VictoryBar
                    data={[
                      { x: "Jan", y: 29 },
                      { x: "Feb", y: 31 },
                      { x: "Mar", y: 28 },
                      { x: "Apr", y: 30 },
                    ]}
                    style={{ data: { fill: "#5b76f7" } }}
                  />
                  <VictoryBar
                    data={[
                      { x: "Jan", y: 19 },
                      { x: "Feb", y: 20 },
                      { x: "Mar", y: 21 },
                      { x: "Apr", y: 20 },
                    ]}
                    style={{ data: { fill: "#9db7ff" } }}
                  />
                </VictoryGroup>
              </VictoryChart>
              <Text style={s.hint}>Bars: Needs • Wants • Savings</Text>
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
  hint: { color: "#6B7280", fontSize: 12, marginTop: 4 },
});
