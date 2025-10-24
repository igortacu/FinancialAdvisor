import { Redirect } from "expo-router";
const requiredEnvVars = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_FINNHUB_KEY",
  "EXPO_PUBLIC_SUPABASE_FN_PROXY_URL",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
});

export default function Index() {
  return <Redirect href="/login" />;
  
}
