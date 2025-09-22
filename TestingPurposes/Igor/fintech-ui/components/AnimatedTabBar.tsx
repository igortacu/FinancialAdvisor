import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  accounts: "card",
  insights: "pie-chart",
  transactions: "list",
  budgets: "wallet",
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const centerIndex = Math.floor(state.routes.length / 2);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.barShadow} />
      <View style={styles.barContainer}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={35}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(255,255,255,0.95)" },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented)
              navigation.navigate(route.name);
          };

          // Raised center button
          if (index === centerIndex) {
            const scale = useSharedValue(isFocused ? 1.05 : 1);
            const style = useAnimatedStyle(
              () => ({ transform: [{ scale: scale.value }] }),
              [],
            );
            scale.value = withSpring(isFocused ? 1.05 : 1, { damping: 14 });

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.centerSlot}
                hitSlop={10}
              >
                <Animated.View style={[styles.centerBtn, style]}>
                  <LinearGradient
                    colors={["#3bb2f6", "#5b76f7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons
                    name={ICONS[route.name] ?? "ellipse"}
                    size={22}
                    color="#fff"
                  />
                </Animated.View>
              </Pressable>
            );
          }

          // Regular items
          const scale = useSharedValue(isFocused ? 1.0 : 0.95);
          const style = useAnimatedStyle(
            () => ({ transform: [{ scale: scale.value }] }),
            [],
          );
          scale.value = withSpring(isFocused ? 1.0 : 0.95, { damping: 18 });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              hitSlop={10}
            >
              <Animated.View style={style}>
                <Ionicons
                  name={ICONS[route.name] ?? "ellipse-outline"}
                  size={22}
                  color={isFocused ? "#246BFD" : "#9DA3AF"}
                />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const HEIGHT = 64;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HEIGHT + 14,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barShadow: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: HEIGHT - 6,
    height: 20,
    shadowColor: "#001a4d",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  barContainer: {
    height: HEIGHT,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerSlot: { width: 88, alignItems: "center", justifyContent: "flex-start" },
  centerBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18, // raise the middle button
    shadowColor: "#246BFD",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
