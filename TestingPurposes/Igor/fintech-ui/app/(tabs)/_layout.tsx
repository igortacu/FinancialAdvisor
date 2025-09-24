// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import CompactDock from "@/components/CompactDock";
import ScanFab from "@/components/ScanFab";

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(p) => <CompactDock {...p} />}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="insights" options={{ title: "Insights" }} />
        <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
        <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
        <Tabs.Screen name="investments" options={{ title: "Investments" }} />
      </Tabs>

      {/* Floating button above the dock */}
      <ScanFab />
    </>
  );
}
