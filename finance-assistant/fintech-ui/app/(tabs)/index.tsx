import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated as RNAnimated,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/store/auth";
import { useRouter } from "expo-router";
import { Fx } from "@/api";

/* ================= Mock data ================= */
const accounts = [
  { balance: 4228.76, last4: 8635 },
  { balance: 9586.22, last4: 1122 },
];

type Tx = {
  id: string;
  ts: string; // ISO
  merchant: string;
  amount: number; // kept for backward compat; will mirror amount_base
  type: "groceries" | "transport" | "entertainment" | "other";

  // FX fields (original + normalized)
  amount_original?: number;        
  currency_original?: string;      
  amount_base?: number;            
  base_currency?: string;         
  fx_rate?: number;                
  fx_at?: string;                  
};

const seedTx: Tx[] = [
  {
    id: "t1",
    ts: new Date().toISOString(),
    merchant: "Netflix",
    amount: -10,
    type: "entertainment",
  },
  {
    id: "t2",
    ts: new Date(Date.now() - 1 * 86400000).toISOString(),
    merchant: "PayPal",
    amount: -3.5,
    type: "other",
  },
  {
    id: "t3",
    ts: new Date(Date.now() - 2 * 86400000).toISOString(),
    merchant: "Spotify",
    amount: -1,
    type: "entertainment",
  },
  {
    id: "t4",
    ts: new Date(Date.now() - 3 * 86400000).toISOString(),
    merchant: "Grocery Mart",
    amount: -32.4,
    type: "groceries",
  },
  {
    id: "t5",
    ts: new Date(Date.now() - 4 * 86400000).toISOString(),
    merchant: "Uber",
    amount: -12.2,
    type: "transport",
  },
];

const initialTx: Tx[] = seedTx.map((t) => ({
  ...t,
  // Backfill as base USD for existing mock rows
  amount_original: t.amount,
  currency_original: "USD",
  amount_base: t.amount,
  base_currency: "USD",
  fx_rate: 1,
  fx_at: new Date().toISOString(),
}));

/* ================= Theme ================= */
const UI = {
  bg: "#F2F5FB",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#5B76F7",
  card: "rgba(255,255,255,0.65)",
  line: "#E8EEF7",
};

const W = Dimensions.get("window").width;
const CARD_MARGIN = 14;
const CARD_W = Math.min(340, W - 40); // shorter, compact cards

// preferred font for the chart text
const CHART_FONT =
  Platform.OS === "android"
    ? "Roboto"
    : Platform.OS === "ios"
    ? "System"
    : "system-ui";

/* ================= (Optional) payments bus ================= */
export const PaymentsBus = {
  _subs: new Set<(tx: Tx) => void>(),
  add(tx: Tx) {
    this._subs.forEach((fn) => fn(tx));
  },
  subscribe(fn: (tx: Tx) => void): () => void {
    this._subs.add(fn);
    // return a cleanup with void return type
    return () => {
      this._subs.delete(fn);
    };
  },
};


/* ================= Helpers ================= */
// Currency formatting with currency code
const fmtMoney = (val: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    return `${val.toFixed(2)} ${currency}`;
  }
};

const ddmm = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dayN = (n: number) => dayStart(new Date(Date.now() - n * 86400000));

// New: helper to check if a date is within last 7 days (inclusive)
const isWithinLast7Days = (d: Date) => {
  const start = dayN(6); // 6 days ago, plus today = 7
  return dayStart(d).getTime() >= start.getTime();
};

