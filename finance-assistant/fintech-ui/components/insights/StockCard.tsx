import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryAxis, VictoryLine, VictoryContainer } from "@/lib/charts";
import { StockCardData } from "./types";

type Props = {
  data: StockCardData | undefined;
  symbol: string;
  color: { bg: string; accent: string };
  onPressHeadline?: () => void;
};

function StockCard({ data, symbol, color, onPressHeadline }: Props) {
  return (
    <View style={[s.stockCard, { backgroundColor: color.bg }]}>
      {/* Header */}
      <View style={s.stockCardHeader}>
        <Text style={s.stockCardTitle}>{symbol}</Text>
        <Text style={s.stockCardSubtitle}>
          {data ? `${data.changePct >= 0 ? "+" : ""}${data.changePct.toFixed(2)}%` : "…"}
        </Text>
      </View>

      {/* Price */}
      <Text style={s.stockCardPrice}>
        {data ? `$${data.price.toFixed(2)}` : "—"}
      </Text>

      {/* Sparkline */}
      <View style={s.miniChartContainer}>
        <CompactChart height={200}>
          {(w, h) => (
            <VictoryChart
              width={w || 300}
              height={h || 200}
              padding={{ left: 40, right: 10, top: 12, bottom: 26 }}
              containerComponent={<VictoryContainer responsive={false} />}
            >
              <VictoryAxis
                dependentAxis
                tickFormat={() => ""}
                style={{ grid: { stroke: "#EEE" }, tickLabels: { fill: "transparent" }, axis: { stroke: "#EEE" } }}
              />
              <VictoryAxis
                tickFormat={() => ""}
                style={{ tickLabels: { fill: "transparent" }, axis: { stroke: "#EEE" } }}
              />
              <VictoryLine
                data={(data?.series ?? []).slice(-60)}
                x="x"
                y="y"
                style={{ data: { stroke: "#FFFFFF", strokeWidth: 2 } }}
              />
            </VictoryChart>
          )}
        </CompactChart>
      </View>

      {/* Alpha Lens */}
      <View style={s.alphaBox}>
        <Text style={s.alphaTitle}>Alpha Lens</Text>
        {data?.stats ? (
          <View style={s.alphaGrid}>
            <View style={s.alphaCell}>
              <Text style={s.alphaKey}>Trend</Text>
              <Text style={s.alphaVal}>{data.stats.trendScore}/5</Text>
            </View>
            <View style={s.alphaCell}>
              <Text style={s.alphaKey}>Vol %</Text>
              <Text style={s.alphaVal}>{data.stats.volPercentile}</Text>
            </View>
            <View style={s.alphaCell}>
              <Text style={s.alphaKey}>Breakout</Text>
              <Text style={s.alphaVal}>{data.stats.breakout}</Text>
            </View>
            <View style={s.alphaCell}>
              <Text style={s.alphaKey}>Beta</Text>
              <Text style={s.alphaVal}>{data.stats.beta}</Text>
            </View>
            <View style={s.alphaCell}>
              <Text style={s.alphaKey}>Idio Today</Text>
              <Text style={s.alphaVal}>
                {data.stats.idioTodayPct >= 0 ? "+" : ""}
                {data.stats.idioTodayPct}%
              </Text>
            </View>
          </View>
        ) : (
          <Text style={s.alphaLoading}>Loading…</Text>
        )}
      </View>

      {/* View More */}
      <Pressable
        style={s.viewMoreButton}
        onPress={onPressHeadline}
        accessibilityRole="button"
        accessibilityLabel="View top headline"
      >
        <Text style={s.viewMoreText}>Top Headline</Text>
      </Pressable>
    </View>
  );
}

export default React.memo(StockCard);

const s = StyleSheet.create({
  stockCard: { flex: 1, minWidth: 110, maxWidth: "31%", borderRadius: 16, padding: 12, minHeight: 260 },
  stockCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  stockCardTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  stockCardSubtitle: { color: "#FFFFFF", fontWeight: "600", fontSize: 12 },
  stockCardPrice: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 8 },
  miniChartContainer: { height: 60, marginBottom: 10 },

  alphaBox: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 8, marginBottom: 8 },
  alphaTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 12, marginBottom: 6 },
  alphaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alphaCell: { backgroundColor: "rgba(0,0,0,0.15)", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  alphaKey: { color: "#E5E7EB", fontSize: 10, fontWeight: "700" },
  alphaVal: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  alphaLoading: { color: "#FFFFFF", fontSize: 12 },

  viewMoreButton: { alignItems: "center", paddingVertical: 6 },
  viewMoreText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12, textDecorationLine: "underline" },
});
