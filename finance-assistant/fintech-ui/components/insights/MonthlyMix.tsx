import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryAxis, VictoryLine, VictoryContainer } from "@/lib/charts";
import Card from "@/components/Card";
import { StockCardData } from "./types";

type Props = {
  stocks: StockCardData[];
};

function PortfolioGrowth({ stocks }: Props) {
  // Filter out stocks with no series data
  const validStocks = React.useMemo(() => stocks.filter(s => s.series && s.series.length > 0), [stocks]);

  // Normalize data to percentage change
  const normalizedData = React.useMemo(() => {
    return validStocks.map(stock => {
      const startPrice = stock.series[0].y;
      return {
        symbol: stock.symbol,
        data: stock.series.map(p => ({
          x: p.x,
          y: ((p.y - startPrice) / startPrice) * 100
        }))
      };
    });
  }, [validStocks]);

  const colors = ["#FFB020", "#A855F7", "#1F2937"]; // Matches the cards

  if (validStocks.length === 0) {
    return (
      <Card>
        <Text style={s.h1}>Portfolio Growth</Text>
        <Text style={s.noData}>No market data available to display growth.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={s.header}>
        <Text style={s.h1}>Portfolio Growth</Text>
        <Text style={s.subtitle}>Performance over last period</Text>
      </View>

      <CompactChart height={240}>
        {(w, h) => (
          <VictoryChart
            width={w || 340}
            height={h || 240}
            padding={{ left: 40, right: 20, top: 20, bottom: 40 }}
            containerComponent={<VictoryContainer responsive={false} />}
          >
            <VictoryAxis
              style={{
                tickLabels: { fill: "#6B7280", fontSize: 10, fontWeight: "600" },
                axis: { stroke: "#E5E7EB" }
              }}
              tickFormat={(t: number | Date) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              tickCount={4}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t: number) => `${t > 0 ? '+' : ''}${Math.round(t)}%`}
              style={{
                tickLabels: { fill: "#9CA3AF", fontSize: 10 },
                grid: { stroke: "#F3F4F6" },
                axis: { stroke: "transparent" }
              }}
            />
            {normalizedData.map((stock, i) => (
              <VictoryLine
                key={stock.symbol}
                data={stock.data}
                x="x"
                y="y"
                style={{ data: { stroke: colors[i % colors.length], strokeWidth: 2 } }}
              />
            ))}
          </VictoryChart>
        )}
      </CompactChart>

      {/* Legend */}
      <View style={s.legendContainer}>
        {validStocks.map((stock, i) => (
          <View key={stock.symbol} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={s.legendText}>{stock.symbol}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default React.memo(PortfolioGrowth);

const s = StyleSheet.create({
  header: { marginBottom: 16 },
  h1: { fontSize: 16, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", fontWeight: "500", marginTop: 2 },
  noData: { color: "#6B7280", fontSize: 14, marginTop: 8 },
  
  legendContainer: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
});
