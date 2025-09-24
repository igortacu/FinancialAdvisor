// app/scan-receipt.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useTransactions } from "@/state/transactions";
import { MOCK_RECEIPT, ParsedReceipt } from "@/lib/receipt-mock";

const USE_MOCK = true; // ← keep true for now

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

export default function ScanReceipt() {
  const router = useRouter();
  const addTx = useTransactions((s) => s.add);

  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);
  const [banner, setBanner] = React.useState<string | null>(
    "Demo mode: using mock data—no backend required.",
  );

  const totalOf = (p: ParsedReceipt) =>
    (p.total ??
      p.items.reduce(
        (s, it) => s + (it.total ?? (it.qty || 1) * (it.unitPrice || 0)),
        0,
      )) ||
    0;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 0.9,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await scan(res.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await scan(res.assets[0].uri);
    }
  }

  async function scan(uri: string) {
    setBusy(true);
    setParsed(null);
    setImageUri(uri);
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 350));
        console.log("[Scan MOCK] Parsed receipt:", MOCK_RECEIPT);
        setParsed(MOCK_RECEIPT);
        setBanner("Using mock data. Swap to your OCR API when ready.");
        return;
      }
      // TODO: call your OCR API and setParsed(...) with the parsed receipt.
    } catch (e: any) {
      Alert.alert("Scan failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  function addToTransactions() {
    if (!parsed) return;
    const merchant = normalize(parsed.merchant);
    const tx = {
      id: String(Date.now()),
      name: merchant, // ← your store expects name
      date: new Date().toISOString(),
      amount: -Number(totalOf(parsed).toFixed(2)), // expense = negative
      category: guessCategory(merchant),
      meta: parsed, // keep full receipt in meta
    };
    addTx(tx);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    router.back();
  }

  const total = parsed ? totalOf(parsed) : 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={s.headerRow}>
        <Text style={s.title}>Scan receipt</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>Beta</Text>
        </View>
      </View>

      {/* Banner */}
      {banner && (
        <View style={s.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#0B63C5"
          />
          <Text style={s.infoText}>{banner}</Text>
        </View>
      )}

      {/* Primary actions */}
      <View style={s.actionsRow}>
        <PrimaryAction
          icon="camera"
          label="Take photo"
          hint="Better results"
          onPress={takePhoto}
        />
        <PrimaryAction
          icon="image"
          label="Upload"
          hint="From gallery"
          onPress={pickImage}
        />
      </View>

      {/* Preview */}
      {imageUri ? (
        <Animated.View entering={FadeInUp.duration(260)} style={s.previewCard}>
          <Image source={{ uri: imageUri }} style={s.preview} />
        </Animated.View>
      ) : (
        <CardHint />
      )}

      {/* Progress */}
      {busy && (
        <View style={[s.card, { alignItems: "center" }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Reading…</Text>
        </View>
      )}

      {/* Parsed summary */}
      {parsed && !busy && (
        <Animated.View
          entering={FadeInUp.delay(80).duration(260)}
          style={s.card}
        >
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
                  {it.unitPrice != null ? `× ${it.unitPrice.toFixed(2)}` : ""}
                </Text>
                <Text style={s.itemTotal}>
                  {(it.total ?? (it.qty || 1) * (it.unitPrice || 0)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{total.toFixed(2)}</Text>
          </View>

          <Pressable
            onPress={addToTransactions}
            style={({ pressed }) => [s.primary, pressed && { opacity: 0.9 }]}
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
        </Animated.View>
      )}
    </ScrollView>
  );
}

function PrimaryAction({
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
      style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.9 }]}
    >
      <View style={s.actionIconWrap}>
        <Ionicons name={icon} size={20} color="#246BFD" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionLabel}>{label}</Text>
        {hint ? <Text style={s.actionHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function CardHint() {
  return (
    <View style={[s.card, { alignItems: "center", gap: 6 }]}>
      <Ionicons name="receipt-outline" size={24} color="#246BFD" />
      <Text style={{ fontWeight: "800" }}>No image selected</Text>
      <Text style={{ color: "#6B7280", textAlign: "center" }}>
        Use <Text style={{ fontWeight: "700" }}>Take photo</Text> for the best
        results or <Text style={{ fontWeight: "700" }}>Upload</Text> a receipt
        from your gallery.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", flex: 1 },
  badge: {
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#246BFD", fontWeight: "700", fontSize: 11 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#E6F2FF",
    marginBottom: 8,
  },
  infoText: { color: "#0B63C5", fontSize: 12, fontWeight: "600", flex: 1 },

  actionsRow: { flexDirection: "column", gap: 10, marginTop: 6 },
  actionCard: {
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
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontWeight: "800", color: "#111827" },
  actionHint: { color: "#6B7280", fontSize: 12 },

  previewCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 12,
    height: 280,
    backgroundColor: "#fff",
  },
  preview: { width: "100%", height: "100%" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  h2: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#6B7280", marginTop: 2 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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

  primary: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  primaryBg: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
