import "react-native-reanimated";
import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import CompactDock from "@/components/CompactDock";
import ScanFab from "@/components/ScanFab";

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();

  // auth guard
  useEffect(() => {
    if (!user) router.replace("/auth");
  }, [user]);

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CompactDock {...props} />} // ⬅️ custom dock
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="insights" options={{ title: "Insights" }} />
        <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
        <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
        <Tabs.Screen name="investments" options={{ title: "Investments" }} />
      </Tabs>

      {/* floating action button over the dock */}
      <ScanFab />
    </>
  );
}
