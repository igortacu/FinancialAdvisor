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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import Card from "@/components/Card";
import { useTransactions } from "@/state/transactions";
import { MOCK_RECEIPT, type ParsedReceipt } from "@/lib/receipt-mock";

const USE_MOCK = true;

// ---- currency (MDL)
const nfMDL = (globalThis as any).Intl?.NumberFormat
  ? new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" })
  : null;

function fmtMDL(n: number, withSign = false) {
  const sign = n < 0 ? "-" : withSign ? "+" : "";
  const abs = Math.abs(n);
  const core = nfMDL ? nfMDL.format(abs) : `${abs.toFixed(2)} MDL`;
  return `${sign}${core}`;
}

// ---- helpers
const normalize = (s: string) => s.replace(/\s{2,}/g, " ").trim();
const guessCategory = (merchant: string) => {
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

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const list = useTransactions((s) => s.list);
  const addTx = useTransactions((s) => s.add);

  const [refreshing, setRefreshing] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
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
      // TODO hook OCR
    } finally {
      setBusy(false);
    }
  }

  function addParsedAsTransaction() {
    if (!parsed) return;
    const merchant = normalize(parsed.merchant);
    const tx = {
      id: String(Date.now()),
      name: merchant,
      date: new Date().toISOString(),
      amount: -Number(totalOf(parsed).toFixed(2)),
      category: guessCategory(merchant),
      meta: parsed,
    };
    addTx(tx);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setScanOpen(false);
  }

  const totalToday = list
    .filter(
      (t) => new Date(t.date).toDateString() === new Date().toDateString(),
    )
    .reduce((s, t) => s + t.amount, 0);

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(360)} style={s.headerWrap}>
        <Text style={s.h1}>Transactions</Text>

        {/* pill + (two icons wide) */}
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
          <Text style={s.kpiValue}>{list.length}</Text>
          <Text style={s.kpiSub}>All transactions</Text>
        </Card>
      </Animated.View>

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
          onPress={() =>
            addTx({
              id: String(Date.now()),
              name: "Manual Entry",
              date: new Date().toISOString(),
              amount: -123.45, // in MDL
              category: "General",
            })
          }
        />
      </Animated.View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <EmptyState onScan={openScan} />
        ) : (
          list.map((t) => (
            <Card key={t.id}>
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
          ))
        )}
      </ScrollView>

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

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <View style={[s.card, { alignItems: "center", gap: 8 }]}>
      <Ionicons name="receipt-outline" size={24} color="#246BFD" />
      <Text style={{ fontWeight: "800" }}>No transactions yet</Text>
      <Text style={{ color: "#6B7280", textAlign: "center" }}>
        Scan a receipt to create your first transaction.
      </Text>
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
          <Text style={s.primaryText}>Scan receipt</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ---- styles (unchanged except headerPlus*)
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

  actionsRow: { paddingHorizontal: 16, marginTop: 8, gap: 10 },
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
