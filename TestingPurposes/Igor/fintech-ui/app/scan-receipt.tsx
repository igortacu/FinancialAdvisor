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
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

// ⬇️ use your LAN IP here
const OCR_BASE = "http://192.168.100.111:8080";
const OCR_URL = `${OCR_BASE}/ocr?lang=ro+en&pre=1`;

type ParsedItem = {
  name: string;
  qty: number;
  unitPrice?: number;
  total: number;
  discount?: number;
  unit?: string;
};

type ParsedReceipt = {
  merchant: string;
  date?: string;
  time?: string;
  currency?: string;
  total?: number;
  vat?: number;
  items: ParsedItem[];
  debug?: {
    lines: string[];
    headerLines: string[];
    bodyLines: string[];
    footerLines: string[];
    inferredTotalFromItems?: number;
    matches?: Record<string, any>;
  };
};

// ---- tiny helpers
const strip = (s: string) => s.replace(/\s{2,}/g, " ").trim();
const guessCategory = (merchant: string) => {
  const m = merchant.toUpperCase();
  if (/(KAUFLAND|LINELLA|GREEN HILLS|SUPERMARKET|MARKET)/.test(m))
    return "Groceries";
  if (/(LUKOIL|MOL|PETROM|ROMPETROL|VENTO)/.test(m)) return "Fuel";
  if (/(ORANGE|MOLDTELECOM|DIGI|VODAFONE|MTS)/.test(m)) return "Utilities";
  if (/(PHARM|APTEKA|FARM)/.test(m)) return "Health";
  if (/(H&M|ZARA|UNIQLO|CCC|LC WAIKIKI)/.test(m)) return "Shopping";
  if (/(UBER|YANGO|TAXI|PARK)/.test(m)) return "Transport";
  return "General";
};

