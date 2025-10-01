import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";

export default function ScanFab() {
  const router = useRouter();
  return (
    <View pointerEvents="box-none" style={s.overlay}>
      <Animated.View entering={FadeInUp.duration(220)} style={s.wrap}>
        <Pressable
          onPress={() => router.push("/transactions")}
          hitSlop={12}
          style={s.hit}
        >
          <LinearGradient
            colors={["#3bb2f6", "#5b76f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.btn}
          >
            <Ionicons name="scan-outline" size={24} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20 },
  wrap: { alignSelf: "center", bottom: 44 }, // higher: 44 above bottom
  hit: { borderRadius: 30, overflow: "hidden", elevation: 10 },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#246BFD",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});
