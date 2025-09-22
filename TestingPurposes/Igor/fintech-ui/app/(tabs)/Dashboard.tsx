import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Payment = {
  id: string;
  name: string;
  next: string;
  amount: string;
  icon: React.ReactNode;
};

const avatar = "https://i.pravatar.cc/100?img=12"; // replace with local asset if needed

const quickActions = [
  {
    id: "qa1",
    label: "Money Transfer",
    icon: <Ionicons name="swap-horizontal" size={22} />,
  },
  {
    id: "qa2",
    label: "Pay Bill",
    icon: <Ionicons name="document-text-outline" size={22} />,
  },
  {
    id: "qa3",
    label: "Bank to Bank",
    icon: <Ionicons name="business-outline" size={22} />,
  },
];

const services = [
  {
    id: "s1",
    label: "Recharge",
    icon: <Ionicons name="phone-portrait-outline" size={22} />,
  },
  {
    id: "s2",
    label: "Charity",
    icon: <Ionicons name="heart-outline" size={22} />,
  },
  { id: "s3", label: "Loan", icon: <Ionicons name="card-outline" size={22} /> },
  {
    id: "s4",
    label: "Gifts",
    icon: <Ionicons name="gift-outline" size={22} />,
  },
  {
    id: "s5",
    label: "Insur.",
    icon: <Ionicons name="shield-checkmark-outline" size={22} />,
  },
  {
    id: "s6",
    label: "More",
    icon: <Ionicons name="ellipsis-horizontal-circle-outline" size={22} />,
  },
];

const payments: Payment[] = [
  {
    id: "p1",
    name: "Netflix",
    next: "Next Payment: 12/04",
    amount: "$1.00 USD",
    icon: <MaterialCommunityIcons name="netflix" size={22} />,
  },
  {
    id: "p2",
    name: "Paypal",
    next: "Next Payment: 14/04",
    amount: "$3.50 USD",
    icon: <MaterialCommunityIcons name="paypal" size={22} />,
  },
  {
    id: "p3",
    name: "Spotify",
    next: "Next Payment: 13/04",
    amount: "$10.00 USD",
    icon: <MaterialCommunityIcons name="spotify" size={22} />,
  },
];

export default function Dashboard() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={styles.title}>Fintech</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Card */}
        <LinearGradient
          colors={["#3bb2f6", "#5b76f7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardMuted}>Available Balance</Text>
              <Text style={styles.balance}>$4,228.76</Text>
              <Text style={styles.cardDots}>**** **** **** 8635</Text>
            </View>
            <Ionicons name="card" size={28} color="white" />
          </View>

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardMeta}>Valid From 12/25</Text>
              <Text style={styles.cardMeta}>Valid Thru 10/30</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardMeta}>Card Holder</Text>
              <Text style={styles.holder}>Tacu Igor</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.rowBetween}>
            {quickActions.map((qa) => (
              <TouchableOpacity
                key={qa.id}
                style={styles.actionBox}
                activeOpacity={0.8}
              >
                <View style={styles.actionIcon}>{qa.icon}</View>
                <Text style={styles.actionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            {services.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.serviceBtn}
                activeOpacity={0.8}
              >
                <View style={styles.serviceIcon}>{s.icon}</View>
                <Text style={styles.serviceText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scheduled Payments */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Schedule Payments</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <View style={styles.paymentCard}>
                <View style={styles.paymentLeft}>
                  <View style={styles.brandIcon}>{item.icon}</View>
                  <View>
                    <Text style={styles.paymentName}>{item.name}</Text>
                    <Text style={styles.paymentNext}>{item.next}</Text>
                  </View>
                </View>
                <Text style={styles.paymentAmount}>{item.amount}</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.tabbar}>
        <TabIcon name="home" active />
        <TabIcon name="scan" />
        <TabIcon name="pie-chart" />
        <TabIcon name="wallet" />
        <TabIcon name="grid" />
      </View>
    </View>
  );
}

function TabIcon({
  name,
  active = false,
}: {
  name: keyof typeof Feather.glyphMap;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.tabBtn} activeOpacity={0.8}>
      <Feather name={name} size={20} color={active ? "#246BFD" : "#9DA3AF"} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardMuted: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 2 },
  cardDots: { color: "rgba(255,255,255,0.95)", letterSpacing: 2, marginTop: 6 },
  cardMeta: { color: "rgba(255,255,255,0.9)", fontSize: 11 },
  holder: { color: "#fff", fontWeight: "700", marginTop: 2 },

  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actionBox: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionText: { fontSize: 12, color: "#111827", textAlign: "center" },

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceBtn: {
    width: "30.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceText: { fontSize: 12, color: "#111827" },

  viewAll: { fontSize: 12, color: "#246BFD", fontWeight: "600" },

  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  paymentNext: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  paymentAmount: { fontSize: 13, fontWeight: "700", color: "#111827" },

  tabbar: {
    height: 64,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  tabBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