/* ================= Frosted card ================= */
function Frosted({
  children,
  style,
  intensity = 24,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  return (
    <View style={[styles.shadowLg, styles.frostWrap, style]}>
      <BlurView style={StyleSheet.absoluteFill} intensity={intensity} tint="light" />
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

/* ================= Series from history (range-aware) ================= */
type ChartRange = "7d" | "12m";

function useSeries(tx: Tx[], range: ChartRange) {
  return React.useMemo(() => {
    const asNumber = (val: number | undefined, fallback = 0) => (typeof val === "number" ? val : fallback);

    if (range === "7d") {
      // Daily for last 7 days (existing logic)
      const labels: string[] = [];
      const starts: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = dayN(i);
        labels.push(ddmm(d));
        starts.push(d);
      }
      const series = labels.map((label, idx) => {
        const start = starts[idx], end = new Date(start);
        end.setDate(start.getDate() + 1);
        const total = tx
          .filter((t) => {
            const tms = new Date(t.ts).getTime();
            return tms >= start.getTime() && tms < end.getTime();
          })
          .reduce((s, t) => s + Math.abs(Math.min(0, asNumber(t.amount_base ?? t.amount))), 0);
        return { label, value: Number(total.toFixed(2)) };
      });
      let maxIdx = 0;
      for (let i = 1; i < series.length; i++) if (series[i].value > series[maxIdx].value) maxIdx = i;
      return { series, maxIdx };
    }

    // 12 months: monthly aggregation (current month and previous 11)
    const now = new Date();
    const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

    const starts: Date[] = [];
    for (let i = 11; i >= 0; i--) {
      starts.push(addMonths(monthStart(now), -i));
    }
    const labels = starts.map((s) =>
      s.toLocaleString(undefined, { month: "short" }) // e.g., Jan, Feb
    );

    const series = starts.map((start, idx) => {
      const end = addMonths(start, 1);
      const total = tx
        .filter((t) => {
          const tms = new Date(t.ts).getTime();
          return tms >= start.getTime() && tms < end.getTime();
        })
        .reduce((s, t) => s + Math.abs(Math.min(0, asNumber(t.amount_base ?? t.amount))), 0);
      return { label: labels[idx], value: Number(total.toFixed(2)) };
    });

    let maxIdx = 0;
    for (let i = 1; i < series.length; i++) if (series[i].value > series[maxIdx].value) maxIdx = i;
    return { series, maxIdx };
  }, [tx, range]);
}

/* ================= Chart helpers ================= */
const moneyFmt = (n: number) =>
  `$${n.toLocaleString(undefined, {
    minimumFractionDigits: n < 10 ? 2 : 0,
    maximumFractionDigits: n < 10 ? 2 : 0,
  })}`;

function niceStep(max: number, ticks = 4) {
  const rough = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 0.01))));
  const bases = [1, 2, 2.5, 5, 10];
  const base = bases.find((b) => b * pow >= rough) ?? 10;
  return base * pow;
}

function spline(points: { x: number; y: number }[], smooth = 0.2) {
  const seg = (
    p: { x: number; y: number },
    i: number,
    a: { x: number; y: number }[],
  ) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = a[i - 1],
      next = a[i + 1] || p;
    const dx = next.x - prev.x,
      dy = next.y - prev.y;
    const c1x = prev.x + dx * smooth,
      c1y = prev.y + dy * smooth;
    const c2x = p.x - dx * smooth,
      c2y = p.y - dy * smooth;
    return `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p.x} ${p.y}`;
  };
  return points.map(seg).join(" ");
}

