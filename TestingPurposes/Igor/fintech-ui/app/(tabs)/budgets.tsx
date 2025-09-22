import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import { categories } from "@/constants/mock";

export default function Budgets() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
    >
      {categories.map((c, i) => {
        const pct = Math.round((c.spent / c.limit) * 100);
        return (
          <Animated.View
            key={c.id}
            entering={FadeInUp.delay(60 + i * 60)}
            style={{ marginBottom: 12 }}
          >
            <Card>
              <View style={s.row}>
                <Text style={s.name}>{c.name}</Text>
                <Switch value={pct >= 90} />
              </View>
              <Text style={s.num}>
                ${c.spent.toFixed(0)} / ${c.limit.toFixed(0)}
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
              <Text style={s.hint}>
                {pct >= 90 ? "Alert: near limit" : "Healthy"}
              </Text>
            </Card>
          </Animated.View>
        );
      })}
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
  num: { marginTop: 6, fontWeight: "600" },
  hint: { marginTop: 8, color: "#6B7280", fontSize: 12 },
});
