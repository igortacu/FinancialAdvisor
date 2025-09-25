// app/(tabs)/transactions.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import Card from "@/components/Card";
import { MOCK_RECEIPT, type ParsedReceipt } from "@/lib/receipt-mock";
import { supabase } from "../../api";
import { useAuth } from "@/store/auth";

const USE_MOCK = true;

/* ============== Types ============== */
type TxRow = {
  id: string;
  user_id: string;
  name: string;
  merchant?: string | null;
  amount: number; // negative = expense
  currency: string; // "MDL"
  category: string;
  date: string; // ISO
  meta?: any;
  created_at?: string;
};

type Category =
  | "Groceries"
  | "Fuel"
  | "Utilities"
  | "Health"
  | "Transport"
  | "Shopping"
  | "General";

/* ============== currency (MDL) ============== */
const nfMDL = (globalThis as any).Intl?.NumberFormat
  ? new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" })
  : null;

function fmtMDL(n: number, withSign = false) {
  const sign = n < 0 ? "-" : withSign ? "+" : "";
  const abs = Math.abs(n);
  const core = nfMDL ? nfMDL.format(abs) : `${abs.toFixed(2)} MDL`;
  return `${sign}${core}`;
}

/* ============== helpers ============== */
const normalize = (s: string) => s.replace(/\s{2,}/g, " ").trim();
const guessCategory = (merchant: string): Category => {
  const m = merchant.toUpperCase();
  if (/(KAUFLAND|LINELLA|GREEN HILLS|SUPERMARKET|MARKET)/.test(m))
    return "Groceries";
  if (/(LUKOIL|MOL|PETROM|ROMPETROL|VENTO)/.test(m)) return "Fuel";
  if (/(ORANGE|MOLDTELECOM|DIGI|VODAFONE|MTS)/.test(m)) return "Utilities";
  if (/(PHARM|APTEKA|FARM)/.test(m)) return "Health";
  if (/(UBER|YANGO|TAXI|PARK)/.test(m)) return "Transport";
  if (/(H&M|ZARA|UNIQLO|CCC|LC WAIKIKI)/.test(m)) return "Shopping";
  return "General";
};
const totalOf = (p: ParsedReceipt) =>
  (p.total ??
    p.items.reduce(
      (s, it) => s + (it.total ?? (it.qty || 1) * (it.unitPrice || 0)),
      0,
    )) ||
  0;

const CATEGORIES: Category[] = [
  "General",
  "Groceries",
  "Fuel",
  "Utilities",
  "Health",
  "Transport",
  "Shopping",
];

