import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryAxis, VictoryBar, VictoryContainer, VictoryStack } from "@/lib/charts";
import Card from "@/components/Card";

type MonthlyData = {
  month: string;
  needs: number;
  wants: number;
  savings: number;
};

type Props = {
  data: MonthlyData[];
};

type FilterOption = "3 Months" | "6 Months" | "All Year";

function MonthlyMix({ data }: Props) {
  const [filter, setFilter] = React.useState<FilterOption>("All Year");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const handleFilterSelect = (option: FilterOption) => {
    setFilter(option);
    setDropdownOpen(false);
  };

  const filteredData = React.useMemo(() => {
    if (filter === "3 Months") return data.slice(-3);
    if (filter === "6 Months") return data.slice(-6);
    return data;
  }, [data, filter]);

  const totalSavings = React.useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.savings, 0);
  }, [filteredData]);

  const avgSavingsRate = React.useMemo(() => {
    const totalIncome = filteredData.reduce((acc, curr) => acc + curr.needs + curr.wants + curr.savings, 0);
    if (totalIncome === 0) return 0;
    return Math.round((totalSavings / totalIncome) * 100);
  }, [filteredData, totalSavings]);

  return (
    <Card>
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.h1}>Monthly Mix</Text>
          <Text style={s.subtitle}>
            Avg Savings Rate: <Text style={{ color: "#10B981" }}>{avgSavingsRate}%</Text>
          </Text>
        </View>
        
        <View style={s.dropdownContainer}>
          <Pressable onPress={toggleDropdown} style={s.dropdownButton}>
            <Text style={s.dropdownButtonText}>{filter}</Text>
            <Text style={s.dropdownArrow}>▾</Text>
          </Pressable>
          {dropdownOpen && (
            <View style={s.dropdownList}>
              {(["3 Months", "6 Months", "All Year"] as FilterOption[]).map((opt) => (
                <Pressable key={opt} onPress={() => handleFilterSelect(opt)} style={s.dropdownItem}>
                  <Text style={[
                    s.dropdownItemText,
                    filter === opt && s.dropdownItemTextActive
                  ]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <CompactChart height={240}>
        {(w, h) => (
          <VictoryChart
            width={w || 340}
            height={h || 240}
            padding={{ left: 45, right: 10, top: 20, bottom: 40 }}
            containerComponent={<VictoryContainer responsive={false} />}
            domainPadding={{ x: 20 }}
          >
            <VictoryAxis 
              style={{ 
                tickLabels: { fill: "#6B7280", fontSize: 11, fontWeight: "600" },
                axis: { stroke: "#E5E7EB" }
              }}
            />
            <VictoryAxis 
              dependentAxis 
              tickFormat={(t: number) => `$${t / 1000}k`}
              style={{ 
                tickLabels: { fill: "#9CA3AF", fontSize: 10 },
                grid: { stroke: "#F3F4F6" },
                axis: { stroke: "transparent" }
              }}
            />
            <VictoryStack colorScale={["#10B981", "#FBBF24", "#EF4444"]}>
              <VictoryBar
                data={filteredData}
                x="month"
                y="savings"
                cornerRadius={{ top: 4, bottom: 4 }}
                barWidth={20}
              />
              <VictoryBar
                data={filteredData}
                x="month"
                y="wants"
                cornerRadius={{ top: 4, bottom: 4 }}
                barWidth={20}
              />
              <VictoryBar
                data={filteredData}
                x="month"
                y="needs"
                cornerRadius={{ top: 4, bottom: 4 }}
                barWidth={20}
              />
            </VictoryStack>
          </VictoryChart>
        )}
      </CompactChart>

      {/* Legend */}
      <View style={s.legendContainer}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={s.legendText}>Savings</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#FBBF24" }]} />
          <Text style={s.legendText}>Wants</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={s.legendText}>Needs</Text>
        </View>
      </View>
    </Card>
  );
}

export default React.memo(MonthlyMix);

const s = StyleSheet.create({
  h1: { fontSize: 16, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", fontWeight: "500", marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, zIndex: 10 },

  dropdownContainer: { position: "relative" },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownButtonText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  dropdownArrow: { fontSize: 10, color: "#6B7280", marginLeft: 6 },
  dropdownList: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginTop: 4,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  dropdownItemTextActive: { color: "#246BFD", fontWeight: "700" },

  legendContainer: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
});
