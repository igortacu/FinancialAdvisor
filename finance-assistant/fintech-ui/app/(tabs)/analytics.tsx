// app/(tabs)/Analytics.tsx
import React from "react";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  UIManager,
  TextInput,
  Switch,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import CompactChart from "@/components/CompactChart";
import {
  VictoryChart,
  VictoryAxis,
  VictoryGroup,
  VictoryBar,
  VictoryPie,
  VictoryArea,
  VictoryLine,
  VictoryContainer,
  VictoryScatter,
  ChartsReady,
  VictoryLabel,
} from "../../lib/charts";

// ---------- helpers ----------
function formatMoney(val: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${Math.round(val)} ${currency}`;
  }
}

// Add month abbreviations (for current-month detection)
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

// Helper to fetch current month info from device time
function getCurrentMonth() {
  const d = new Date();
  const index = d.getMonth();
  const abbr = MONTH_ABBR[index];
  const name = d.toLocaleString(undefined, { month: "long" });
  return { index, abbr, name };
}

// ---------- Types for chart data ----------
interface PieChartDatum {
  x: string;
  y: number;
}

interface IncomeExpenseEvent {
  day: number;
  amount: number;
  label: string;
}

// ---------- mocked data ----------
const fallbackMonthly = [
  { month: "Jan", needs: 1200, wants: 700, savings: 400 },
  { month: "Feb", needs: 1500, wants: 600, savings: 500 },
  { month: "Mar", needs: 1300, wants: 800, savings: 450 },
  { month: "Apr", needs: 1400, wants: 750, savings: 600 },
  { month: "May", needs: 1600, wants: 900, savings: 700 },
  { month: "Jun", needs: 1700, wants: 800, savings: 600 },
  { month: "Jul", needs: 1500, wants: 700, savings: 500 },
  { month: "Aug", needs: 1800, wants: 1000, savings: 800 },
  { month: "Sep", needs: 1600, wants: 900, savings: 700 },
  // Q4 months with realistic projected/estimated values
  { month: "Oct", needs: 1550, wants: 850, savings: 650 },
  { month: "Nov", needs: 1700, wants: 950, savings: 600 },
  { month: "Dec", needs: 1900, wants: 1200, savings: 500 },
];

const fallbackCash7d = [
  { x: 1, y: 1200 },
  { x: 2, y: 1100 },
  { x: 3, y: 1400 },
  { x: 4, y: 1300 },
  { x: 5, y: 1500 },
  { x: 6, y: 1250 },
  { x: 7, y: 1600 },
];

// 30-day forecast (weekly data points)
const forecast30d = [
  { day: 0, y: 1600 },
  { day: 7, y: 1750 },
  { day: 14, y: 1900 },
  { day: 21, y: 2000 },
  { day: 30, y: 2100 },
];

// 90-day forecast (bi-weekly data points)
const forecast90d = [
  { day: 0, y: 1600 },
  { day: 15, y: 1800 },
  { day: 30, y: 2100 },
  { day: 45, y: 2350 },
  { day: 60, y: 2550 },
  { day: 75, y: 2700 },
  { day: 90, y: 2900 },
];

// Generate confidence bands (±15%)
const confidence30d = forecast30d.map((d) => ({
  day: d.day,
  y0: d.y * 0.85,
  y: d.y * 1.15,
}));

const confidence90d = forecast90d.map((d) => ({
  day: d.day,
  y0: d.y * 0.85,
  y: d.y * 1.15,
}));

const received7dList = [
  { amount: 2850, description: "Victoria Bank", category: "Salary" },
  { amount: 450, description: "Freelance Client", category: "Consulting Fee" },
  { amount: 125, description: "PayPal Transfer", category: "Online Sales" },
  { amount: 85, description: "Cash Refund", category: "Return" },
  { amount: 200, description: "Family Transfer", category: "Gift" },
];

// ---------- small UI ----------
function KPI({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <View accessibilityRole="summary" accessibilityLabel={`${label}: ${value}${delta ? `, change: ${delta}` : ''}`}>
        <Text style={{ color: "#6B7280", fontSize: 12 }} accessibilityRole="text">{label}</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 4 }} accessibilityRole="text">
          {value}
        </Text>
        {delta ? (
          <Text
            style={{
              color: delta.startsWith("+") ? "#16a34a" : "#ef4444",
              marginTop: 2,
            }}
            accessibilityRole="text"
            accessibilityLabel={`Change: ${delta}`}
          >
            {delta}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function LegendRow({
  color,
  label,
  amount,
  pct,
}: {
  color: string;
  label: string;
  amount: string;
  pct: string;
}) {
  return (
    <View style={s.rowBetween}>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: color }]} />
        <Text style={s.kvKey}>{label}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.kvVal}>{amount}</Text>
        <Text style={s.percentageText}>{pct}</Text>
      </View>
    </View>
  );
}

function LegendKey({ color, text }: { color: string; text: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{text}</Text>
    </View>
  );
}

function BreakdownRow({
  color,
  label,
  amount,
  total,
  currency,
  budget,
}: {
  color: string;
  label: string;
  amount: number;
  total: number;
  currency: string;
  budget?: number;
}) {
  const pct = (amount / total) * 100;
  const usagePctOfBudget = budget ? (amount / budget) * 100 : undefined;
  const alert =
    budget && amount >= budget
      ? { text: "Over budget", type: "danger" as const }
      : budget && amount >= budget * 0.8
      ? { text: `${Math.round(usagePctOfBudget!)}% used`, type: "warning" as const }
      : null;

  return (
    <View style={s.statItemEnhanced}>
      <View style={s.statHeader}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: color }]} />
          <Text style={s.statLabel}>{label}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.statAmount}>{formatMoney(amount, currency)}</Text>
          {budget != null ? (
            <Text style={s.budgetHint}>Budget: {formatMoney(budget, currency)}</Text>
          ) : null}
        </View>
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.statPercent}>{pct.toFixed(0)}% of total</Text>
        {alert ? (
          <Text style={alert.type === "danger" ? s.alertDanger : s.alertWarning}>{alert.text}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------- Modal-based MonthDropdown (always above charts) ----------
import type { StyleProp, ViewStyle, TextStyle } from "react-native";

function MonthDropdown({
  value,
  options,
  onChange,
  buttonStyle,
  buttonTextStyle,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  buttonStyle: StyleProp<ViewStyle>;
  buttonTextStyle: StyleProp<TextStyle>;
}) {
  // View on native; HTMLElement on web
  const btnRef = React.useRef<View | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>(
    { top: 0, left: 0, width: 180 }
  );

  const openMenu = () => {
    const menuW = 180;

    if (Platform.OS === "web") {
      // Try to get the DOM node and read its rect
      const el = btnRef.current as any;
      
      if (el && typeof el.getBoundingClientRect === "function") {
        const r = el.getBoundingClientRect();
        const screenW = window.innerWidth;
        const left = Math.min(
          Math.max(r.left + r.width - menuW + window.scrollX, 12),
          screenW - menuW - 12
        );
        setPos({ top: r.top + window.scrollY + 44, left, width: menuW });
      }
      setOpen(true);
      return;
    }

    // Native (iOS/Android)
    const { findNodeHandle } = require("react-native");
    const node = findNodeHandle(btnRef.current);
    if (node && UIManager?.measureInWindow) {
      UIManager.measureInWindow(node, (x: number, y: number, w: number) => {
        const screenW = Dimensions.get("window").width;
        const left = Math.min(Math.max(x + w - menuW, 12), screenW - menuW - 12);
        setPos({ top: y + 44, left, width: menuW });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* On web, the ref will become an HTMLElement; on native, a View */}
      <Pressable 
        ref={btnRef} 
        style={buttonStyle} 
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Select month, currently ${value === "All" ? "All Months" : value}`}
        accessibilityHint="Opens month selection dropdown"
      >
        <Text style={buttonTextStyle}>{value === "All" ? "All Months" : value}</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 8, fontWeight: "600" }} accessibilityElementsHidden>
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType={Platform.OS === "android" ? "fade" : "none"}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={{ flex: 1, backgroundColor: "transparent" }} />
        </TouchableWithoutFeedback>

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "white",
            borderWidth: 2,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingVertical: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 24,
          }}
        >
          <Pressable
            onPress={() => {
              onChange("All");
              closeMenu();
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text style={{ fontSize: 14, fontWeight: value === "All" ? "700" : "500", color: value === "All" ? "#246BFD" : "#374151" }}>
              All Months
            </Text>
          </Pressable>

          {options.map((m, i) => (
            <Pressable
              key={m}
              onPress={() => {
                onChange(m);
                closeMenu();
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: i === options.length - 1 ? 0 : 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: value === m ? "700" : "500",
                  color: value === m ? "#246BFD" : "#374151",
                }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}


// ---------- Screen ----------
export default function Analytics() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive chart width (accounting for padding)
  const chartWidth = Math.min(screenWidth - 64, 450);
  const singleMonthChartWidth = Math.min(screenWidth - 64, 350);
  const forecastChartWidth = Math.min(screenWidth - 64, 350);

  const [currency] = React.useState("USD");

  // sample totals for current pie
  const [spentNeeds] = React.useState(1550);
  const [spentWants] = React.useState(980);
  const [spentSavings] = React.useState(520);

  // month selector
  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");

  // forecast period selector
  const [forecastPeriod, setForecastPeriod] = React.useState<"30" | "90">("30");

  // cash flow
  const [cashSeries] = React.useState(fallbackCash7d);
  const [received7d] = React.useState(3810);
  const [receivedTransactions] = React.useState(received7dList);

  // Budgets and carryover
  const [budgets, setBudgets] = React.useState({ needs: 1600, wants: 900, savings: 600 });
  const [carryover, setCarryover] = React.useState(true);

  // Determine effective current month based on device date; if absent in data, use last month in data
  const monthsInData = React.useMemo(() => fallbackMonthly.map((m) => m.month), []);
  const { abbr: sysMonthName, name: sysMonthLong } = getCurrentMonth();
  const effectiveCurrentMonth = monthsInData.includes(sysMonthName)
    ? sysMonthName
    : monthsInData[monthsInData.length - 1];

  const filteredMonthlyData =
    selectedMonth === "All"
      ? fallbackMonthly
      : fallbackMonthly.filter((m) => m.month === selectedMonth);

  // Whether the currently selected month is the editable current month
  const isCurrentMonthSelected =
    selectedMonth !== "All" && selectedMonth === effectiveCurrentMonth;

  // Data for "All" view: replace current month's bars with editable budgets, keep others as actuals
  const monthlyDataWithCurrentBudget = React.useMemo(
    () =>
      fallbackMonthly.map((m) => ({
        month: m.month,
        needs: m.month === effectiveCurrentMonth ? budgets.needs : m.needs,
        wants: m.month === effectiveCurrentMonth ? budgets.wants : m.wants,
        savings: m.month === effectiveCurrentMonth ? budgets.savings : m.savings,
      })),
    [budgets, effectiveCurrentMonth]
  );

  const pieChartData = React.useMemo(() => {
    const total = spentNeeds + spentWants + spentSavings || 1;
    return {
      current: [
        { x: "Needs", y: (spentNeeds / total) * 100 },
        { x: "Wants", y: (spentWants / total) * 100 },
        { x: "Savings", y: (spentSavings / total) * 100 },
      ],
      goal: [
        { x: "Needs", y: 50 },
        { x: "Wants", y: 30 },
        { x: "Savings", y: 20 },
      ],
    };
  }, [spentNeeds, spentWants, spentSavings]);
 
  const forecastData = forecastPeriod === "30" ? forecast30d : forecast90d;
  const confData = forecastPeriod === "30" ? confidence30d : confidence90d;
  const xMax = Math.max(...forecastData.map((p) => p.day));
  const rawYMax = Math.max(...forecastData.map((p) => p.y));
  const yMax = Math.ceil((rawYMax * 1.15) / 100) * 100 || 2500;

  // Helpers for budget editing
  const setBudget = (key: "needs" | "wants" | "savings", v: string) => {
    const n = Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0);
    setBudgets((b) => ({ ...b, [key]: n }));
  };

    // Alerts for selected month (quick summary pills)
  
  // Map each month to its budget; use the current editable budgets for all months
  const budgetByMonth = React.useMemo(() => {
    const map: Record<string, { needs: number; wants: number; savings: number }> = {};
    fallbackMonthly.forEach((m) => {
      map[m.month] = { needs: budgets.needs, wants: budgets.wants, savings: budgets.savings };
    });
    return map;
  }, [budgets]);
  
    const selectedMonthBudgets =
      selectedMonth !== "All" ? budgetByMonth[selectedMonth] : undefined;
    const selectedMonthSpend =
      selectedMonth !== "All" ? filteredMonthlyData[0] : undefined;
    const monthAlerts =
      selectedMonthBudgets && selectedMonthSpend
        ? ( [
          {
            label: "Needs",
            spent: selectedMonthSpend.needs,
            budget: selectedMonthBudgets.needs,
          },
          {
            label: "Wants",
            spent: selectedMonthSpend.wants,
            budget: selectedMonthBudgets.wants,
          },
          {
            label: "Savings",
            spent: selectedMonthSpend.savings,
            budget: selectedMonthBudgets.savings,
          },
        ] as const)
          .map((x) => {
            if (x.spent >= x.budget) return { label: x.label, type: "danger" as const, text: "Over budget" };
            if (x.spent >= x.budget * 0.8) return { label: x.label, type: "warning" as const, text: "80%+ used" };
            return null;
          })
          .filter(Boolean)
      : [];

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* KPIs */}
      <Animated.View
        entering={FadeInUp.duration(380)}
        style={{ flexDirection: "row", gap: 12 }}
      >
        <KPI label="Income (M)" value="$4,100" delta="+3.2%" />
        <KPI label="Expenses (M)" value="$2,320" delta="-1.1%" />
      </Animated.View>

      {!ChartsReady ? (
        <Card>
          <Text style={{ fontWeight: "800" }}>Charts unavailable</Text>
          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Install <Text style={{ fontWeight: "700" }}>victory</Text>,{" "}
            <Text style={{ fontWeight: "700" }}>victory-native</Text> and{" "}
            <Text style={{ fontWeight: "700" }}>react-native-svg</Text>. Then
            run <Text style={{ fontWeight: "700" }}>npx expo start -c</Text>.
          </Text>
        </Card>
      ) : (
        <>
          {/* Category share */}
          <Animated.View entering={FadeInUp.delay(100).duration(420)}>
            <Card>
              <Text style={s.h1}>Category share</Text>
              <View style={{ alignItems: "center" }}>
                <VictoryPie
                  height={220}
                  innerRadius={60}
                  padAngle={2}
                  animate={{ duration: 900 }}
                  data={[
                    { x: "Bills", y: 34 },
                    { x: "Groceries", y: 26 },
                    { x: "Transport", y: 14 },
                    { x: "Fun", y: 12 },
                    { x: "Other", y: 14 },
                  ]}
                  colorScale={["#246BFD", "#5b76f7", "#9db7ff", "#cfe3ff", "#e5edff"]}
                  labels={({ datum }: { datum: PieChartDatum }) => `${datum.x}\n${datum.y}%`}
                  style={{ labels: { fontSize: 12, fill: "#111827" } }}
                />
              </View>
            </Card>
          </Animated.View>


          {/* 50/30/20 — Current vs Goal */}
          <Animated.View entering={FadeInUp.delay(140).duration(420)}>
            <Card>
              <Text style={s.h1}>50/30/20 — Current vs Goal</Text>
              <View style={s.piesRow}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={s.pieChartTitle}>Current</Text>
                    <VictoryPie
                      width={150}
                      height={150}
                      innerRadius={40}
                      padAngle={2}
                      animate={{ duration: 700 }}
                      data={pieChartData.current}
                      colorScale={["#EF4444", "#F59E0B", "#10B981"]}
                      labels={() => null}
                    />
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={s.pieChartTitle}>Goal</Text>
                    <VictoryPie
                      width={150}
                      height={150}
                      innerRadius={40}
                      padAngle={2}
                      animate={{ duration: 700 }}
                      data={pieChartData.goal}
                      colorScale={["#246BFD", "#5b76f7", "#9db7ff"]}
                      labels={() => null}
                    />
                  </View>
                </View>

              {/* Legend */}
              <View style={{ marginTop: 16, gap: 8 }}>
                <LegendRow
                  color="#EF4444"
                  label="Needs"
                  amount={formatMoney(spentNeeds, currency)}
                  pct={`${pieChartData.current[0]?.y.toFixed(0)}% / 50%`}
                />
                <LegendRow
                  color="#F59E0B"
                  label="Wants"
                  amount={formatMoney(spentWants, currency)}
                  pct={`${pieChartData.current[1]?.y.toFixed(0)}% / 30%`}
                />
                <LegendRow
                  color="#10B981"
                  label="Savings"
                  amount={formatMoney(spentSavings, currency)}
                  pct={`${pieChartData.current[2]?.y.toFixed(0)}% / 20%`}
                />
              </View>
            </Card>
          </Animated.View>

          {/* 50/30/20 — Monthly Trends */}
          <Animated.View entering={FadeInUp.delay(220).duration(420)}>
            <Card style={{ overflow: "visible" }}>
              <View style={s.sectionHeader}>
                <Text style={s.h1}>Monthly Spending Trends</Text>

                <MonthDropdown
                  value={selectedMonth}
                  options={fallbackMonthly.map((m) => m.month)}
                  onChange={(m) => setSelectedMonth(m)}
                  buttonStyle={s.dropdownButton}
                  buttonTextStyle={s.dropdownButtonText}
                />
              </View>

              {/* Detected current month note */}
              <View style={s.currentMonthNote}>
                <Text style={s.currentMonthText}>
                  Current month detected: {sysMonthLong} ({sysMonthName})
                </Text>
              </View>

              {/* Budget controls: only enabled for the current month */}
              {isCurrentMonthSelected ? (
                <View style={s.budgetControls} accessibilityLabel="Budget settings for current month">
                  <View style={s.budgetRow}>
                    <View style={s.budgetItem}>
                      <View style={[s.legendDot, { backgroundColor: "#EF4444" }]} accessibilityElementsHidden />
                      <Text style={s.budgetLabel} nativeID="needs-label">Needs</Text>
                      <TextInput
                        style={s.budgetInput}
                        keyboardType="numeric"
                        value={String(budgets.needs)}
                        onChangeText={(t) => setBudget("needs", t)}
                        placeholder="0"
                        editable
                        accessibilityLabel="Needs budget amount"
                        accessibilityLabelledBy="needs-label"
                      />
                    </View>
                    <View style={s.budgetItem}>
                      <View style={[s.legendDot, { backgroundColor: "#F59E0B" }]} accessibilityElementsHidden />
                      <Text style={s.budgetLabel} nativeID="wants-label">Wants</Text>
                      <TextInput
                        style={s.budgetInput}
                        keyboardType="numeric"
                        value={String(budgets.wants)}
                        onChangeText={(t) => setBudget("wants", t)}
                        placeholder="0"
                        editable
                        accessibilityLabel="Wants budget amount"
                        accessibilityLabelledBy="wants-label"
                      />
                    </View>
                    <View style={s.budgetItem}>
                      <View style={[s.legendDot, { backgroundColor: "#10B981" }]} accessibilityElementsHidden />
                      <Text style={s.budgetLabel} nativeID="savings-label">Savings</Text>
                      <TextInput
                        style={s.budgetInput}
                        keyboardType="numeric"
                        value={String(budgets.savings)}
                        onChangeText={(t) => setBudget("savings", t)}
                        placeholder="0"
                        editable
                        accessibilityLabel="Savings budget amount"
                        accessibilityLabelledBy="savings-label"
                      />
                    </View>
                  </View>
                  <View style={s.carryoverRow}>
                    <Text style={s.carryoverLabel} nativeID="carryover-label">Carryover unused budget</Text>
                    <Switch 
                      value={carryover} 
                      onValueChange={setCarryover}
                      accessibilityLabel="Carryover unused budget toggle"
                      accessibilityRole="switch"
                      accessibilityState={{ checked: carryover }}
                    />
                  </View>
                </View>
              ) : (
                <View style={s.viewOnlyNote}>
                  <Text style={s.viewOnlyText}>
                    Budgets are editable for {effectiveCurrentMonth} only. Select {effectiveCurrentMonth} to adjust.
                  </Text>
                </View>
              )}

              {/* Month alerts (selected month only) */}
              {selectedMonth !== "All" && monthAlerts && monthAlerts.length > 0 ? (
                <View style={s.alertsRow}>
                  {monthAlerts.map((a, idx) => (
                    <View
                      key={`${a!.label}-${idx}`}
                      style={[s.alertPill, a!.type === "danger" ? s.alertPillDanger : s.alertPillWarning]}
                    >
                      <Text style={s.alertPillText}>
                        {a!.label}: {a!.text}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={s.trendsChartWrap}>
                    {selectedMonth === "All" ? (
                      <VictoryChart
                        width={chartWidth}
                        height={300}
                        padding={{ left: 70, right: 30, top: 30, bottom: 50 }}
                        domainPadding={{ x: 40, y: [0, 50] }}
                        animate={{ duration: 800 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t: number) => `${(t / 1000).toFixed(1)}k`}
                          style={{
                            grid: { stroke: "#E5E7EB", strokeDasharray: "3,3", strokeOpacity: 0.5 },
                            tickLabels: { fontSize: 11, fill: "#6B7280", fontWeight: "600" },
                            axis: { stroke: "#D1D5DB", strokeWidth: 1 },
                          }}
                        />
                        <VictoryAxis
                          style={{
                            tickLabels: { fontSize: 11, fill: "#6B7280", fontWeight: "600" },
                            axis: { stroke: "#D1D5DB", strokeWidth: 1 },
                          }}
                        />
                        <VictoryGroup offset={18}>
                          <VictoryBar
                            data={monthlyDataWithCurrentBudget}
                            x="month"
                            y="needs"
                            barWidth={14}
                            style={{ data: { fill: "#EF4444", fillOpacity: 0.9, stroke: "#DC2626", strokeWidth: 1 } }}
                          />
                          <VictoryBar
                            data={monthlyDataWithCurrentBudget}
                            x="month"
                            y="wants"
                            barWidth={14}
                            style={{ data: { fill: "#F59E0B", fillOpacity: 0.9, stroke: "#D97706", strokeWidth: 1 } }}
                          />
                          <VictoryBar
                            data={monthlyDataWithCurrentBudget}
                            x="month"
                            y="savings"
                            barWidth={14}
                            style={{ data: { fill: "#10B981", fillOpacity: 0.9, stroke: "#059669", strokeWidth: 1 } }}
                          />
                        </VictoryGroup>

                        {/* Budget reference lines that move with inputs */}
                        <VictoryLine
                          data={monthlyDataWithCurrentBudget.map((m) => ({ month: m.month, amount: budgets.needs }))}
                          x="month"
                          y="amount"
                          style={{ data: { stroke: "#EF4444", strokeDasharray: "6,4", strokeWidth: 2, opacity: 0.85 } }}
                        />
                        <VictoryLine
                          data={monthlyDataWithCurrentBudget.map((m) => ({ month: m.month, amount: budgets.wants }))}
                          x="month"
                          y="amount"
                          style={{ data: { stroke: "#F59E0B", strokeDasharray: "6,4", strokeWidth: 2, opacity: 0.85 } }}
                        />
                        <VictoryLine
                          data={monthlyDataWithCurrentBudget.map((m) => ({ month: m.month, amount: budgets.savings }))}
                          x="month"
                          y="amount"
                          style={{ data: { stroke: "#10B981", strokeDasharray: "6,4", strokeWidth: 2, opacity: 0.85 } }}
                        />
                      </VictoryChart>
                    ) : (
                      <VictoryChart
                        width={singleMonthChartWidth}
                        height={300}
                        padding={{ left: 70, right: 30, top: 30, bottom: 50 }}
                        domainPadding={{ x: 80, y: [0, 50] }}
                        animate={{ duration: 800 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t: number) => `${(t / 1000).toFixed(1)}k`}
                          style={{
                            grid: { stroke: "#E5E7EB", strokeDasharray: "3,3", strokeOpacity: 0.5 },
                            tickLabels: { fontSize: 11, fill: "#6B7280", fontWeight: "600" },
                            axis: { stroke: "#D1D5DB", strokeWidth: 1 },
                          }}
                        />
                        <VictoryAxis
                          style={{
                            tickLabels: { fontSize: 11, fill: "#6B7280", fontWeight: "600" },
                            axis: { stroke: "#D1D5DB", strokeWidth: 1 },
                          }}
                        />
                        <VictoryGroup offset={40}>
                          {/*
                            If current month is selected, use the editable budgets in the bars,
                            otherwise show historical actuals.
                          */}
                          <VictoryBar
                            data={[
                              {
                                month: selectedMonth,
                                amount: isCurrentMonthSelected
                                  ? budgets.needs
                                  : (filteredMonthlyData[0]?.needs || 0),
                              },
                            ]}
                            x="month"
                            y="amount"
                            barWidth={30}
                            style={{ data: { fill: "#EF4444", fillOpacity: 0.9, stroke: "#DC2626", strokeWidth: 2 } }}
                          />
                          <VictoryBar
                            data={[
                              {
                                month: selectedMonth,
                                amount: isCurrentMonthSelected
                                  ? budgets.wants
                                  : (filteredMonthlyData[0]?.wants || 0),
                              },
                            ]}
                            x="month"
                            y="amount"
                            barWidth={30}
                            style={{ data: { fill: "#F59E0B", fillOpacity: 0.9, stroke: "#D97706", strokeWidth: 2 } }}
                          />
                          <VictoryBar
                            data={[
                              {
                                month: selectedMonth,
                                amount: isCurrentMonthSelected
                                  ? budgets.savings
                                  : (filteredMonthlyData[0]?.savings || 0),
                              },
                            ]}
                            x="month"
                            y="amount"
                            barWidth={30}
                            style={{ data: { fill: "#10B981", fillOpacity: 0.9, stroke: "#059669", strokeWidth: 2 } }}
                          />
                        </VictoryGroup>
                      </VictoryChart>
                    )}
                  </View>

                  {/* legend */}
                  <View style={s.chartLegend}>
                    <View style={s.legendRow}>
                      <LegendKey color="#EF4444" text="Needs" />
                      <LegendKey color="#F59E0B" text="Wants" />
                      <LegendKey color="#10B981" text="Savings" />
                    </View>
                  </View>

                  {/* month breakdown */}
                  <View style={{ marginTop: 20, gap: 16 }}>
                    {filteredMonthlyData.map((m) => {
                      // For the current month, display the editable budgets; for others, use actuals
                      const isCurrent = m.month === effectiveCurrentMonth;
                      const displayed = {
                        needs: isCurrent ? budgets.needs : m.needs,
                        wants: isCurrent ? budgets.wants : m.wants,
                        savings: isCurrent ? budgets.savings : m.savings,
                      };
                      const total = displayed.needs + displayed.wants + displayed.savings || 1;

                      const avail =
                        budgetByMonth[m.month] || {
                          needs: budgets.needs,
                          wants: budgets.wants,
                          savings: budgets.savings,
                        };

                      return (
                        <View key={m.month} style={s.monthlyBreakdown}>
                          <View style={s.monthlyHeader}>
                            <Text style={s.monthTitle}>{m.month} Summary</Text>
                            <Text style={s.monthTotal}>Total: {formatMoney(total, currency)}</Text>
                          </View>

                          <BreakdownRow
                            color="#EF4444"
                            label="Needs"
                            amount={displayed.needs}
                            total={total}
                            currency={currency}
                            budget={avail.needs}
                          />
                          <BreakdownRow
                            color="#F59E0B"
                            label="Wants"
                            amount={displayed.wants}
                            total={total}
                            currency={currency}
                            budget={avail.wants}
                          />
                          <BreakdownRow
                            color="#10B981"
                            label="Savings"
                            amount={displayed.savings}
                            total={total}
                            currency={currency}
                            budget={avail.savings}
                          />
                        </View>
                      );
                    })}
                  </View>
            </Card>
          </Animated.View>

          {/* Cash flow (7d) */}
          <Animated.View entering={FadeInUp.delay(280).duration(420)}>
            <Card>
              <Text style={s.h1}>Cash Flow (7 days)</Text>
              <Text style={{ fontWeight: "700", color: "#16a34a", marginBottom: 8 }}>
                Total Received: {formatMoney(received7d, currency)}
              </Text>

              <CompactChart height={170}>
                    {(w, h) => (
                      <VictoryChart
                        width={w}
                        height={h}
                        padding={{ left: 50, right: 10, top: 20, bottom: 30 }}
                        containerComponent={<VictoryContainer responsive={false} />}
                        animate={{ duration: 700 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t: number) => `${(t / 1000).toFixed(1)}k`}
                          style={{ grid: { stroke: "#EEF2F7" }, tickLabels: { fontSize: 10, fill: "#6B7280" } }}
                        />
                        <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: "#6B7280" } }} />
                        <VictoryArea data={fallbackCash7d} style={{ data: { fill: "#cfe3ff", fillOpacity: 0.35 } }} />
                        <VictoryLine data={fallbackCash7d} style={{ data: { stroke: "#246BFD", strokeWidth: 3 } }} />
                      </VictoryChart>
                    )}
                  </CompactChart>

                  <View style={{ marginTop: 12, gap: 8 }}>
                    {receivedTransactions.slice(0, 3).map((tx, i) => (
                      <View key={`tx-${i}`} style={s.transactionItem}>
                        <Text style={s.transactionAmount}>{formatMoney(tx.amount, currency)}</Text>
                        <Text style={s.transactionDesc}>{tx.description || "Financial Institution"}</Text>
                        <Text style={s.transactionCategory}>{tx.category || "Income"}</Text>
                      </View>
                    ))}
                  </View>
            </Card>
          </Animated.View>
{/* Cash Flow Forecast (30/90 days)  */}
<Animated.View entering={FadeInUp.delay(320).duration(420)}>
  <Card>
    <View style={s.sectionHeader}>
      <Text style={s.h1}>Cash Flow Forecast</Text>
      
      <View style={s.periodSelector} accessibilityRole="radiogroup" accessibilityLabel="Forecast period selector">
        <Pressable
          onPress={() => setForecastPeriod("30")}
          style={[
            s.periodButton,
            forecastPeriod === "30" && s.periodButtonActive,
          ]}
          accessibilityRole="radio"
          accessibilityState={{ checked: forecastPeriod === "30" }}
          accessibilityLabel="30 day forecast"
        >
          <Text
            style={[
              s.periodButtonText,
              forecastPeriod === "30" && s.periodButtonTextActive,
            ]}
          >
            30 Days
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setForecastPeriod("90")}
          style={[
            s.periodButton,
            forecastPeriod === "90" && s.periodButtonActive,
          ]}
          accessibilityRole="radio"
          accessibilityState={{ checked: forecastPeriod === "90" }}
          accessibilityLabel="90 day forecast"
        >
          <Text
            style={[
              s.periodButtonText,
              forecastPeriod === "90" && s.periodButtonTextActive,
            ]}
          >
            90 Days
          </Text>
        </Pressable>
      </View>
    </View>

    <View style={s.forecastSummary}>
      <View style={s.forecastKPI}>
        <Text style={s.forecastLabel}>Projected Balance</Text>
        <Text style={s.forecastValue}>
          {forecastPeriod === "30" ? "$2,100" : "$2,900"}
        </Text>
        <Text style={s.forecastDelta}>
          {forecastPeriod === "30" ? "+31%" : "+81%"}
        </Text>
      </View>
      <View style={s.forecastKPI}>
        <Text style={s.forecastLabel}>Recurring Income</Text>
        <Text style={s.forecastValue}>$3,850</Text>
        <Text style={s.forecastSubtext}>Monthly</Text>
      </View>
      <View style={s.forecastKPI}>
        <Text style={s.forecastLabel}>Fixed Expenses</Text>
        <Text style={s.forecastValue}>$1,720</Text>
        <Text style={s.forecastSubtext}>Monthly</Text>
      </View>
    </View>

    {/* Chart with Income & Expense Events */}
    <View style={s.chartContainer}>
      <VictoryChart
        width={forecastChartWidth}
        height={250}
        padding={{ left: 60, right: 40, top: 30, bottom: 40 }}
        domain={{ 
          x: [0, forecastPeriod === "30" ? 30 : 90],
          y: [0, forecastPeriod === "30" ? 4000 : 3200]
        }}
      >
        {/* Confidence Band */}
        <VictoryArea
          data={forecastPeriod === "30" ? confidence30d : confidence90d}
          x="day"
          style={{
            data: { 
              fill: "#E5EDFF", 
              fillOpacity: 0.4,
              stroke: "transparent"
            }
          }}
        />
        
        {/* Grid and Axes */}
        <VictoryAxis
          dependentAxis
          tickFormat={(t:any) => `$${t/1000}k`}
          style={{
            grid: { stroke: "#EEF2F7", strokeWidth: 1 },
            tickLabels: { fontSize: 10, fill: "#6B7280", fontWeight: "600" },
            axis: { stroke: "transparent" }
          }}
        />
        <VictoryAxis
          tickFormat={(t:any) => `${t}d`}
          style={{
            tickLabels: { fontSize: 10, fill: "#6B7280", fontWeight: "600" },
            axis: { stroke: "#E5E7EB", strokeWidth: 1 },
          }}
        />

        {/* Projected Balance Line (fix dataset + map x) */}
        <VictoryLine
          data={forecastPeriod === "30" ? forecast30d : forecast90d}
          x="day"
          y="y"
          style={{
            data: { 
              stroke: "#246BFD", 
              strokeWidth: 3,
              strokeLinecap: "round"
            }
          }}
        />

        {/* Balance Data Points (map x/y) */}
        <VictoryScatter
          data={forecastPeriod === "30" ? forecast30d : forecast90d}
          x="day"
          y="y"
          size={4}
          style={{
            data: { 
              fill: "#FFFFFF",
              stroke: "#246BFD",
              strokeWidth: 2
            }
          }}
        />

        {/* Income Events - Green upward arrows (map x/y) */}
        <VictoryScatter
          data={
            forecastPeriod === "30" ? 
            [
              { day: 0, amount: 3850, label: "Salary" },
              { day: 7, amount: 450, label: "Freelance" },
              { day: 14, amount: 3850, label: "Salary" },
              { day: 21, amount: 200, label: "Bonus" },
              { day: 28, amount: 3850, label: "Salary" }
            ] :
            [
              { day: 0, amount: 3850, label: "Salary" },
              { day: 14, amount: 450, label: "Freelance" },
              { day: 28, amount: 3850, label: "Salary" },
              { day: 42, amount: 200, label: "Bonus" },
              { day: 56, amount: 3850, label: "Salary" },
              { day: 70, amount: 450, label: "Freelance" },
              { day: 84, amount: 3850, label: "Salary" }
            ]
          }
          x="day"
          y="amount"
          size={5}
          symbol="triangleUp"
          style={{ data: { fill: "#10B981", stroke: "#10B981", strokeWidth: 1 } }}
          labels={({ datum }: { datum: { amount: number } }) => `+$${datum.amount}`}
          labelComponent={<VictoryLabel dy={-10} style={{ fontSize: 8, fill: "#10B981", fontWeight: "700" }} />}
        />

        {/* Expense Events - Red downward arrows (map x/y) */}
        <VictoryScatter
          data={
            forecastPeriod === "30" ? 
            [
              { day: 2, amount: 1200, label: "Rent" },
              { day: 5, amount: 320, label: "Utilities" },
              { day: 9, amount: 200, label: "Subscription" },
              { day: 16, amount: 150, label: "Insurance" },
              { day: 23, amount: 280, label: "Loan" },
              { day: 27, amount: 180, label: "Membership" }
            ] :
            [
              { day: 2, amount: 1200, label: "Rent" },
              { day: 16, amount: 320, label: "Utilities" },
              { day: 23, amount: 200, label: "Subscription" },
              { day: 30, amount: 150, label: "Insurance" },
              { day: 37, amount: 1200, label: "Rent" },
              { day: 44, amount: 280, label: "Loan" },
              { day: 51, amount: 180, label: "Membership" },
              { day: 58, amount: 1200, label: "Rent" },
              { day: 65, amount: 320, label: "Utilities" },
              { day: 72, amount: 200, label: "Subscription" },
              { day: 79, amount: 150, label: "Insurance" },
              { day: 86, amount: 280, label: "Loan" }
            ]
          }
          x="day"
          y="amount"
          size={5}
          symbol="triangleDown"
          style={{ data: { fill: "#EF4444", stroke: "#EF4444", strokeWidth: 1 } }}
          labels={({ datum }: { datum: { amount: number } }) => `-$${datum.amount}`}
          labelComponent={<VictoryLabel dy={10} style={{ fontSize: 8, fill: "#EF4444", fontWeight: "700" }} />}
        />
      </VictoryChart>
    </View>

    {/* Enhanced Legend */}
    <View style={s.enhancedLegend}>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: "#246BFD" }]} />
        <Text style={s.legendText}>Projected Balance</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: "#10B981" }]} />
        <Text style={s.legendText}>Income Events</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: "#EF4444" }]} />
        <Text style={s.legendText}>Expense Events</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: "#E5EDFF", borderWidth: 1, borderColor: "#CBD5E1" }]} />
        <Text style={s.legendText}>Confidence Range</Text>
      </View>
    </View>

    {/* Event Examples */}
    <View style={s.eventsExamples}>
      <Text style={s.eventsTitle}>Recent Transactions</Text>
      <View style={s.eventList}>
        <View style={s.eventItem}>
          <View style={[s.eventIcon, { backgroundColor: "#10B981" }]}>
            <Text style={s.eventIconText}>↑</Text>
          </View>
          <View style={s.eventDetails}>
            <Text style={s.eventDescription}>Salary Deposit</Text>
            <Text style={s.eventDate}>2 days ago</Text>
          </View>
          <Text style={[s.eventAmount, { color: "#10B981" }]}>+$3,850</Text>
        </View>
        <View style={s.eventItem}>
          <View style={[s.eventIcon, { backgroundColor: "#EF4444" }]}>
            <Text style={s.eventIconText}>↓</Text>
          </View>
          <View style={s.eventDetails}>
            <Text style={s.eventDescription}>Rent Payment</Text>
            <Text style={s.eventDate}>5 days ago</Text>
          </View>
          <Text style={[s.eventAmount, { color: "#EF4444" }]}>-$1,200</Text>
        </View>
        <View style={s.eventItem}>
          <View style={[s.eventIcon, { backgroundColor: "#10B981" }]}>
            <Text style={s.eventIconText}>↑</Text>
          </View>
          <View style={s.eventDetails}>
            <Text style={s.eventDescription}>Freelance Payment</Text>
            <Text style={s.eventDate}>1 week ago</Text>
          </View>
          <Text style={[s.eventAmount, { color: "#10B981" }]}>+$450</Text>
        </View>
      </View>
    </View>

    {/* Key Insights */}
    <View style={s.insightsContainer}>
      <Text style={s.insightsTitle}>Key Insights</Text>
      <View style={s.insightItem}>
        <View style={[s.insightDot, { backgroundColor: "#10B981" }]} />
        <Text style={s.insightText}>
          Net positive cash flow of ${forecastPeriod === "30" ? "650" : "700"} per period
        </Text>
      </View>
      <View style={s.insightItem}>
        <View style={[s.insightDot, { backgroundColor: "#246BFD" }]} />
        <Text style={s.insightText}>
          {forecastPeriod === "30" ? "34%" : "38%"} savings rate from recurring income
        </Text>
      </View>
      <View style={s.insightItem}>
        <View style={[s.insightDot, { backgroundColor: "#E5EDFF" }]} />
        <Text style={s.insightText}>
          Projection confidence: {forecastPeriod === "30" ? "85%" : "78%"}
        </Text>
      </View>
    </View>
  </Card>
