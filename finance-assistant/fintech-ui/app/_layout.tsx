import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/store/auth";
import { supabase } from "@/api";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Handle deep links for OAuth
  useEffect(() => {
    // Only handle deep links on mobile
    if (Platform.OS === "web") return;
    
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
  
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
