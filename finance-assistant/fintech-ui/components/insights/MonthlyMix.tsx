import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import CompactChart from "@/components/CompactChart";
import { VictoryChart, VictoryAxis, VictoryBar, VictoryContainer } from "@/lib/charts";
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

function MonthlyMix({ data }: Props) {
  const [selectedMonth, setSelectedMonth] = React.useState<string>("All");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setDropdownOpen(false);
  };

  return (
    <Card>
      <View style={s.sectionHeader}>
        <Text style={s.h1}>Monthly Mix (sample)</Text>
        <View style={s.dropdownContainer}>
          <Pressable onPress={toggleDropdown} style={s.dropdownButton}>
            <Text style={s.dropdownButtonText}>{selectedMonth}</Text>
            <Text style={s.dropdownArrow}>▾</Text>
          </Pressable>
          {dropdownOpen && (
            <View style={s.dropdownList}>
              {["All", ...data.map(m => m.month)].map((m) => (
                <Pressable key={m} onPress={() => handleMonthSelect(m)} style={s.dropdownItem}>
                  <Text style={[
                    s.dropdownItemText,
                    selectedMonth === m && s.dropdownItemTextActive
                  ]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <CompactChart height={220}>
        {(w, h) => (
          <VictoryChart
            width={w || 340}
            height={h || 220}
            padding={{ left: 40, right: 10, top: 12, bottom: 30 }}
            containerComponent={<VictoryContainer responsive={false} />}
          >
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryBar
              data={data}
              x="month"
              y="needs"
              style={{ data: { fill: "#EF4444" } }}
            />
          </VictoryChart>
        )}
      </CompactChart>
    </Card>
  );
}

export default React.memo(MonthlyMix);

const s = StyleSheet.create({
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 },

  dropdownContainer: { position: "relative", zIndex: 9999 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 130
  },
  dropdownButtonText: { fontSize: 14, fontWeight: "600", color: "#374151", flex: 1 },
  dropdownArrow: { fontSize: 12, color: "#6B7280", marginLeft: 8, fontWeight: "600" },
  dropdownList: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: 4,
    minWidth: 160
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  dropdownItemTextActive: { color: "#246BFD", fontWeight: "700" }
});