/* ============== Component ============== */
export default function Transactions() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // ---- list + paging
  const [list, setList] = React.useState<TxRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const PAGE_SIZE = 20;

  // ---- scan modal
  const [scanOpen, setScanOpen] = React.useState(false);
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);

  // ---- filters
  const [activeCat, setActiveCat] = React.useState<Category | "ALL">("ALL");
  const [month, setMonth] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // ---- computed
  const filtered = React.useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const mStart = new Date(y, (m || 1) - 1, 1).getTime();
    const mEnd = new Date(y, m || 1, 1).getTime();
    return list.filter((t) => {
      const ts = new Date(t.date).getTime();
      const inMonth = ts >= mStart && ts < mEnd;
      const inCat = activeCat === "ALL" || t.category === activeCat;
      return inMonth && inCat;
    });
  }, [list, activeCat, month]);

  const totalToday = React.useMemo(() => {
    const today = new Date().toDateString();
    return filtered
      .filter((t) => new Date(t.date).toDateString() === today)
      .reduce((s, t) => s + t.amount, 0);
  }, [filtered]);

  const countAll = filtered.length;

  // ---- user id
  const [userId, setUserId] = React.useState<string | null>(
    user?.userId ?? null,
  );
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (user?.userId) {
        setUserId(user.userId);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (mounted) setUserId(data.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  // ---- initial load
  React.useEffect(() => {
    if (!userId) return;
    loadPage(true).catch(() => {});
    // realtime
    const ch = supabase
      .channel("tx_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setList((p) => [payload.new as any as TxRow, ...p]);
          } else if (payload.eventType === "DELETE") {
            setList((p) => p.filter((t) => t.id !== (payload.old as any).id));
          } else if (payload.eventType === "UPDATE") {
            setList((p) =>
              p.map((t) =>
                t.id === (payload.new as any).id
                  ? (payload.new as any as TxRow)
                  : t,
              ),
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadPage(reset = false) {
    if (!userId) return;
    if (loading && !reset) return;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    }

    const from = reset ? 0 : list.length;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (reset) setList(data as TxRow[]);
    else setList((p) => [...p, ...(data as TxRow[])]);

    if (!data || data.length < PAGE_SIZE) setHasMore(false);
    setLoading(false);
  }

  async function onRefresh() {
    if (!userId) return;
    setRefreshing(true);
    await loadPage(true);
    setRefreshing(false);
  }

  function openScan() {
    setScanOpen(true);
    setImageUri(null);
    setParsed(null);
  }
  function closeScan() {
    setScanOpen(false);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 0.9,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) await runScan(res.assets[0].uri);
  }
  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) await runScan(res.assets[0].uri);
  }
  async function runScan(uri: string) {
    setBusy(true);
    setImageUri(uri);
    setParsed(null);
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 450));
        console.log("[Scan MOCK] Parsed receipt:", MOCK_RECEIPT);
        setParsed(MOCK_RECEIPT);
        return;
      }
      // TODO: hook OCR → parse → setParsed(parsedReceipt)
    } finally {
      setBusy(false);
    }
  }

  async function addParsedAsTransaction() {
    if (!parsed || !userId) return;
    const merchant = normalize(parsed.merchant);
    const row: Omit<TxRow, "id"> = {
      user_id: userId,
      name: merchant,
      merchant,
      date: new Date().toISOString(),
      amount: -Number(totalOf(parsed).toFixed(2)),
      currency: "MDL",
      category: guessCategory(merchant),
      meta: parsed,
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert(row)
      .select()
      .single();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setList((p) => [data as TxRow, ...p]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setScanOpen(false);
  }

  async function addManual() {
    if (!userId) return;
    const row: Omit<TxRow, "id"> = {
      user_id: userId,
      name: "Manual Entry",
      merchant: null,
      date: new Date().toISOString(),
      amount: -123.45,
      currency: "MDL",
      category: "General",
      meta: null,
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert(row)
      .select()
      .single();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setList((p) => [data as TxRow, ...p]);
  }

  async function deleteTx(id: string) {
    Alert.alert("Delete", "Remove this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);
          if (error) Alert.alert("Error", error.message);
        },
      },
    ]);
  }

  function loadMoreIfNeeded(e: any) {
    if (!hasMore || loading) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 200;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      loadPage(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(360)} style={s.headerWrap}>
        <Text style={s.h1}>Transactions</Text>

        <Pressable
          onPress={openScan}
          style={({ pressed }) => [
            s.headerPlusBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <LinearGradient
            colors={["#3bb2f6", "#5b76f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.headerPlusBg}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* KPIs */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(360)}
        style={s.kpisRow}
      >
        <Card style={[s.kpiCard, { flex: 1 }]}>
          <Text style={s.kpiLabel}>Today</Text>
          <Text
            style={[
              s.kpiValue,
              { color: totalToday < 0 ? "#ef4444" : "#16a34a" },
            ]}
          >
            {fmtMDL(totalToday, true)}
          </Text>
          <Text style={s.kpiSub}>Total movement</Text>
        </Card>
        <Card style={[s.kpiCard, { flex: 1 }]}>
          <Text style={s.kpiLabel}>Count</Text>
          <Text style={s.kpiValue}>{countAll}</Text>
          <Text style={s.kpiSub}>Filtered</Text>
        </Card>
      </Animated.View>

      {/* Filters */}
      <Animated.View
        entering={FadeInUp.delay(60).duration(320)}
        style={s.filtersRow}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {(["ALL", ...CATEGORIES] as (Category | "ALL")[]).map((c) => (
            <Pressable
              key={c}
              onPress={() => setActiveCat(c)}
              style={({ pressed }) => [
                s.chip,
                activeCat === c && s.chipActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[s.chipText, activeCat === c && s.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
          {/* month switcher (prev / next) */}
          <Pressable
            onPress={() => setMonth(shiftMonth(month, -1))}
            style={s.monthBtn}
          >
            <Ionicons name="chevron-back" size={16} color="#111827" />
          </Pressable>
          <View style={s.monthBadge}>
            <Text style={s.monthText}>{fmtMonth(month)}</Text>
          </View>
          <Pressable
            onPress={() => setMonth(shiftMonth(month, +1))}
            style={s.monthBtn}
          >
            <Ionicons name="chevron-forward" size={16} color="#111827" />
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={loadMoreIfNeeded}
        scrollEventThrottle={120}
      >
        {loading && list.length === 0 ? (
          <View style={[s.card, { alignItems: "center", gap: 8 }]}>
            <ActivityIndicator />
            <Text style={{ color: "#6B7280" }}>Loading…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState onScan={openScan} onAdd={addManual} />
        ) : (
          filtered.map((t) => (
            <Pressable key={t.id} onLongPress={() => deleteTx(t.id)}>
              <Card>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{t.name}</Text>
                    <Text style={s.sub}>
                      {new Date(t.date).toLocaleString()} • {t.category}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.amount,
                      { color: t.amount < 0 ? "#ef4444" : "#16a34a" },
                    ]}
                  >
                    {fmtMDL(t.amount, t.amount >= 0)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}

        {!loading && hasMore && (
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>

      {/* Quick actions */}
      <Animated.View
        entering={FadeInUp.delay(80).duration(380)}
        style={s.actionsRow}
      >
        <ActionTile
          icon="camera"
          label="Scan receipt"
          hint="Fast add"
          onPress={openScan}
        />
        <ActionTile
          icon="add-circle-outline"
          label="Add manual"
          hint="Custom entry"
          onPress={addManual}
        />
      </Animated.View>

      {/* Scan / Review modal */}
      <Modal
        visible={scanOpen}
        animationType="slide"
        onRequestClose={closeScan}
      >
        <View style={[s.modalRoot, { paddingTop: insets.top + 6 }]}>
          <View style={s.modalHeader}>
            <Pressable onPress={closeScan} style={s.modalClose}>
              <Ionicons name="close" size={22} />
            </Pressable>
            <Text style={s.modalTitle}>Scan receipt</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <ActionWide icon="camera" label="Take photo" onPress={takePhoto} />
            <ActionWide
              icon="image"
              label="Upload from gallery"
              onPress={pickImage}
            />
            <InfoBanner
              text={USE_MOCK ? "Demo mode: using mock data." : "Using OCR API"}
            />
          </View>

          {imageUri ? (
            <Animated.View
              entering={FadeInUp.duration(240)}
              style={s.previewCard}
            >
              <Image source={{ uri: imageUri }} style={s.preview} />
            </Animated.View>
          ) : null}

          {busy && (
            <View
              style={[s.card, { alignItems: "center", marginHorizontal: 16 }]}
            >
              <ActivityIndicator />
              <Text style={{ marginTop: 8, color: "#6B7280" }}>Reading…</Text>
            </View>
          )}

          {!busy && parsed && (
            <ScrollView
              style={{ flex: 1, marginTop: 10 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
            >
              <Card>
                <Text style={s.h2}>Review</Text>
                <Text style={s.muted}>{normalize(parsed.merchant)}</Text>

                <View style={{ marginTop: 10, gap: 8 }}>
                  {parsed.items.map((it, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemName} numberOfLines={1}>
                        {it.name}
                      </Text>
                      <Text style={s.itemQty}>
                        {it.qty}
                        {it.unit ? ` ${it.unit}` : ""}{" "}
                        {it.unitPrice != null
                          ? `× ${it.unitPrice.toFixed(2)}`
                          : ""}
                      </Text>
                      <Text style={s.itemTotal}>
                        {(
                          it.total ?? (it.qty || 1) * (it.unitPrice || 0)
                        ).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={s.divider} />
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>{fmtMDL(totalOf(parsed))}</Text>
                </View>
              </Card>

              <Pressable
                onPress={addParsedAsTransaction}
                style={({ pressed }) => [
                  s.primary,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <LinearGradient
                  colors={["#3bb2f6", "#5b76f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.primaryBg}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={s.primaryText}>Add to transactions</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Subcomponents ---------- */

function ActionTile({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.tile, pressed && { opacity: 0.9 }]}
    >
      <View style={s.tileIcon}>
        <Ionicons name={icon} size={18} color="#246BFD" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.tileLabel}>{label}</Text>
        {hint ? <Text style={s.tileHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function ActionWide({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.actionWide, pressed && { opacity: 0.9 }]}
    >
      <View style={s.actionWideIcon}>
        <Ionicons name={icon} size={18} color="#246BFD" />
      </View>
      <Text style={s.actionWideText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function InfoBanner({ text }: { text: string }) {
  return (
    <View style={s.infoBanner}>
      <Ionicons name="information-circle-outline" size={16} color="#0B63C5" />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

function EmptyState({
  onScan,
  onAdd,
}: {
  onScan: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={[s.card, { alignItems: "center", gap: 8 }]}>
      <Ionicons name="receipt-outline" size={24} color="#246BFD" />
      <Text style={{ fontWeight: "800" }}>No transactions</Text>
      <Text style={{ color: "#6B7280", textAlign: "center" }}>
        Scan a receipt or add an entry.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onScan}
          style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={["#3bb2f6", "#5b76f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.primaryBg, { paddingHorizontal: 18 }]}
          >
            <Ionicons name="scan-outline" size={18} color="#fff" />
            <Text style={s.primaryText}>Scan</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.primaryBg, { paddingHorizontal: 18 }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.primaryText}>Add</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- Month helpers ---------- */
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/* ---------- styles ---------- */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },

  headerWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  h1: { fontSize: 20, fontWeight: "800", color: "#111827", flex: 1 },

  headerPlusBtn: {
    width: 84,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  headerPlusBg: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001A4D",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  kpisRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  kpiCard: { padding: 14 },
  kpiLabel: { color: "#6B7280", fontSize: 12 },
  kpiValue: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  kpiSub: { color: "#6B7280", fontSize: 12, marginTop: 2 },

  filtersRow: { marginTop: 6 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#EEF4FF", borderColor: "#246BFD" },
  chipText: { color: "#111827", fontWeight: "700" },
  chipTextActive: { color: "#246BFD" },
  monthBtn: {
    backgroundColor: "#fff",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginLeft: 6,
  },
  monthBadge: {
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    justifyContent: "center",
    marginLeft: 4,
  },
  monthText: { color: "#111827", fontWeight: "800" },

  actionsRow: {
    paddingHorizontal: 16,
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    gap: 10,
  },

  tile: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontWeight: "800", color: "#111827" },
  tileHint: { color: "#6B7280", fontSize: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontWeight: "800" },
  sub: { color: "#6B7280", marginTop: 2 },
  amount: { fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  modalRoot: { flex: 1, backgroundColor: "#F5F7FB" },
  modalHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800" },

  actionWide: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionWideIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionWideText: { fontWeight: "800", color: "#111827", flex: 1 },

  infoBanner: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#E6F2FF",
  },
  infoText: { color: "#0B63C5", fontSize: 12, fontWeight: "600", flex: 1 },

  previewCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 12,
    height: 240,
    backgroundColor: "#fff",
    marginHorizontal: 16,
  },
  preview: { width: "100%", height: "100%" },

  h2: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#6B7280", marginTop: 2 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  itemName: { flex: 1, fontWeight: "600", color: "#111827" },
  itemQty: { width: 140, color: "#6B7280" },
  itemTotal: { width: 70, textAlign: "right", fontWeight: "700" },

  divider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginTop: 10,
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontWeight: "800", fontSize: 16 },
  totalValue: { fontWeight: "800", fontSize: 18 },

  primary: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryBg: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
