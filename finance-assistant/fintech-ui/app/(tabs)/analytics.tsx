// app/(tabs)/Analytics.tsx
import React from "react";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  UIManager,
  findNodeHandle,
  Platform,
  Dimensions,
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
  ChartsReady,
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
      <Text style={{ color: "#6B7280", fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 4 }}>
        {value}
      </Text>
      {delta ? (
        <Text
          style={{
            color: delta.startsWith("+") ? "#16a34a" : "#ef4444",
            marginTop: 2,
          }}
        >
          {delta}
        </Text>
      ) : null}
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
}: {
  color: string;
  label: string;
  amount: number;
  total: number;
  currency: string;
}) {
  const pct = (amount / total) * 100;
  return (
    <View style={s.statItemEnhanced}>
      <View style={s.statHeader}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: color }]} />
          <Text style={s.statLabel}>{label}</Text>
        </View>
        <Text style={s.statAmount}>{formatMoney(amount, currency)}</Text>
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { backgroundColor: color, width: `${pct}%` }]} />
      </View>
      <Text style={s.statPercent}>{pct.toFixed(0)}% of total</Text>
    </View>
  );
}

// ---------- Modal-based MonthDropdown (always above charts) ----------
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
  buttonStyle: any;
  buttonTextStyle: any;
}) {
  // View on native; HTMLElement on web
  const btnRef = React.useRef<View | HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>(
    { top: 0, left: 0, width: 180 }
  );

  const openMenu = () => {
    const menuW = 180;

    if (Platform.OS === "web") {
      // Try to get the DOM node and read its rect
      const el =
        (btnRef.current as any) ??
        // some RNW components expose _node
        ((btnRef.current as any)?._node as HTMLElement | undefined);

      if (el && typeof (el as any).getBoundingClientRect === "function") {
        const r = (el as any).getBoundingClientRect();
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
    // Only call findNodeHandle on native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { UIManager, findNodeHandle } = require("react-native");
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
      <Pressable ref={btnRef as any} style={buttonStyle} onPress={openMenu}>
        <Text style={buttonTextStyle}>{value === "All" ? "All Months" : value}</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 8, fontWeight: "600" }}>
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

  const [loadingAgg] = React.useState(false);
  const [currency] = React.useState("USD");

  // sample totals for current pie
  const [spentNeeds] = React.useState(1550);
  const [spentWants] = React.useState(980);
  const [spentSavings] = React.useState(520);

  // month selector
  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");

  // cash flow
  const [cashSeries] = React.useState(fallbackCash7d);
  const [received7d] = React.useState(3810);
  const [receivedTransactions] = React.useState(received7dList);

  const filteredMonthlyData =
    selectedMonth === "All"
      ? fallbackMonthly
      : fallbackMonthly.filter((m) => m.month === selectedMonth);

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
                  labels={({ datum }: any) => `${datum.x}\n${datum.y}%`}
                  style={{ labels: { fontSize: 12, fill: "#111827" } }}
                />
              </View>
            </Card>
          </Animated.View>

          {/* 50/30/20 — Current vs Goal */}
          <Animated.View entering={FadeInUp.delay(140).duration(420)}>
            <Card>
              <Text style={s.h1}>50/30/20 — Current vs Goal</Text>
              {loadingAgg ? (
                <ActivityIndicator />
              ) : (
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
              )}

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

              {loadingAgg ? (
                <ActivityIndicator />
              ) : (
                <>
                  <View style={s.trendsChartWrap}>
                    {selectedMonth === "All" ? (
                      <VictoryChart
                        width={450}
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
                            data={fallbackMonthly}
                            x="month"
                            y="needs"
                            barWidth={14}
                            style={{ data: { fill: "#EF4444", fillOpacity: 0.9, stroke: "#DC2626", strokeWidth: 1 } }}
                          />
                          <VictoryBar
                            data={fallbackMonthly}
                            x="month"
                            y="wants"
                            barWidth={14}
                            style={{ data: { fill: "#F59E0B", fillOpacity: 0.9, stroke: "#D97706", strokeWidth: 1 } }}
                          />
                          <VictoryBar
                            data={fallbackMonthly}
                            x="month"
                            y="savings"
                            barWidth={14}
                            style={{ data: { fill: "#10B981", fillOpacity: 0.9, stroke: "#059669", strokeWidth: 1 } }}
                          />
                        </VictoryGroup>
                      </VictoryChart>
                    ) : (
                      <VictoryChart
                        width={350}
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
                          <VictoryBar
                            data={[{ month: selectedMonth, amount: filteredMonthlyData[0]?.needs || 0 }]}
                            x="month"
                            y="amount"
                            barWidth={30}
                            style={{ data: { fill: "#EF4444", fillOpacity: 0.9, stroke: "#DC2626", strokeWidth: 2 } }}
                          />
                          <VictoryBar
                            data={[{ month: selectedMonth, amount: filteredMonthlyData[0]?.wants || 0 }]}
                            x="month"
                            y="amount"
                            barWidth={30}
                            style={{ data: { fill: "#F59E0B", fillOpacity: 0.9, stroke: "#D97706", strokeWidth: 2 } }}
                          />
                          <VictoryBar
                            data={[{ month: selectedMonth, amount: filteredMonthlyData[0]?.savings || 0 }]}
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
                      const total = m.needs + m.wants + m.savings || 1;
                      return (
                        <View key={m.month} style={s.monthlyBreakdown}>
                          <View style={s.monthlyHeader}>
                            <Text style={s.monthTitle}>{m.month} Summary</Text>
                            <Text style={s.monthTotal}>Total: {formatMoney(total, currency)}</Text>
                          </View>

                          <BreakdownRow color="#EF4444" label="Needs" amount={m.needs} total={total} currency={currency} />
                          <BreakdownRow color="#F59E0B" label="Wants" amount={m.wants} total={total} currency={currency} />
                          <BreakdownRow color="#10B981" label="Savings" amount={m.savings} total={total} currency={currency} />
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </Card>
          </Animated.View>

          {/* Cash flow (7d) */}
          <Animated.View entering={FadeInUp.delay(280).duration(420)}>
            <Card>
              <Text style={s.h1}>Cash Flow (7 days)</Text>
              <Text style={{ fontWeight: "700", color: "#16a34a", marginBottom: 8 }}>
                Total Received: {formatMoney(received7d, currency)}
              </Text>

              {loadingAgg ? (
                <ActivityIndicator />
              ) : (
                <>
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
                </>
              )}
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
  dropdownButtonText: { fontSize: 14, fontWeight: "600", color: "#374151", flex: 1 },

  // chart wrapper
  trendsChartWrap: { height: 300, alignItems: "center", marginTop: 16 },

  // trends legend
  chartLegend: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  legendRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  legendText: { fontSize: 13, color: "#374151", fontWeight: "600" },

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
});
