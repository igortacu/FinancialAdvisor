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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

/** ====== CONFIG ====== */
const OCR_API = "http://192.168.100.111:8080/ocr"; // your LAN server

/** ====== TYPES ====== */
type ParsedItem = {
  name: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  total: number;
};
type ParsedReceipt = {
  merchant: string;
  items: ParsedItem[];
  total?: number;
  rawLines: string[];
  rectifiedPreview?: string; // base64 jpg from backend (optional)
};

/** ====== UTILS ====== */
const n = (s: string) =>
  Number(
    s
      .replace(/[^\d,.\-]/g, "")
      .replace(/\s+/g, "")
      .replace(",", "."),
  );

const strip = (s: string) => s.replace(/\s{2,}/g, " ").trim();

function guessMerchant(lines: string[]) {
  // try first footer/header lines for brandy names, else first non-empty
  const joined = lines.slice(0, 8).join(" ");
  if (/KAUFLAND/i.test(joined)) return "Kaufland";
  if (/LINELLA/i.test(joined)) return "Linella";
  if (/GREEN\s*HILLS/i.test(joined)) return "Green Hills";
  return strip(
    lines.find((l) => l && !/bon|fiscal|nr|casa/i.test(l)) || "Receipt",
  );
}

/** Quick, pragmatic RO receipt parser for OCR text (Kaufland/Linella style) */
function parseROReceipt(ocrText: string): ParsedReceipt {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, " ").replace(/O/g, "0").trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  let total: number | undefined;

  const PRICE_AT_END = /([0-9]+(?:[.,][0-9]{1,2})?)\s*$/;
  const QTY_NEXTLINE =
    /(\d+(?:[.,]\d+)?)\s*(BUC|PCS|KG|G|L|ML)?\s*[x×@]\s*([0-9]+(?:[.,][0-9]{1,2})?)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // TOTAL / SUMA detector (kept for safety)
    if (/(TOTAL|SUMA|SUMĂ)\b/i.test(l)) {
      const m = l.match(/(?:TOTAL|SUMA|SUMĂ)[^\d]*([0-9][0-9\.,\s]*)/i);
      if (m) total = n(m[1]);
      continue;
    }

    // Pattern A: name + ... + price (aligned right)
    const a = l.match(/^(.*?)(?:[ .]{2,})?([0-9]+(?:[.,][0-9]{1,2}))$/);
    if (a && a[1].trim().length > 1) {
      const name = strip(a[1]);
      const price = n(a[2]);
      items.push({ name, qty: 1, unitPrice: price, total: price });
      continue;
    }

    // Pattern B: name then next line "qty x unitPrice", total maybe next+1
    const next = lines[i + 1] || "";
    const b = next.match(QTY_NEXTLINE);
    if (b && l.length > 2) {
      const name = strip(l);
      const qty = n(b[1]);
      const unit = b[2]?.toUpperCase();
      const unitPrice = n(b[3]);
      let lineTotal = Number((qty * unitPrice).toFixed(2));

      const maybeTotal = lines[i + 2] || "";
      const t = maybeTotal.match(PRICE_AT_END);
      if (t && maybeTotal.length < 12) {
        lineTotal = n(t[1]);
      }

      items.push({
        name,
        qty,
        unit,
        unitPrice,
        total: lineTotal,
      });
      i++; // consumed qty line
      continue;
    }

    // Join wrapped name line to previous item if it doesn't end with price
    if (items.length && !PRICE_AT_END.test(l) && l.length > 2) {
      const last = items[items.length - 1];
      if (last && last.name.length < 64) {
        last.name = strip(`${last.name} ${l}`);
      }
    }
  }

  const inferred = Number(
    items.reduce((s, it) => s + (it.total || 0), 0).toFixed(2),
  );
  const finalTotal = total ?? inferred;

  return {
    merchant: guessMerchant(lines),
    items,
    total: finalTotal,
    rawLines: lines,
  };
}

