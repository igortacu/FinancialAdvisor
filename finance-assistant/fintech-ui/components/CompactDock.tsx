import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICONS: Record<string, any> = {
  index: "home",
  insights: "pie-chart",
  transactions: "list",
  analytics: "stats-chart",
  investments: "briefcase",
};

export default function CompactDock({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const centerIndex = 2; // reserve slot for FAB

  return (
    <View style={[s.wrap, { paddingBottom: insets.bottom || 10 }]}>
      <View style={s.bar}>
        {state.routes.map((route, i) => {
          if (i === centerIndex) {
            // Spacer under FAB
            return <View key={route.key} style={{ width: 72 }} />;
          }
          const isFocused = state.index === i;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented)
              navigation.navigate(route.name);
          };
          const color = isFocused ? "#246BFD" : "#9AA3AF";
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [s.tab, pressed && { opacity: 0.6 }]}
              hitSlop={10}
            >
              <Ionicons
                name={ICONS[route.name] || "ellipse"}
                size={22}
                color={color}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: "box-none",
  },
  bar: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    // soft shadow
    shadowColor: "#001A4D",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    pointerEvents: "auto",
  },
  tab: { width: 28, alignItems: "center" },
});
