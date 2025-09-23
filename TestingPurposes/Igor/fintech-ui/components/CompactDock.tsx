import React, { useEffect, useMemo, useState } from "react";
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

const ORDER = [
  "index",
  "insights",
  "transactions",
  "analytics",
  "investments",
] as const;

const BAR_H = 52; // smaller
const CENTER = 56; // smaller
const SLOT = 56; // smaller
const RADIUS = 16;

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
          size={20}
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
  // Only the 5 we want, in fixed order
  const routes = useMemo(
    () =>
      ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
        (r): r is (typeof state.routes)[number] => !!r,
      ),
    [state.routes],
  );

  const centerIdx = 2; // transactions
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

  const centerScale = useSharedValue(1);
  const centerAnim = useAnimatedStyle(
    () => ({ transform: [{ scale: centerScale.value }] }),
    [],
  );
  useEffect(() => {
    const focused = state.routes[state.index]?.name === ORDER[centerIdx];
    centerScale.value = withSpring(focused ? 1.06 : 1, { damping: 14 });
  }, [state.index]);

  const left = routes.slice(0, centerIdx);
  const right = routes.slice(centerIdx + 1);
  const center = routes[centerIdx];

  return (
    <View style={[s.wrap, { pointerEvents: "box-none" as any }]}>
      <View style={s.dock}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={22}
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

        <View style={s.sideGroup}>
          {left.map((route) => {
            const focused = state.routes[state.index]?.key === route.key;
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

        {!!center && (
          <Pressable
            onPress={() => {
              const focused = state.routes[state.index]?.key === center.key;
              onPressTab(center.key, center.name, focused);
            }}
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
              <Ionicons name="list" size={20} color="#fff" />
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
        )}

        <View style={s.sideGroup}>
          {right.map((route) => {
            const focused = state.routes[state.index]?.key === route.key;
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
    paddingBottom: 6,
  },
  dock: {
    height: BAR_H,
    marginHorizontal: 12,
    borderRadius: RADIUS,
    overflow: "hidden",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 4,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 6px 14px rgba(0,26,77,0.08)" as any }
      : {
          shadowColor: "#001a4d",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        }),
  },
  sideGroup: { flexDirection: "row" },
  slot: { height: BAR_H, alignItems: "center", justifyContent: "center" },
  centerSlot: {
    width: CENTER + 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  centerBtn: {
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 10px 18px rgba(36,107,253,0.35)" as any }
      : {
          shadowColor: "#246BFD",
          shadowOpacity: 0.32,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }),
  },
  centerHint: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
});
