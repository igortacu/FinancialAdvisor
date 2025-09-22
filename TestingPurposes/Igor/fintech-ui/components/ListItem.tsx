import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

export default function ListItem({
  left,
  title,
  subtitle,
  right,
  style,
}: {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {left}
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {right}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 13, fontWeight: "700", color: "#111827", maxWidth: 180 },
  sub: { fontSize: 11, color: "#6B7280", marginTop: 2, maxWidth: 200 },
});
