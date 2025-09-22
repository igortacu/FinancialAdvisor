import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";

const goals = [
  { id: "g1", name: "Emergency fund", saved: 1800, target: 3000, eta: "5 mo" },
  { id: "g2", name: "MacBook", saved: 600, target: 1500, eta: "7 mo" },
  { id: "g3", name: "Trip", saved: 250, target: 800, eta: "3 mo" },
];

export default function Savings() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
    >
      {goals.map((g, i) => {
        const pct = Math.round((g.saved / g.target) * 100);
        return (
          <Animated.View
            key={g.id}
            entering={FadeInUp.delay(60 + i * 60)}
            style={{ marginBottom: 12 }}
          >
            <Card>
              <View style={s.row}>
                <Text style={s.name}>{g.name}</Text>
                <Text style={s.eta}>ETA {g.eta}</Text>
              </View>
              <Text style={s.num}>
                ${g.saved} / ${g.target}
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: "#EDF1F7",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <Animated.View
                  style={{
                    width: `${pct}%`,
                    height: 8,
                    backgroundColor: "#246BFD",
                  }}
                />
              </View>
            </Card>
          </Animated.View>
        );
      })}

      <Animated.View entering={FadeInUp.delay(260)} style={{ marginTop: 4 }}>
        <Card>
          <Text style={s.name}>Forecast</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Projection based on recent savings rate.
          </Text>
          <View style={s.chartBox} />
        </Card>
      </Animated.View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "800", fontSize: 16 },
  eta: { color: "#6B7280" },
  num: { marginTop: 6, fontWeight: "600" },
  chartBox: {
    height: 140,
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    marginTop: 12,
  },
});