/** ====== UI ====== */
export default function ScanReceipt() {
  const router = useRouter();
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [rawText, setRawText] = React.useState<string>("");
  const [rectified, setRectified] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.95,
    });
    if (!res.canceled && res.assets?.[0]?.uri) runOcr(res.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.95,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]?.uri) runOcr(res.assets[0].uri);
  }

  async function runOcr(uri: string) {
    setBusy(true);
    setErr(null);
    setParsed(null);
    setRawText("");
    setRectified(null);
    setImageUri(uri);
    try {
      const form = new FormData();
      form.append("file", {
        uri,
        name: "receipt.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${OCR_API}?lang=ro+en&pre=1`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`OCR ${res.status}: ${t || "Request failed"}`);
      }

      const json = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || "OCR server error");
      }

      const text: string = json.text || "";
      const rectB64: string | undefined = json.debug?.rectified_preview_jpg_b64;
      setRawText(text);
      if (rectB64) setRectified(`data:image/jpeg;base64,${rectB64}`);

      const parsedNow = parseROReceipt(text);
      setParsed(parsedNow);
    } catch (e: any) {
      setErr(e?.message || "Unexpected OCR error");
      Alert.alert("OCR failed", e?.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  async function addToTransactions() {
    if (!parsed) return;
    const total =
      parsed.total ?? parsed.items.reduce((s, it) => s + (it.total || 0), 0);

    const tx = {
      id: String(Date.now()),
      name: parsed.merchant || "Receipt",
      amount: -Number(total.toFixed(2)),
      date: new Date().toISOString(),
      category: "Groceries",
      meta: parsed,
    };

    try {
      const { useTransactions } = await import("@/state/transactions");
      useTransactions.getState().add(tx);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      router.back();
    }
  }

  const renderedItems = parsed?.items ?? [];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
    >
      {/* Status banner */}
      <View style={[s.banner, { backgroundColor: "#E9F6FF" }]}>
        <Text style={s.bannerText}>
          Ready to scan in <Text style={{ fontWeight: "800" }}>RO + EN</Text>{" "}
          with preprocessing.
        </Text>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Action label="Take photo" icon="camera" onPress={takePhoto} />
        <Action label="Upload" icon="image" onPress={pickImage} />
      </View>

      {/* Preview (rectified if available, else source) */}
      {imageUri ? (
        <Animated.View entering={FadeInUp.duration(220)} style={s.previewCard}>
          <Image
            source={{ uri: rectified || imageUri }}
            style={s.preview}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}

      {/* Error */}
      {err ? (
        <View style={[s.card, { borderColor: "#ef4444", borderWidth: 1 }]}>
          <Text style={{ color: "#ef4444", fontWeight: "800" }}>
            OCR server unreachable
          </Text>
          <Text style={{ color: "#6B7280", marginTop: 4 }}>{err}</Text>
        </View>
      ) : null}

      {/* Spinner */}
      {busy ? (
        <View style={[s.card, { alignItems: "center" }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Parsing…</Text>
        </View>
      ) : null}

      {/* Review block */}
      {parsed && !busy ? (
        <View style={s.card}>
          <Text style={s.h1}>Review</Text>
          <Text style={{ color: "#6B7280", marginTop: 2 }}>
            {parsed.merchant}
          </Text>

          {/* Items table */}
          <View style={{ marginTop: 10, gap: 8 }}>
            {renderedItems.length === 0 ? (
              <Text style={{ color: "#6B7280" }}>
                No line items detected from OCR text.
              </Text>
            ) : (
              renderedItems.map((it, i) => (
                <View key={i} style={s.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName} numberOfLines={2}>
                      {it.name}
                    </Text>
                    <Text style={s.itemMeta}>
                      {it.qty} × {it.unitPrice.toFixed(2)}
                      {it.unit ? ` ${it.unit}` : ""}
                    </Text>
                  </View>
                  <Text style={s.itemTotal}>{it.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>
              {(
                parsed.total ??
                renderedItems.reduce((s, it) => s + (it.total || 0), 0)
              ).toFixed(2)}
            </Text>
          </View>

          {/* Add button */}
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
        </View>
      ) : null}

      {/* RAW text (for debugging / tuning parser) */}
      {rawText ? (
        <View style={s.card}>
          <Text style={s.h2}>RAW OCR</Text>
          <Text style={s.raw}>{rawText}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** ====== Small components ====== */
function Action({
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

/** ====== STYLES ====== */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },

  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: { color: "#0B4A6F" },

  previewCard: {
    borderRadius: 14,
    overflow: "hidden",
    height: 260,
    backgroundColor: "#fff",
  },
  preview: { width: "100%", height: "100%" },

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

  h1: { fontSize: 16, fontWeight: "800" },
  h2: { fontSize: 14, fontWeight: "800", marginBottom: 6 },

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

  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEF2F7",
  },
  itemName: { fontWeight: "700", color: "#111827" },
  itemMeta: { marginTop: 2, color: "#6B7280", fontSize: 12 },
  itemTotal: { width: 70, textAlign: "right", fontWeight: "800" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "center",
  },
  totalLabel: { fontWeight: "800", fontSize: 16 },
  totalValue: { fontWeight: "800", fontSize: 18 },

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

  raw: { color: "#374151", fontSize: 12, marginTop: 6, lineHeight: 18 },
});
