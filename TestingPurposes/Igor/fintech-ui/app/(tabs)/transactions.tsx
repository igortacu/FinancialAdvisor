import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInUp,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import Card from "@/components/Card";
import { tx } from "@/constants/mock";

type Mode = "All" | "Income" | "Expense";

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("All");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<"all" | "card" | "paypal" | "bank">(
    "all",
  );

  const list = useMemo(() => {
    return tx.filter((t) => {
      if (mode === "Income" && t.amount < 0) return false;
      if (mode === "Expense" && t.amount > 0) return false;
      if (method !== "all" && t.method !== method) return false;
      if (q && !`${t.name} ${t.note}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [mode, q, method]);

  const Fab = () => {
    const s = useSharedValue(1);
    const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }), []);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          s.value = 0.9;
          s.value = withSpring(1);
        }}
        style={st.fabWrap}
      >
        <Animated.View style={[st.fab, a]}>
          <Ionicons name="add" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = () => (
    <View style={{ width: 160, flexDirection: "row" }}>
      <RectButton style={[st.swipeBtn, { backgroundColor: "#F43F5E" }]}>
        <Ionicons name="trash" size={20} color="#fff" />
      </RectButton>
      <RectButton style={[st.swipeBtn, { backgroundColor: "#246BFD" }]}>
        <Ionicons name="create" size={20} color="#fff" />
      </RectButton>
    </View>
  );

  return (
    <View style={[st.root, { paddingTop: insets.top + 6 }]}>
      {/* Sticky header */}
      <View style={st.sticky}>
        <View style={st.segment}>
          {(["All", "Income", "Expense"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[st.segBtn, active && st.segActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[st.segTxt, active && st.segTxtActive]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={st.filters}>
          <View style={st.searchBox}>
            <Ionicons name="search" size={16} color="#6B7280" />
            <TextInput
              placeholder="Search name or note"
              placeholderTextColor="#9DA3AF"
              value={q}
              onChangeText={setQ}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <View style={st.methods}>
            {(["all", "card", "paypal", "bank"] as const).map((m) => {
              const active = method === m;
              const label =
                m === "all" ? "All" : m[0].toUpperCase() + m.slice(1);
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[st.methodChip, active && st.methodActive]}
                >
                  <Text style={[st.methodTxt, active && st.methodTxtActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {list.map((t, i) => (
          <Animated.View
            key={t.id}
            entering={FadeInUp.delay(60 + i * 30).duration(300)}
            style={{ marginBottom: 12 }}
          >
            <Swipeable
              renderRightActions={renderRightActions}
              overshootRight={false}
            >
              <Card>
                <View style={st.row}>
                  <View style={st.icon}>
                    <Ionicons
                      name={t.amount < 0 ? "arrow-down" : "arrow-up"}
                      size={18}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.title}>{t.name}</Text>
                    <Text style={st.sub}>
                      {t.note} • {t.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      st.amt,
                      { color: t.amount < 0 ? "#ef4444" : "#16a34a" },
                    ]}
                  >
                    {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                  </Text>
                </View>
              </Card>
            </Swipeable>
          </Animated.View>
        ))}
      </ScrollView>

      <Fab />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  sticky: { paddingHorizontal: 16, paddingBottom: 8 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#EEF2F7",
    borderRadius: 999,
    padding: 4,
    marginBottom: 10,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  segActive: { backgroundColor: "#fff" },
  segTxt: { fontWeight: "700", color: "#6B7280" },
  segTxtActive: { color: "#111827" },

  filters: { gap: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  methods: { flexDirection: "row", gap: 8 },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EEF2F7",
    borderRadius: 999,
  },
  methodActive: { backgroundColor: "#246BFD" },
  methodTxt: { fontWeight: "600", color: "#111827" },
  methodTxtActive: { color: "#fff" },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "700" },
  sub: { fontSize: 11, color: "#6B7280" },
  amt: { fontWeight: "800" },

  swipeBtn: { width: 80, justifyContent: "center", alignItems: "center" },

  fabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 78,
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#246BFD",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#246BFD",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
