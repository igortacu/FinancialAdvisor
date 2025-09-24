// components/Card.tsx
import React, { PropsWithChildren } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import TouchableScale from "./TouchableScale";
import { cardShadow } from "@/utils/shadow";

export default function Card({
  children,
  style,
  onPress,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  if (onPress) {
    return (
      <TouchableScale style={[styles.card, style]} onPress={onPress}>
        {children}
      </TouchableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    ...cardShadow,
  },
});
