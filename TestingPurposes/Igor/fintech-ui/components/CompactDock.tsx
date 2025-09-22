import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Platform, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  insights: "pie-chart",
  transactions: "list",
  analytics: "stats-chart",
  investments: "briefcase",
};

const BAR_H = 58;
const CENTER = 60;
const SLOT = 64;

// Small item with spring handled in useEffect (no writes in render)
function DockItem({
  icon,
  focused,
  onPress,
  width = SLOT,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
  width?: number;
}) {
  const scale = useSharedValue(0.95);
  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.95, {
      damping: 16,
      stiffness: 220,
    });
  }, [focused]);
  const a = useAnimatedStyle(
    () => ({ transform: [{ scale: scale.value }] }),
    [],
  );
  return (
    <Pressable onPress={onPress} style={[s.slot, { width }]} hitSlop={10}>
      <Animated.View style={a}>
        <Ionicons
          name={icon}
          size={22}
          color={focused ? "#246BFD" : "#9DA3AF"}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function CompactDock({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const centerIdx = Math.floor(state.routes.length / 2);
  const [hint, setHint] = useState<string | null>(null);

  const onPressTab = (routeKey: string, name: string, focused: boolean) => {
    const e = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !e.defaultPrevented) navigation.navigate(name);
    setHint(focused ? null : name);
    setTimeout(() => setHint(null), 800);
  };

  // Center button scale handled in effect too
  const centerScale = useSharedValue(1);
  const centerAnim = useAnimatedStyle(
    () => ({ transform: [{ scale: centerScale.value }] }),
    [],
  );

  useEffect(() => {
    const focused = state.index === centerIdx;
    centerScale.value = withSpring(focused ? 1.06 : 1, { damping: 14 });
  }, [state.index]);

  const left = state.routes.slice(0, centerIdx);
  const right = state.routes.slice(centerIdx + 1);
  const center = state.routes[centerIdx];

  return (
    <View style={[s.wrap, { pointerEvents: "box-none" as any }]}>
      <View style={s.dock}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={28}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(255,255,255,0.96)" },
            ]}
          />
        )}

        {/* Left group */}
        <View style={s.sideGroup}>
          {left.map((route) => {
            const focused = state.routes[state.index].key === route.key;
            const icon = ICON[route.name] ?? "ellipse";
            return (
              <DockItem
                key={route.key}
                icon={icon}
                focused={focused}
                onPress={() => onPressTab(route.key, route.name, focused)}
              />
            );
          })}
        </View>

        {/* Center */}
        {(() => {
          const focused = state.routes[state.index].key === center.key;
          const icon = ICON[center.name] ?? "ellipse";
          return (
            <Pressable
              onPress={() => onPressTab(center.key, center.name, focused)}
              style={s.centerSlot}
              hitSlop={10}
            >
              <Animated.View style={[s.centerBtn, centerAnim]}>
                <LinearGradient
                  colors={["#3bb2f6", "#5b76f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name={icon} size={22} color="#fff" />
              </Animated.View>
              {hint === center.name && (
                <Animated.Text
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={s.centerHint}
                >
                  {descriptors[center.key]?.options?.title ?? center.name}
                </Animated.Text>
              )}
            </Pressable>
          );
        })()}

        {/* Right group */}
        <View style={s.sideGroup}>
          {right.map((route) => {
            const focused = state.routes[state.index].key === route.key;
            const icon = ICON[route.name] ?? "ellipse";
            return (
              <DockItem
                key={route.key}
                icon={icon}
                focused={focused}
                onPress={() => onPressTab(route.key, route.name, focused)}
              />
            );
          })}
        </View>
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
    alignItems: "center",
    paddingBottom: 8,
  },
  dock: {
    height: BAR_H,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 6,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 8px 16px rgba(0,26,77,0.08)" as any }
      : {
          shadowColor: "#001a4d",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }),
  },
  sideGroup: { flexDirection: "row", gap: 6 },
  slot: { height: BAR_H, alignItems: "center", justifyContent: "center" },
  centerSlot: {
    width: CENTER + 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  centerBtn: {
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 10px 18px rgba(36,107,253,0.35)" as any }
      : {
          shadowColor: "#246BFD",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }),
  },
  centerHint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
});
