import React from "react";
import { View, Text } from "react-native";
import { VictoryPie } from "@/lib/charts";

type Slice = { x: string; y: number };

export default function ExposureWheel(
  { data }: { data: { sector: string; amount: number }[] }
) {
  const slices: Slice[] = data
    .reduce<Slice[]>((acc, r) => {
      const i = acc.findIndex(a => a.x === r.sector);
      if (i >= 0) acc[i].y += r.amount;
      else acc.push({ x: r.sector, y: r.amount });
      return acc;
    }, [])
    .sort((a, b) => b.y - a.y);

  const total = slices.reduce((s, v) => s + v.y, 0);

  return (
    <View>
      <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>
        Personal Exposure (last 90 days)
      </Text>
      <VictoryPie
        data={slices.length ? slices : [{ x: "No data", y: 1 }]}
        labels={({ datum }: { datum: Slice }) =>
          total ? `${datum.x}\n${Math.round((datum.y / total) * 100)}%` : ""
        }
        innerRadius={60}
        padding={{ top: 18, bottom: 18, left: 18, right: 18 }}
        height={220}
      />
    </View>
  );
}