</Animated.View>
        </>
      )}
    </ScrollView>
  );
}

// ---------- styles ----------
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },

  piesRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  pieChartTitle: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 6 },

  // legend + KV
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  kvKey: { fontSize: 13, color: "#374151", fontWeight: "600" },
  kvVal: { fontSize: 13, fontWeight: "700", color: "#111827" },
  percentageText: { fontSize: 12, color: "#6B7280" },
  legendText: { fontSize: 13, color: "#374151", fontWeight: "600" },

  // Period selector
  periodSelector: { flexDirection: "row", gap: 8 },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  periodButtonActive: {
    backgroundColor: "#246BFD",
    borderColor: "#246BFD",
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  projectionText: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 12 },
  forecastChart: { marginTop: 8, height: 240 },

  // top row inside trends card
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },

  // dropdown button (menu handled by Modal)
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // Forecast / enhanced styles
  forecastSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  forecastKPI: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  forecastLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  forecastDelta: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700",
  },
  forecastSubtext: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  enhancedForecastChart: {
    marginTop: 8,
    height: 280,
  },

  enhancedLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },

  insightsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#246BFD",
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },

  // chart container used by forecast section
  chartContainer: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginVertical: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  // Add these to your stylesheet
eventsExamples: {
  marginTop: 20,
  padding: 16,
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
eventsTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 12,
},
eventList: {
  gap: 12,
},
eventItem: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#F1F5F9',
},
eventIcon: {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
eventIconText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 'bold',
},
eventDetails: {
  flex: 1,
},
eventDescription: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 2,
},
eventDate: {
  fontSize: 12,
  color: '#6B7280',
},
eventAmount: {
  fontSize: 14,
  fontWeight: '700',
},

  dropdownButtonText: { fontSize: 14, fontWeight: "600", color: "#374151", flex: 1 },

  // chart wrapper
  trendsChartWrap: { height: 300, alignItems: "center", marginTop: 16 },

  // trends legend
  chartLegend: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  legendRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },

  // month breakdown
  monthlyBreakdown: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthlyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  monthTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  monthTotal: { fontSize: 14, fontWeight: "600", color: "#059669" },

  statItemEnhanced: { gap: 8, marginTop: 6 },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 13, color: "#374151", fontWeight: "600" },
  statAmount: { fontSize: 14, fontWeight: "700", color: "#111827" },
  progressBar: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  statPercent: { fontSize: 12, color: "#6B7280", textAlign: "right" },

  // transactions
  transactionItem: { backgroundColor: "#F3F4F6", padding: 8, borderRadius: 8 },
  transactionAmount: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  transactionDesc: { fontSize: 12, color: "#374151", marginBottom: 2 },
  transactionCategory: { fontSize: 11, color: "#6B7280" },

  // budget controls
  budgetControls: {
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  budgetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  budgetLabel: { fontSize: 12, color: "#374151", fontWeight: "600" },
  budgetInput: {
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    fontSize: 12,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    textAlign: "right",
  },
  carryoverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  carryoverLabel: { fontSize: 12, color: "#374151", fontWeight: "600" },

  budgetHint: { fontSize: 10, color: "#6B7280" },

  alertsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  alertPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  alertPillWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  alertPillDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  alertPillText: { fontSize: 12, fontWeight: "700", color: "#374151" },

  alertWarning: { fontSize: 12, color: "#D97706", fontWeight: "700" },
  alertDanger: { fontSize: 12, color: "#B91C1C", fontWeight: "700" },

  viewOnlyNote: {
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewOnlyText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  currentMonthNote: {
    marginTop: 2,
    marginBottom: 6,
  },
  currentMonthText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
});