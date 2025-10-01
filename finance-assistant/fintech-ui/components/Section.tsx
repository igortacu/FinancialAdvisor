import React, { PropsWithChildren } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Section({
  title,
  right,
  children,
  style,
}: PropsWithChildren<{ title: string; right?: React.ReactNode; style?: any }>) {
  return (
    <View style={[{ marginTop: 18 }, style]}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {right}
      </View>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  title: { fontSize: 14, fontWeight: "700", color: "#111827" },
});