/* ================= Chart ================= */
function OverviewChart({
  series,
  maxIdx,
  height = 210,
  padding = 18,
  fontFamily = CHART_FONT,
}: {
  series: { label: string; value: number }[];
  maxIdx: number;
  height?: number;
  padding?: number;
  fontFamily?: string;
}) {
  const width = W - 32;
  if (!series || series.length < 2) return <Svg width={width} height={height} />;

  const graphW = width - padding * 2;
  const graphH = height - padding * 2;

  const vals = series.map((s) => s.value);
  const rawMax = Math.max(0.01, ...vals);
  const step = niceStep(rawMax, 4);
  const max = Math.ceil(rawMax / step) * step;

  const nx = (i: number) => padding + (i / (series.length - 1)) * graphW;
  const ny = (v: number) => padding + (1 - v / max) * graphH;

  const pts = series.map((p, i) => ({ x: nx(i), y: ny(p.value) }));
  const line = spline(pts, 0.2);
  const area = `${line} L ${nx(series.length - 1)} ${padding + graphH} L ${nx(0)} ${padding + graphH} Z`;

  // Clamp active and peak indices
  const [active, setActive] = React.useState(series.length - 1);
  const lastIdx = Math.max(0, series.length - 1);
  React.useEffect(() => {
    setActive(lastIdx);
  }, [lastIdx]);

  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
  const safeActive = clamp(active, 0, lastIdx);
  const safePeakIdx = clamp(maxIdx, 0, lastIdx);

  const a = pts[safeActive];
  const peak = pts[safePeakIdx];

  const onTouch = (x: number) => {
    const rel = Math.min(Math.max(x - padding, 0), graphW);
    const idx = Math.round((rel / graphW) * (series.length - 1));
    setActive(clamp(idx, 0, lastIdx));
  };

  const yTicks = Math.round(max / step);
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Number((i * step).toFixed(2)),
  );

  const yLabelStyle = {
    fontSize: 11,
    fontWeight: "600" as const,
    fill: "#64748B",
    fontFamily,
  };
  const xLabelStyle = {
    fontSize: 11,
    fontWeight: "600" as const,
    fill: "#64748B",
    fontFamily,
  };
  const chipStyle = {
    fontSize: 11,
    fontWeight: "700" as const,
    fill: "#fff",
    fontFamily,
  };

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onTouch(e.nativeEvent.locationX)}
      onResponderMove={(e) => onTouch(e.nativeEvent.locationX)}
    >
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6F86FF" />
            <Stop offset="1" stopColor="#3BB2F6" />
          </SvgGradient>
          <SvgGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6F86FF" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#6F86FF" stopOpacity="0.02" />
          </SvgGradient>
        </Defs>

        {/* grid + y labels */}
        <G>
          {tickVals.map((v, i) => {
            const y = ny(v);
            return (
              <G key={`y-${i}`}>
                <Path
                  d={`M ${padding} ${y} L ${width - padding} ${y}`}
                  stroke={UI.line}
                  strokeWidth={1}
                />
                <SvgText x={padding - 6} y={y + 4} {...yLabelStyle} textAnchor="end">
                  {moneyFmt(v)}
                </SvgText>
              </G>
            );
          })}
          {series.map((_, i) => (
            <Path
              key={`x-${i}`}
              d={`M ${nx(i)} ${padding} L ${nx(i)} ${padding + graphH}`}
              stroke={i % 2 === 0 ? "transparent" : "#EEF2F7"}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* glow + area + line */}
        <Path d={line} stroke="#6F86FF" strokeOpacity={0.18} strokeWidth={6} fill="none" />
        <Path d={area} fill="url(#gradArea)" />
        <Path
          d={line}
          stroke="url(#gradLine)"
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />

        {/* dots */}
        {pts.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} fill="#6F86FF" />
        ))}

        {/* active marker + tooltip */}
        <G>
          <Path
            d={`M ${a.x} ${padding} L ${a.x} ${padding + graphH}`}
            stroke="rgba(111,134,255,0.35)"
            strokeWidth={1}
          />
          <Circle cx={a.x} cy={a.y} r={9} fill="#fff" />
          <Circle cx={a.x} cy={a.y} r={5} fill="#6F86FF" />
          <G x={Math.min(a.x + 8, width - 128)} y={Math.max(a.y - 28, 8)}>
            <Rect width={120} height={26} rx={13} fill="#6F86FF" />
            <SvgText x={60} y={16} {...chipStyle} textAnchor="middle">
              {moneyFmt(series[safeActive].value)} • {series[safeActive].label}
            </SvgText>
          </G>
        </G>

        {/* peak chip */}
        <G x={Math.min(peak.x + 8, width - 64)} y={Math.max(peak.y - 26, 8)}>
          <Rect width={60} height={22} rx={11} fill="#6F86FF" />
          <SvgText x={30} y={14} {...chipStyle} textAnchor="middle">
            {moneyFmt(series[safePeakIdx].value)}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/* ================= History state ================= */
