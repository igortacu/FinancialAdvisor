import React from "react";
import { Redirect } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";

const requiredEnvVars = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_FINNHUB_KEY",
  "EXPO_PUBLIC_SUPABASE_FN_PROXY_URL",
];

export default function Index() {
  const missing = requiredEnvVars.filter((k) => !process.env[k]);

  if (missing.length === 0) {
    return <Redirect href="/home" />;
  }

  // Friendly setup screen instead of throwing (prevents blank page)
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, justifyContent: "center" }}>
      <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Project setup required</Text>
        <Text style={{ color: "#6B7280", marginBottom: 12 }}>
          The following environment variables are missing. Define them in your shell or a .env file,
          then reload the app.
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
