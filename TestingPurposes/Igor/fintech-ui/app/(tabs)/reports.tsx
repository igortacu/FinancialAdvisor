import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";

export default function Reports() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
    >
      <Animated.View entering={FadeInUp.duration(380)}>
        <Card>
          <Text style={s.h1}>Spending by category</Text>
          <View style={s.chart} />
          <Text style={s.hint}>Pie placeholder</Text>
        </Card>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(120).duration(380)}
        style={{ marginTop: 12 }}
      >
        <Card>
          <Text style={s.h1}>Cash flow</Text>
          <View style={s.chart} />
          <Text style={s.hint}>Bar/line placeholder</Text>
        </Card>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(220).duration(380)}
        style={{ marginTop: 12 }}
      >
        <Card>
          <Text style={s.h1}>Monthly summary</Text>
          <View style={{ marginTop: 10 }}>
            {[
              { k: "Income", v: "$1,200" },
              { k: "Expenses", v: "$345" },
              { k: "Savings", v: "$250" },
            ].map((i) => (
              <View key={i.k} style={s.row}>
                <Text style={{ fontWeight: "600" }}>{i.k}</Text>
                <Text style={{ fontWeight: "700" }}>{i.v}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800" },
  hint: { color: "#6B7280", marginTop: 6, fontSize: 12 },
  chart: {
    height: 160,
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