export default function ScanReceipt() {
  const router = useRouter();

  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [serverOK, setServerOK] = React.useState<boolean | null>(null);

  const [ocrText, setOcrText] = React.useState<string>("");
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);
  const [showDebug, setShowDebug] = React.useState(false);

  React.useEffect(() => {
    // ping server once to show status banner
    (async () => {
      try {
        const r = await fetch(`${OCR_BASE}/health`, { timeout: 3000 as any });
        setServerOK(r.ok);
      } catch {
        setServerOK(false);
      }
    })();
  }, []);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.All, // expo warns the old enum is deprecated
      quality: 0.92,
    });
    if (!res.canceled && res.assets?.[0]?.uri) await runOcr(res.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
    if (!res.canceled && res.assets?.[0]?.uri) await runOcr(res.assets[0].uri);
  }

  async function runOcr(uri: string) {
    setBusy(true);
    setParsed(null);
    setOcrText("");
    setImageUri(uri);
    setShowDebug(false);

    try {
      const form = new FormData();
      form.append("file", {
        uri,
        name: "receipt.jpg",
        type: "image/jpeg",
      } as any);

      const resp = await fetch(OCR_URL, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });

      if (!resp.ok) throw new Error(`OCR error ${resp.status}`);
      // server returns: { text: string }
      const data = (await resp.json()) as { text?: string };
      const text = (data?.text || "").trim();
      setOcrText(text);

      if (!text || text.length < 20) {
        throw new Error("OCR returned too little text");
      }

      // parse on-device (same parser you already added)
      const { parseReceipt } = await import("@/lib/receipt-parser-advanced");
      const parsed = parseReceipt(text);
      setParsed(parsed);

      // if looks empty, open debug automatically
      if ((!parsed.total || parsed.total <= 0) && parsed.items.length === 0) {
        setShowDebug(true);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "OCR failed",
        e?.message ??
          "Could not read this image. Try another angle, more light, or a closer crop.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addToTransactions() {
    if (!parsed) return;
    const total =
      parsed.total ??
      parsed.items.reduce(
        (s, it) => s + (it.total ?? (it.qty || 1) * (it.unitPrice || 0)),
        0,
      );

    const merchant = strip(parsed.merchant);
    const tx = {
      id: String(Date.now()),
      name: merchant || "Receipt",
      amount: -Number(Number(total || 0).toFixed(2)),
      date: new Date().toISOString(),
      category: guessCategory(merchant),
      meta: parsed,
    };

    try {
      const { useTransactions } = await import("@/state/transactions");
      useTransactions.getState().add(tx);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.warn(err);
      router.back();
    }
  }

  const emptyParse =
    parsed && (!parsed.total || parsed.total <= 0) && parsed.items.length === 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* status banner */}
      {serverOK === false && (
        <View
          style={[
            s.banner,
            { borderColor: "#ef4444", backgroundColor: "#fee2e2" },
          ]}
        >
          <Text style={[s.bannerTitle, { color: "#b91c1c" }]}>
            OCR server unreachable
          </Text>
          <Text style={{ color: "#6B7280" }}>
            Check Wi-Fi and URL:{" "}
            <Text style={{ fontWeight: "700" }}>{OCR_BASE}</Text>
          </Text>
        </View>
      )}
      {serverOK && (
        <View
          style={[
            s.banner,
            { borderColor: "#10b98133", backgroundColor: "#ecfeff" },
          ]}
        >
          <Text style={[s.bannerTitle, { color: "#065f46" }]}>
            Ready to scan in RO + EN with preprocessing.
          </Text>
        </View>
      )}

      <View style={s.row}>
        <ActionBtn label="Take photo" icon="camera" onPress={takePhoto} />
        <ActionBtn label="Upload" icon="image" onPress={pickImage} />
      </View>

      {imageUri ? (
        <Animated.View entering={FadeInUp.duration(240)} style={s.previewCard}>
          <Image source={{ uri: imageUri }} style={s.preview} />
        </Animated.View>
      ) : null}

      {busy && (
        <View style={[s.card, { alignItems: "center" }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>
            Reading & parsing…
          </Text>
        </View>
      )}

      {parsed && !busy && (
        <Animated.View
          entering={FadeInUp.delay(60).duration(260)}
          style={s.card}
        >
          <Text style={s.h2}>Review</Text>
          <Text style={s.muted}>{strip(parsed.merchant)}</Text>

          {emptyParse && (
            <View style={[s.warn, { marginTop: 8 }]}>
              <Text style={s.warnTitle}>
                We couldn’t confidently extract items/total.
              </Text>
              <Text style={s.warnText}>
                Toggle the debug below to inspect OCR text. Try retaking the
                photo (closer, flat, good light) or cropping to the main paper
                area.
              </Text>
            </View>
          )}

          {parsed.items.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {parsed.items.map((it, i) => (
                <View key={i} style={s.itemRow}>
                  <Text style={s.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={s.itemQty}>
                    {(it.qty ?? 1).toString()} ×{" "}
                    {(it.unitPrice ?? it.total).toFixed(2)}
                  </Text>
                  <Text style={s.itemTotal}>{(it.total ?? 0).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>
              {(
                parsed.total ??
                parsed.items.reduce(
                  (s, it) =>
                    s + (it.total ?? (it.qty || 1) * (it.unitPrice || 0)),
                  0,
                )
              ).toFixed(2)}
            </Text>
          </View>

          <Pressable
            onPress={() => setShowDebug((v) => !v)}
            style={[s.debugBtn, { marginTop: 10 }]}
          >
            <Ionicons name="bug-outline" size={16} />
            <Text style={{ fontWeight: "700" }}>
              {showDebug ? "Hide" : "Show"} OCR text / debug
            </Text>
          </Pressable>

          {showDebug && (
            <View style={[s.debugBox, { marginTop: 10 }]}>
              <Text style={s.debugTitle}>OCR text</Text>
              <Text style={s.debugMono}>{ocrText || "(empty)"}</Text>

              {!!parsed?.debug && (
                <>
                  <Text style={[s.debugTitle, { marginTop: 10 }]}>
                    Parser blocks
                  </Text>
                  <Text style={s.debugKey}>Header</Text>
                  <Text style={s.debugMono}>
                    {parsed.debug.headerLines.join("\n")}
                  </Text>
                  <Text style={s.debugKey}>Body</Text>
                  <Text style={s.debugMono}>
                    {parsed.debug.bodyLines.join("\n")}
                  </Text>
                  <Text style={s.debugKey}>Footer</Text>
                  <Text style={s.debugMono}>
                    {parsed.debug.footerLines.join("\n")}
                  </Text>
                </>
              )}
            </View>
          )}

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

function ActionBtn({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.action, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={18} color="#246BFD" />
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h2: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#6B7280" },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },

  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  bannerTitle: { fontWeight: "800" },

  action: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionText: { color: "#111827", fontWeight: "700" },

  previewCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    height: 280,
    backgroundColor: "#fff",
  },
  preview: { width: "100%", height: "100%" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    shadowColor: "#001A4D",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  warn: {
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  warnTitle: { fontWeight: "800", color: "#9A3412" },
  warnText: { color: "#A16207", marginTop: 4 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  itemName: { flex: 1, fontWeight: "600", color: "#111827" },
  itemQty: { width: 120, color: "#6B7280" },
  itemTotal: { width: 64, textAlign: "right", fontWeight: "700" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "center",
  },
  totalLabel: { fontWeight: "800", fontSize: 16 },
  totalValue: { fontWeight: "800", fontSize: 18 },

  debugBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  debugBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 10,
  },
  debugTitle: { color: "#93C5FD", fontWeight: "800", marginBottom: 4 },
  debugKey: { color: "#FDE68A", marginTop: 8, fontWeight: "700" },
  debugMono: {
    color: "#E2E8F0",
    fontFamily: "monospace",
    marginTop: 2,
    whiteSpace: "pre-line" as any,
  },

  primary: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  primaryBg: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
});
