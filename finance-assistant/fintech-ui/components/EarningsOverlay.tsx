import React from "react";
import { View, Text } from "react-native";

type Item = { symbol: string; date: string; quarter: string };

export default function EarningsOverlay({ items }: { items: Item[] }) {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View>
      <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>
        Upcoming Earnings (top spend)
      </Text>
      {sorted.length === 0 ? (
        <Text style={{ color: "#6B7280" }}>No dates found.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {sorted.map((r) => (
            <View
              key={`${r.symbol}-${r.date}`}
              style={{ padding: 10, borderRadius: 10, backgroundColor: "#F3F4F6" }}
            >
              <Text style={{ fontWeight: "800" }}>{r.symbol}</Text>
              <Text style={{ color: "#374151" }}>{r.date}</Text>
              <Text style={{ color: "#6B7280", fontSize: 12 }}>{r.quarter}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
