import React from "react";
import { View } from "react-native";

type Props = {
  height?: number;
  children: (w: number, h: number) => React.ReactNode;
};

export default function CompactChart({ height = 160, children }: Props) {
  const [w, setW] = React.useState(0);
  return (
    <View
      style={{ width: "100%", height }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {/* Render the actual chart once width is known */}
      {w > 0 ? children(w, height) : null}
    </View>
  );
}
