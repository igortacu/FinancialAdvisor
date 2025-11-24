import "react-native-reanimated";
import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import CompactDock from "@/components/CompactDock";
import ScanFab from "@/components/ScanFab";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no user after loading, return null (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
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
    </View>
  );
}
