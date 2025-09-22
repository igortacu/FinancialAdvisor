import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import Card from "@/components/Card";
import ListItem from "@/components/ListItem";
import { accounts } from "@/constants/mock";

export default function Accounts() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
    >
      <Animated.View entering={FadeInUp.duration(400)}>
        <Card>
          <Text style={s.h1}>Link a bank</Text>
          <Text style={s.sub}>
            Connect accounts to sync balances and transactions.
          </Text>
          <View style={{ height: 12 }} />
          {["Revolut", "ING", "Monzo", "Chase"].map((b, i) => (
            <Card
              key={b}
              onPress={() => {}}
              style={{
                padding: 12,
                marginBottom: i === 3 ? 0 : 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="link" size={18} />
              <Text style={{ fontWeight: "600" }}>{b}</Text>
              <Text
                style={{ color: "#9DA3AF", fontSize: 12, marginLeft: "auto" }}
              >
                Mock
              </Text>
            </Card>
          ))}
        </Card>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(120).duration(400)}
        style={{ marginTop: 14 }}
      >
        <Text style={s.h2}>Linked</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {accounts.map((a, i) => (
            <Animated.View key={a.id} entering={FadeInUp.delay(150 + i * 40)}>
              <ListItem
                left={
                  <View style={s.icon}>
                    <Ionicons name="card" size={18} />
                  </View>
                }
                title={`${a.bank} — ${a.type}`}
                subtitle="Synced hourly"
                right={
                  <Text style={{ fontWeight: "700" }}>
                    ${a.balance.toFixed(2)}
                  </Text>
                }
              />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 18, fontWeight: "800" },
  h2: { fontSize: 14, fontWeight: "800" },
  sub: { marginTop: 6, color: "#6B7280" },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
});
