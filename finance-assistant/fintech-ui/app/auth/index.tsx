import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ImageBackground, Platform, KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { supabase } from "@/api";
import { useAuth } from "@/store/auth";
import { getRedirectTo } from "@/lib/authRedirect";
import { upsertProfile } from "@/lib/profile";

type Screen = "welcome" | "register" | "login";

export default function AuthScreen(): React.ReactElement {
  const { setUser } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secure, setSecure] = useState(true);

  const { height, width } = useWindowDimensions();
  const hScale = Math.min(height / 800, 1);
  const wScale = Math.max(Math.min(width / 390, 1), 0.85);
  const redirectTo = Platform.select({
    web: window.location.origin,
    default: AuthSession.makeRedirectUri({ scheme: "yourapp" }),
  })!;

  const title = useMemo(() => {
    if (screen === "register") return "Create account";
    if (screen === "login") return "Welcome back";
    return "Financial Advisor";
  }, [screen]);

  // session resume (OAuth returns here)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await upsertProfile();
      setUser({
        id: user.id,
        email: user.email ?? "",
        name: user.user_metadata?.name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      });
      router.replace("/(tabs)");
    })();
  }, []);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) Alert.alert("Google Sign-in failed", error.message);
  }

  async function handleRegister() {
    const e = email.trim().toLowerCase();
    const p = password.trim();
    if (!e || !p) return Alert.alert("Error", "Enter email and password");
    if (p.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: e, password: p });
      if (error) throw error;

      await upsertProfile();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          id: user.id,
          email: user.email ?? e,
          name: (name.trim() || [name.trim(), surname.trim()].filter(Boolean).join(" ")) || null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        });
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Registration Failed", String(err?.message ?? "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    const e = email.trim().toLowerCase();
    const p = password.trim();
    if (!e || !p) return Alert.alert("Error", "Enter both email and password");

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw error;

      await upsertProfile();
      setUser({
        id: data.user!.id,
        email: data.user?.email ?? e,
        name: data.user?.user_metadata?.name ?? null,
        avatarUrl: data.user?.user_metadata?.avatar_url ?? null,
      });
      setEmail("");
      setPassword("");
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = String(err?.message ?? "Login failed");
      Alert.alert("Login Failed", msg.includes("Invalid login credentials") ? "Invalid email or password." : msg);
    } finally {
      setIsLoading(false);
    }
  }

  const dyn = {
    titleFs: Math.round(36 * wScale),
    subFs: Math.round(16 * wScale),
    inputH: Math.max(46, Math.round(52 * hScale)),
    heroTopPad: Math.round(40 * hScale),
    sectionGap: Math.round(12 * hScale),
  };

  return (
    <ImageBackground
      source={require("../../assets/images/hero.jpg")}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {screen !== "welcome" && (
          <TouchableOpacity style={styles.backButton} onPress={() => setScreen("welcome")}>
            <Text style={{ position: "absolute", left: 20, top: 1, color: "#90a3ec", fontSize: 30 }}>
              {"<"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1, paddingTop: dyn.heroTopPad, paddingHorizontal: 20, paddingBottom: 16, gap: dyn.sectionGap, justifyContent: "space-between" }}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <View style={styles.heroWrap}>
              <LinearGradient colors={["#22d3ee", "#3b82f6", "#a78bfa"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#f0f3ff" />
                <Text style={styles.heroBadgeText}>Secure & Private</Text>
              </LinearGradient>
              <Text style={[styles.title, { fontSize: dyn.titleFs }]} numberOfLines={1} adjustsFontSizeToFit>
                {title}
              </Text>
              <Text style={[styles.subtitle, { fontSize: dyn.subFs }]} numberOfLines={1} adjustsFontSizeToFit>
                Manage money with clarity
              </Text>
            </View>
          </Animated.View>

          <View>
            {screen === "welcome" && (
              <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutDown.duration(250)}>
                <View style={styles.container}>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setScreen("register")}>
                    <Text style={styles.btnText}>Get Started</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setScreen("login")}>
                    <Text style={styles.smallText}>Have an account? Login</Text>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.divider} />
                  </View>

                  <TouchableOpacity style={[styles.btn, styles.btnGoogle]} onPress={signInWithGoogle}>
                    <Ionicons name="logo-google" size={18} color="#111827" />
                    <Text style={[styles.btnText, styles.btnTextDark]}>Sign in with Google</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {screen === "register" && (
              <Animated.View entering={FadeInUp.duration(300).delay(80)} exiting={FadeOutDown.duration(250)}>
                <View>
                  <Input icon="person-circle-outline" placeholder="Name (optional)" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" inputHeight={dyn.inputH} />
                  <Input icon="person-outline" placeholder="Surname (optional)" value={surname} onChangeText={setSurname} autoCapitalize="words" textContentType="familyName" inputHeight={dyn.inputH} />
                  <Input icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" inputHeight={dyn.inputH} />
                  <Input icon="lock-closed-outline" placeholder="Password (min 6 characters)" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry={secure} rightIcon={secure ? "eye-outline" : "eye-off-outline"} onRightIconPress={() => setSecure(v => !v)} textContentType="password" inputHeight={dyn.inputH} />

                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRegister} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.btnText}>Create account</Text></>)}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {screen === "login" && (
              <Animated.View entering={FadeInUp.duration(300).delay(80)} exiting={FadeOutDown.duration(250)}>
                <View>
                  <Input icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" inputHeight={dyn.inputH} />
                  <Input icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry={secure} rightIcon={secure ? "eye-outline" : "eye-off-outline"} onRightIconPress={() => setSecure(v => !v)} textContentType="password" inputHeight={dyn.inputH} />

                  <TouchableOpacity style={[styles.btn, styles.btnIndigo]} onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="log-in" size={18} color="#fff" /><Text style={styles.btnText}>Login</Text></>)}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>

          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text style={styles.loadingText}>Processing…</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

