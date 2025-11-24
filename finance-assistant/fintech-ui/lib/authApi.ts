import { Alert } from "react-native";
import { supabase } from "@/api";
import { getRedirectTo } from "./authRedirect";

export async function signInWithGoogle() {
  // In dev mode, skip OAuth and show alert
  if (process.env.EXPO_PUBLIC_DEV_MODE === 'true') {
    Alert.alert("Dev Mode", "OAuth is disabled in development mode. The app is using a mock user.");
    return;
  }
  
  const redirectTo = getRedirectTo();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) Alert.alert("Google Sign-in failed", error.message);
}

export async function signUpEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signInEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
