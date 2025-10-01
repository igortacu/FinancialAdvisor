import { Alert } from "react-native";
import { supabase } from "@/api";
import { getRedirectTo } from "./authRedirect";

export async function signInWithGoogle() {
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