type InputProps = {
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: any;
  secureTextEntry?: boolean;
  textContentType?: any;
  inputHeight?: number;
};

function Input(props: InputProps) {
  const { icon, rightIcon, onRightIconPress, placeholder, value, onChangeText, autoCapitalize, keyboardType, secureTextEntry, textContentType, inputHeight = 48 } = props;

  return (
    <View style={[styles.inputWrap, { height: inputHeight }]}>
      <Ionicons name={icon} size={18} color="#93c5fd" style={{ marginRight: 10 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
      />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
          <Ionicons name={rightIcon} size={18} color="#93c5fd" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: "100%", backgroundColor: "transparent" },
  heroWrap: { alignItems: "center" },
  backButton: { position: "absolute", top: 50, left: 0, padding: 16, zIndex: 10 },
  heroBadge: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.1)", alignItems: "center", marginBottom: 12 },
  heroBadgeText: { color: "#2563eb", fontWeight: "600" },
  title: { fontWeight: "800", color: "#0f172a", textAlign: "center" },
  subtitle: { color: "#475569", textAlign: "center", marginTop: 4 },
  container: { alignItems: "center" },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "rgba(59,130,246,0.25)", paddingHorizontal: 12, borderRadius: 14, marginBottom: 12 },
  input: { flex: 1, color: "#0f172a", fontSize: 16 },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, width: "100%", marginTop: 10 },
  btnPrimary: { backgroundColor: "#3b6df6", shadowColor: "#3b82f6", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnIndigo: { backgroundColor: "#2563eb", shadowColor: "#2563eb", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnGoogle: { backgroundColor: "#ffffff" },
  btnText: { color: "#fff", fontSize: 16, textAlign: "center", fontWeight: "700" },
  btnTextDark: { color: "#1e293b" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 10, gap: 8 },
  divider: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { color: "#ffffff", fontSize: 14 },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#bfdbfe" },
  smallText: { paddingTop: 10, fontSize: 15, color: "#dae2f0", textAlign: "center" },
});
