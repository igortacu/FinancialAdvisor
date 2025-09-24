import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated as RNAnimated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import Card from "@/components/Card";
import ListItem from "@/components/ListItem";
import { payments, accounts, categories } from "../../constants/mock";
import { useAuth } from "@/store/auth";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const y = React.useRef(new RNAnimated.Value(0)).current;
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = React.useState(false);

  const headerTranslate = y.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -24],
    extrapolate: "clamp",
  });
  const cardScale = y.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.96],
    extrapolate: "clamp",
  });

  const onScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y } } }],
    { useNativeDriver: true },
  );

  const avatarSource = user?.avatarUrl
    ? { uri: user.avatarUrl }
    : { uri: "https://i.pravatar.cc/100?img=12" };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(380)}
        style={[
          styles.header,
          { transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image source={avatarSource} style={styles.avatar} />
        </TouchableOpacity>
        <Text style={styles.title}>Fintech</Text>
        <View style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={20} />
        </View>
      </Animated.View>

      {/* Logout menu */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <View />
        </Pressable>
        <View style={styles.menuContainer}>
          {user?.email ? (
            <Text style={styles.menuEmail}>{user.email}</Text>
          ) : null}
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); signOut(); }}>
            <Ionicons name="log-out-outline" size={18} />
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <RNAnimated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 88 }}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* Balance Card (parallax scale) */}
        <RNAnimated.View style={{ transform: [{ scale: cardScale }] }}>
          <LinearGradient
            colors={["#3bb2f6", "#5b76f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardMuted}>Available Balance</Text>
                <Text style={styles.balance}>
                  $
                  {accounts[0].balance.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
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
                <Text style={styles.holder}>Will Jonas</Text>
              </View>
            </View>
          </LinearGradient>
        </RNAnimated.View>

        {/* Quick Actions — compact chips */}
        <Animated.View
          entering={FadeInUp.delay(90).duration(420)}
          style={{ marginTop: 14 }}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {[
              { label: "Transfer", icon: "swap-horizontal" as const },
              { label: "Pay Bill", icon: "document-text-outline" as const },
              { label: "Top Up", icon: "arrow-up" as const },
              { label: "Bank to Bank", icon: "business-outline" as const },
            ].map((a, i) => (
              <Card
                key={a.label}
                onPress={() => {}}
                style={[styles.chip, i === 0 ? { marginLeft: 0 } : null]}
              >
                <View style={styles.chipIcon}>
                  <Ionicons name={a.icon} size={18} />
                </View>
                <Text style={styles.chipText} numberOfLines={1}>
                  {a.label}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Services Grid — 4 columns fixed */}
        <Animated.View
          entering={FadeInUp.delay(180).duration(420)}
          style={{ marginTop: 18 }}
        >
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesRow}>
            {[
              { label: "Recharge", icon: "phone-portrait-outline" },
              { label: "Charity", icon: "heart-outline" },
              { label: "Loan", icon: "card-outline" },
              { label: "Gifts", icon: "gift-outline" },
              { label: "Insur.", icon: "shield-checkmark-outline" },
              { label: "More", icon: "ellipsis-horizontal-circle-outline" },
            ].map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInUp.delay(210 + i * 40)}
              >
                <Card onPress={() => {}} style={styles.serviceTile}>
                  <View style={styles.serviceIcon}>
                    <Ionicons name={s.icon as any} size={20} />
                  </View>
                  <Text
                    style={styles.serviceLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {s.label}
                  </Text>
                </Card>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Budgets snapshot */}
        <Animated.View
          entering={FadeInUp.delay(260).duration(420)}
          style={{ marginTop: 8 }}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Budgets</Text>
            <Text style={styles.link}>View All</Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            {categories.slice(0, 3).map((c, idx) => {
              const pct = Math.round((c.spent / c.limit) * 100);
              return (
                <Animated.View
                  key={c.id}
                  entering={FadeInUp.delay(300 + idx * 60)}
                  style={{ marginTop: 12 }}
                >
                  <Card onPress={() => {}}>
                    <View style={styles.rowBetween}>
                      <Text style={{ fontWeight: "700" }}>{c.name}</Text>
                      <Text>
                        ${c.spent.toFixed(0)} / ${c.limit.toFixed(0)}
                      </Text>
                    </View>
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
          </View>
        </Animated.View>

        {/* Scheduled Payments */}
        <Animated.View
          entering={FadeInUp.delay(340).duration(420)}
          style={{ marginTop: 8 }}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Schedule Payments</Text>
            <Text style={styles.link}>View All</Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            {payments.map((item, i) => (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(370 + i * 50)}
                style={{ marginTop: 12 }}
              >
                <Card onPress={() => {}}>
                  <ListItem
                    left={
                      <View style={styles.brandIcon}>
                        {item.name === "Netflix" && (
                          <MaterialCommunityIcons name="netflix" size={20} />
                        )}
                        {item.name === "Paypal" && (
                          <MaterialCommunityIcons name="paypal" size={20} />
                        )}
                        {item.name === "Spotify" && (
                          <MaterialCommunityIcons name="spotify" size={20} />
                        )}
                      </View>
                    }
                    title={item.name}
                    subtitle={item.next}
                    right={
                      <Text style={{ fontWeight: "700" }}>{item.amount}</Text>
                    }
                  />
                </Card>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </RNAnimated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
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
    backgroundColor: "#fff",
  },

  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuContainer: {
    position: "absolute",
    top: 48,
    left: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    minWidth: 180,
  },
  menuEmail: { paddingHorizontal: 6, paddingVertical: 6, color: "#374151", fontWeight: "600" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  menuText: { marginLeft: 8, fontWeight: "600" },

  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#001a4d",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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

  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 16,
  },
  link: { fontSize: 12, color: "#246BFD", fontWeight: "600", paddingRight: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // chips
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    maxWidth: 120,
  },

  // services
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  serviceTile: {
    width: "23.5%",
    minWidth: 82,
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceLabel: {
    fontSize: 11.5,
    color: "#111827",
    textAlign: "center",
    includeFontPadding: false,
  },

  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
});
