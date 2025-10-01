import React from "react";
import { View } from "react-native";

export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View
      style={{
        height: 8,
        backgroundColor: "#EEF2F7",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <View style={{ width: `${v}%`, height: 8, backgroundColor: "#246BFD" }} />
    </View>
  );
}
