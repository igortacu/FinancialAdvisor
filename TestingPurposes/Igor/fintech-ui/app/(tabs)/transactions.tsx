import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "@/components/Card";
import { useTx } from "@/state/transactions";

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const { state } = useTx();

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
    >
      {state.list.map((t) => (
        <Card key={t.id}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t.merchant}</Text>
              <Text style={s.sub}>
                {new Date(t.date).toLocaleString()} • {t.category} • {t.source}
              </Text>
            </View>
            <Text
              style={[
                s.amount,
                { color: t.amount < 0 ? "#ef4444" : "#16a34a" },
              ]}
            >
              {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
            </Text>
          </View>
          {t.note ? <Text style={s.note}>{t.note}</Text> : null}
        </Card>
      ))}
      {state.list.length === 0 && (
        <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 40 }}>
          No transactions yet. Tap Scan to add one.
        </Text>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontWeight: "800" },
  sub: { color: "#6B7280", marginTop: 2 },
  amount: { fontWeight: "800" },
  note: { color: "#6B7280", marginTop: 8 },
});