function useTxHistory() {
  const [tx, setTx] = React.useState<Tx[]>(initialTx);
  // keep subscription active (React will use the returned function as cleanup)
  React.useEffect(() => PaymentsBus.subscribe((t) => setTx((p) => [t, ...p])), []);
  return { tx };
}

/* ================= Screen ================= */
export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const y = React.useRef(new RNAnimated.Value(0)).current;
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [txModalVisible, setTxModalVisible] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState(false);
  const { tx } = useTxHistory();

  // Range toggle: 7 days vs 12 months
  const [chartRange, setChartRange] = React.useState<ChartRange>("7d");
  const { series, maxIdx } = useSeries(tx, chartRange);

  // Define the base currency (normally from profile; default USD)
  const [baseCurrency] = React.useState("USD");

  // New: add-transaction modal state
  const [form, setForm] = React.useState({
    amount: "",
    currency: "EUR",
    date: "", // ISO yyyy-mm-dd (optional)
    isExpense: true,
    merchant: "",
  });

  const submitNewTx = async () => {
    try {
      const amt = parseFloat(form.amount.replace(",", "."));
      if (!isFinite(amt) || amt <= 0) {
        Alert.alert("Invalid amount", "Enter a positive number.");
        return;
      }

      // Accept names/symbols and 3-letter codes
      const iso = parseCurrency(form.currency) ?? form.currency.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso)) {
        Alert.alert("Invalid currency", "Use a code or name like EUR, USD, MDL, Euro, Pound, Lei.");
        return;
      }
      const currencyOriginal = iso;

      // Parse date
      const ts =
        form.date && !isNaN(Date.parse(form.date))
          ? new Date(form.date).toISOString()
          : new Date().toISOString();

      const amountOriginalSigned = form.isExpense ? -Math.abs(amt) : Math.abs(amt);

      let normalized = Math.abs(amt);
      let rate = 1;
      let at = new Date().toISOString();
      try {
        const res = await Fx.normalizeAmount(Math.abs(amt), currencyOriginal, baseCurrency);
        normalized = res.normalized;
        rate = res.rate;
        at = res.at;
      } catch (e: any) {
        // Show precise error to help diagnose, but do not add mixed-currency into USD totals
        if (currencyOriginal !== baseCurrency) {
          Alert.alert("FX error", String(e?.message || e || "Could not fetch FX rate."));
          return;
        }
      }

      const amountBaseSigned = form.isExpense ? -Math.abs(normalized) : Math.abs(normalized);

      const newTx = {
        id: `fx-${Date.now()}`,
        ts,
        merchant: form.merchant || "Manual Entry",
        type: "other" as const,
        amount: amountBaseSigned,
        amount_base: amountBaseSigned,
        base_currency: baseCurrency,
        amount_original: amountOriginalSigned,
        currency_original: currencyOriginal,
        fx_rate: rate,
        fx_at: at,
      };
      PaymentsBus.add(newTx);

      // If on 7d and the chosen date isn't in the last 7 days, switch to 12m so it's visible
      if (chartRange === "7d" && !isWithinLast7Days(new Date(ts))) {
        setChartRange("12m");
      }

      setTxModalVisible(false);
      setForm({ amount: "", currency: currencyOriginal, date: "", isExpense: true, merchant: "" });
    } catch (err) {
      Alert.alert("Error", "Failed to add transaction.");
    }
  };

  const headerTranslate = y.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -24],
    extrapolate: "clamp",
  });
  const heroScale = y.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.965],
    extrapolate: "clamp",
  });
  const onScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y } } }],
    { useNativeDriver: true },
  );

  const displayName =
    (user?.name && String(user.name)) ||
    (user?.email && String(user.email).split("@")[0]) ||
    "Guest";
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <Reanimated.View entering={FadeInDown.duration(240)}>
        <RNAnimated.View
          style={[styles.headerBar, { transform: [{ translateY: headerTranslate }] }]}
        >
          <View style={styles.pillHeader}>
            <View style={styles.avatarWrap}>
              {user?.avatarUrl && !avatarError ? (
                <Image 
                  source={{ uri: user.avatarUrl }} 
                  style={styles.avatarImg}
                  onError={() => {
                    console.log('Avatar failed to load, showing initials');
                    setAvatarError(true);
                  }}
                />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.greetingMuted}>Welcome,</Text>
              <Text style={styles.greetingName}>{displayName}</Text>
            </View>

            <TouchableOpacity 
              style={styles.gearBtn} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="settings-outline" size={22} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.headerActionBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="notifications-outline" size={24} />
          </TouchableOpacity>
        </RNAnimated.View>
      </Reanimated.View>

      {/* Menu */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)} />
        <View style={styles.menu}>
          <Text style={styles.menuEmail}>{user?.email || "user@example.com"}</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
            <Ionicons name="log-out-outline" size={18} />
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal transparent visible={txModalVisible} animationType="fade" onRequestClose={() => setTxModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTxModalVisible(false)} />
        <View style={styles.addModalCard}>
          <Text style={styles.addTitle}>Add Transaction (FX)</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              value={form.amount}
              onChangeText={(t) => setForm((f) => ({ ...f, amount: t }))}
              placeholder="e.g. 25.50"
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Currency</Text>
            <TextInput
              value={form.currency}
              onChangeText={(t) => setForm((f) => ({ ...f, currency: t }))}
              placeholder="EUR / USD / GBP / MDL / RON or names like Euro, Pound, Lei"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              // allow longer free-text inputs (names/symbols)
              maxLength={16}
            />
          </View>

          <View style={styles.quickChips}>
            {["EUR", "USD", "MDL", "GBP", "RON"].map((c) => (
              <Pressable key={c} onPress={() => setForm((f) => ({ ...f, currency: c }))} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Date (ISO)</Text>
            <TextInput
              value={form.date}
              onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
              placeholder="YYYY-MM-DD (optional)"
              style={styles.input}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Merchant</Text>
            <TextInput
              value={form.merchant}
              onChangeText={(t) => setForm((f) => ({ ...f, merchant: t }))}
              placeholder="e.g. Coffee Shop"
              style={styles.input}
            />
          </View>

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setForm((f) => ({ ...f, isExpense: true }))}
              style={[styles.toggleBtn, form.isExpense && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, form.isExpense && styles.toggleTextActive]}>Expense</Text>
            </Pressable>
            <Pressable
              onPress={() => setForm((f) => ({ ...f, isExpense: false }))}
              style={[styles.toggleBtn, !form.isExpense && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, !form.isExpense && styles.toggleTextActive]}>Income</Text>
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setTxModalVisible(false)} style={[styles.actionBtn, styles.btnSecondary]}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submitNewTx} style={[styles.actionBtn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main scroller */}
      <RNAnimated.FlatList
        data={tx}
        // Make sure header (chart) rerenders when tx changes or range changes
        extraData={{ txCount: tx.length, chartRange }}
        keyExtractor={(i) => i.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {/* My Cards */}
            <RNAnimated.View style={{ transform: [{ scale: heroScale }] }}>
              <Text style={styles.section}>My Cards</Text>
              <Reanimated.View entering={FadeInUp.delay(40).duration(320)}>
                <Reanimated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_W + CARD_MARGIN}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 28,
                  }}
                >
                  {accounts.map((acc, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: CARD_W,
                        marginRight: CARD_MARGIN,
                        marginVertical: 6,
                      }}
                    >
                      <View style={styles.cardWrap}>
                        <View style={styles.cardInner}>
                          <LinearGradient
                            colors={["#6F86FF", "#3BB2F6"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradient}
                          >
                            <View style={styles.rowBetween}>
                              <View>
                                <Text style={styles.muted}>Available Balance</Text>
                                <Text style={styles.balance}>
                                  $
                                  {acc.balance.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                                <Text style={styles.dots}>
                                  •••• {String(acc.last4 || 8635).padStart(4, "0")}
                                </Text>
                              </View>
                              <Ionicons name="card" size={28} color="#fff" />
                            </View>

                            <View style={[styles.rowBetween, { marginTop: 8 }]}>
                              <View>
                                <Text style={styles.metaLight}>Valid From 12/25</Text>
                                <Text style={styles.metaLight}>Valid Thru 10/30</Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.metaLight}>Card Holder</Text>
                                <Text style={styles.holderLight}>{displayName}</Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </View>
                      </View>
                    </View>
                  ))}
                </Reanimated.ScrollView>
              </Reanimated.View>
            </RNAnimated.View>

            {/* Overview */}
            <Reanimated.View entering={FadeInUp.delay(100).duration(380)} style={{ marginTop: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.section}>
                  Overview {chartRange === "7d" ? "(7 days)" : "(12 months)"}
                </Text>
                <TouchableOpacity
                  onPress={() => setChartRange((r) => (r === "7d" ? "12m" : "7d"))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.link}>{chartRange === "7d" ? "See all" : "See 7d"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
                <View style={[styles.shadowLg, styles.frostWrap, { borderRadius: 22, padding: 0 }]}>
                  <BlurView style={StyleSheet.absoluteFill} intensity={24} tint="light" />
                  <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
                    <OverviewChart series={series} maxIdx={maxIdx} />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingHorizontal: 18,
                      paddingBottom: 12,
                    }}
                  >
                    {series.map((d, i) => (
                      <Text key={`${d.label}-${i}`} style={{ color: UI.sub, fontSize: 11 }}>
                        {d.label}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </Reanimated.View>

            {/* Transaction section label + open form */}
            <Reanimated.View entering={FadeInUp.delay(160).duration(320)} style={{ marginTop: 6 }}>
              <View style={[styles.rowBetween, { paddingHorizontal: 16 }]}>
                <Text style={styles.section}>Transaction History</Text>
                <TouchableOpacity onPress={() => setTxModalVisible(true)}>
                  <Text style={styles.link}>Add</Text>
                </TouchableOpacity>
              </View>
            </Reanimated.View>
          </>
        }
        renderItem={({ item }) => {
          const d = new Date(item.ts);
          const dateStr = ddmm(d);
          let iconEl: React.ReactNode = <Ionicons name="receipt-outline" size={18} />;
          const m = item.merchant.toLowerCase();
          if (m.includes("netflix")) iconEl = <FontAwesome5 name="netflix" size={18} />;
          else if (m.includes("paypal")) iconEl = <FontAwesome5 name="paypal" size={18} />;
          else if (m.includes("spotify")) iconEl = <FontAwesome5 name="spotify" size={18} />;

          const normalized = item.amount_base ?? item.amount;
          const normalizedAbs = Math.abs(normalized);
          const base = item.base_currency ?? "USD";

          const hasOriginal =
            item.amount_original != null &&
            item.currency_original &&
            item.currency_original.toUpperCase() !== (base || "").toUpperCase();

          return (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <View style={[styles.shadowLg, styles.frostWrap, { borderRadius: 18 }]}>
                <BlurView style={StyleSheet.absoluteFill} intensity={24} tint="light" />
                <View style={{ padding: 14 }}>
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={styles.brandCircle}>{iconEl}</View>
                      <View>
                        <Text style={{ fontWeight: "700", color: UI.text }}>{item.merchant}</Text>
                        <Text style={{ color: UI.sub, fontSize: 12 }}>
                          {dateStr} · {item.type}
                        </Text>
                        {hasOriginal ? (
                          <Text style={{ color: UI.sub, fontSize: 12, marginTop: 2 }}>
                            Original: {fmtMoney(Math.abs(item.amount_original!), item.currency_original!)} · rate {item.fx_rate?.toFixed(4)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontWeight: "700", color: UI.text }}>
                        {fmtMoney(normalizedAbs, base)}
                      </Text>
                      {hasOriginal && item.fx_at ? (
                        <Text style={{ color: UI.sub, fontSize: 11 }}>
                          {new Date(item.fx_at).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

/* ================= Styles ================= */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  section: {
    fontSize: 14,
    fontWeight: "900",
    color: UI.text,
    paddingHorizontal: 16,
  },
  link: {
    fontSize: 12,
    color: UI.primary,
    fontWeight: "700",
    paddingRight: 16,
  },

  // cards text
  muted: { color: "rgba(255,255,255,0.95)", fontSize: 12 },
  balance: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 2 },
  dots: { color: "rgba(255,255,255,0.95)", letterSpacing: 3, marginTop: 6 },
  metaLight: { color: "rgba(255,255,255,0.9)", fontSize: 11 },
  holderLight: { color: "#fff", fontWeight: "800", marginTop: 2 },

  /* frosted blocks */
  frostWrap: {
    backgroundColor: UI.card,
    borderColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  shadowLg: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  /* header pill */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  pillHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 32,
    flex: 1,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { 
    backgroundColor: UI.primary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarInitials: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  greetingMuted: { color: UI.sub, fontSize: 12, marginBottom: 2 },
  greetingName: { color: UI.text, fontSize: 20, fontWeight: "900" },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  /* list item */
  brandCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    marginRight: 10,
  },

  /* card container with shadow */
  cardWrap: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  cardInner: { borderRadius: 24, overflow: "hidden" },
  cardGradient: { padding: 18, minHeight: 140 }, // shorter

  /* modal */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  menu: {
    position: "absolute",
    right: 16,
    top: 80,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  menuEmail: { color: UI.text, fontWeight: "700", marginBottom: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  menuText: { marginLeft: 6, color: UI.text },
  addModalCard: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 120,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  addTitle: { fontSize: 16, fontWeight: "900", color: UI.text, marginBottom: 8 },
  inputRow: { marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: UI.sub, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: UI.text,
    backgroundColor: "#fff",
  },
  quickChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  chipText: { color: UI.text, fontWeight: "700", fontSize: 12 },
  toggleRow: { flexDirection: "row", gap: 8, marginTop: 2, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#246BFD", borderColor: "#246BFD" },
  toggleText: { fontSize: 13, fontWeight: "700", color: UI.text },
  toggleTextActive: { color: "#fff" },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnSecondary: { backgroundColor: "#F3F4F6" },
  btnSecondaryText: { color: UI.text, fontWeight: "800" },
  btnPrimary: { backgroundColor: "#246BFD" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});

// Map free-text to ISO currency code (supports names/symbols)
const parseCurrency = (input: string): string | null => {
  if (!input) return null;
  const raw = String(input).trim();

  // If already a 3-letter code
  const maybeCode = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(maybeCode)) return maybeCode;

  // Normalize text
  const txt = raw.toLowerCase().replace(/[^a-z£€$ ]/g, "").trim();

  const map: Record<string, string> = {
    // symbols
    "€": "EUR",
    "eur": "EUR",
    "euro": "EUR",
    "euro currency": "EUR",

    "$": "USD",
    "usd": "USD",
    "us dollar": "USD",
    "dollar": "USD",

    "£": "GBP",
    "gbp": "GBP",
    "pound": "GBP",
    "british pound": "GBP",

    "mdl": "MDL",
    "moldovan leu": "MDL",
    "leu moldovenesc": "MDL",

    "ron": "RON",
    "romanian leu": "RON",
    "leu romanesc": "RON",
    "lei": "RON", // ambiguous; default to RON
  };

  return map[txt] ?? null;
};
