import React, { useEffect, Suspense } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Linking, Platform, View, Text, Pressable, ScrollView } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Lazy-load AuthProvider to avoid importing Supabase when env is missing
const AuthProviderLazy = React.lazy(async () => {
  const mod = await import("@/store/auth");
  return { default: mod.AuthProvider };
});

const REQUIRED_ENV = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_FINNHUB_KEY",
  "EXPO_PUBLIC_SUPABASE_FN_PROXY_URL",
];
function hasAllEnv() {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}
function SetupScreen() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, justifyContent: "center" }}>
      <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Project setup required</Text>
        <Text style={{ color: "#6B7280", marginBottom: 12 }}>
          Missing environment variables. Define them in your shell or a .env file, then reload the app.
        </Text>
        {missing.map((k) => (
          <View key={k} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: "#EEF2F7" }}>
            <Text style={{ fontFamily: "monospace" }}>{k}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 12, color: "#6B7280" }}>
          Tip (PowerShell): $env:NAME=&quot;value&quot;; npx expo start
        </Text>
        <Pressable
          onPress={() => location.reload()}
          style={({ pressed }) => [{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: pressed ? "#e5e7eb" : "#EEF4FF" }]}
        >
          <Text style={{ textAlign: "center", fontWeight: "800", color: "#246BFD" }}>Reload</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Handle deep links for OAuth on mobile only
  // Web OAuth is handled in AuthProvider
  useEffect(() => {
    if (Platform.OS === "web") {
      // Web OAuth is handled in AuthProvider - no need to duplicate here
      return;
    }
    
    // Handle deep links for OAuth on mobile
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log("🔗 Deep link received:", url);
      
      // Check if this is an OAuth callback
      if (url.includes("#access_token=") || url.includes("?access_token=")) {
        console.log("🔐 Processing OAuth callback");
        
        // Parse the URL to extract tokens
        const urlObj = new URL(url);
        const params = new URLSearchParams(
          url.includes("#") ? urlObj.hash.substring(1) : urlObj.search
        );
        
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        
        if (accessToken && refreshToken) {
          // Lazy-load supabase only when needed (avoids crashing on web when env is missing)
          const { supabase } = await import("@/api");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error("❌ Error processing OAuth callback:", error);
          } else {
            console.log("✅ OAuth callback processed successfully");
          }
        }
      }
    };
    
    // Handle initial URL (app opened from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
    
    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", handleDeepLink);
    
    return () => subscription.remove();
  }, []);
  
  // If env is missing, show setup screen to avoid blank render
  if (!hasAllEnv()) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SetupScreen />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Suspense fallback={<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text>Loading…</Text></View>}>
        <AuthProviderLazy>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </AuthProviderLazy>
      </Suspense>
    </ThemeProvider>
  );
}
