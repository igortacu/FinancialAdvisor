import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { supabase } from "../../api";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/store/auth";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

type Screen = "welcome" | "register" | "login" | "checkEmail" | "updated";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen(): React.ReactElement {
  const { setUser } = useAuth();
  const params = useLocalSearchParams();
  const [screen, setScreen] = useState<Screen>("welcome");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [secure, setSecure] = useState(true);

  const [userInfo, setUserInfo] = useState<any>(null);

  // forgot-password resend countdown
  const RESEND_SECONDS = 40;
  const [resendIn, setResendIn] = useState(0);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "929357446480-b2c2qttouuka55mk1ojqqit53mermpge.apps.googleusercontent.com",
    iosClientId:
      "929357446480-fjouufrkndv6fbme5bir54c86q33o5pj.apps.googleusercontent.com",
    webClientId:
      "929357446480-gf7bks19r5o9nu4jau4s4p43vtohve6f.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
  });

  // derive title per screen
  const title = useMemo(() => {
    if (screen === "register") return "Create account";
    if (screen === "login") return "Welcome back";
    if (screen === "checkEmail") return "Check your email";
    if (screen === "updated") return "Password updated";
    return "Financial Advisor";
  }, [screen]);

  // Show "Password updated" if deep link returns with ?pw=updated
  useEffect(() => {
    if (params?.pw === "updated") setScreen("updated");
  }, [params]);

  useEffect(() => {
    if (response?.type === "success") {
      const token = response.authentication?.accessToken;
      if (token) getUserInfo(token);
    }
  }, [response]);

  useEffect(() => {
    if (userInfo) {
      (async () => {
        try {
          await saveUserToSupabase(userInfo);
        } catch {}
        setUser({
          email: userInfo.email,
          name: userInfo.name,
          avatarUrl: userInfo.picture,
        });
        router.replace("/(tabs)");
      })();
    }
  }, [userInfo]);

  // resend countdown tick
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const getUserInfo = async (token: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      setUserInfo(user);
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  async function saveUserToSupabase(userInfo: any) {
    if (!userInfo?.email) return;
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userInfo.email)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error(selectError);
      return;
    }

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from("users")
        .insert([{ email: userInfo.email, name: userInfo.name }]);
      if (insertError) console.error("Error saving user:", insertError);
    }
  }

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      if (data.user?.id) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            name: name.trim() || null,
            surname: surname.trim() || null,
          },
        ]);
        if (profileError)
          console.warn("Profile insert skipped:", profileError.message);
      }

      Alert.alert("Success", "Account created. Confirm via email.");
      setScreen("login");
    } catch (error: any) {
      Alert.alert("Registration Failed", error?.message ?? "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    const passwordTrimmed = password.trim();
    if (!emailTrimmed || !passwordTrimmed) {
      Alert.alert("Error", "Enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: passwordTrimmed,
      });
      if (error) throw error;

      // profile enrichment (optional)
      let profileName: string | undefined;
      let avatarUrl: string | undefined;

      if (data.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, surname, avatar_url")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          const parts = [profile.name, profile.surname].filter(Boolean);
          profileName = parts.join(" ").trim() || undefined;
          avatarUrl = profile.avatar_url || undefined;
        }
      }

      setUser({
        userId: data.user?.id,
        email: data.user?.email ?? emailTrimmed,
        name: profileName,
        avatarUrl,
      });

      setEmail("");
      setPassword("");
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg = String(error?.message ?? "Login failed");
      Alert.alert(
        "Login Failed",
        msg.includes("Invalid login credentials")
          ? "Invalid email or password."
          : msg,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password → send email → show "Check your email"
  const handleForgotPassword = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      Alert.alert("Error", "Enter your email first");
      return;
    }
    try {
      setIsLoading(true);
      // Set redirectTo to your scheme/deep link route that lands back in this screen
      // Include ?pw=updated in your reset completion page to show the success card
      await supabase.auth.resetPasswordForEmail(emailTrimmed, {
        redirectTo: "yourappscheme://auth?pw=updated",
      });
      setResetTarget(emailTrimmed);
      setResendIn(RESEND_SECONDS);
      setScreen("checkEmail");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  const resendReset = async () => {
    if (!resetTarget || resendIn > 0) return;
    try {
      setIsLoading(true);
      await supabase.auth.resetPasswordForEmail(resetTarget, {
        redirectTo: "yourappscheme://auth?pw=updated",
      });
      setResendIn(RESEND_SECONDS);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  const onGooglePress = () => {
    if (!request) return;
    promptAsync();
  };

  return (
    <LinearGradient
      colors={["#7c3aed", "#6d28d9", "#5b21b6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          {/* Hero */}
          <View style={styles.heroWrap}>
            <LinearGradient
              colors={["#c084fc", "#a78bfa", "#60a5fa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadge}
            >
              <Ionicons name="shield-checkmark" size={18} color="#0b1020" />
              <Text style={styles.heroBadgeText}>Secure & Private</Text>
            </LinearGradient>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Manage money with clarity</Text>
          </View>
        </Animated.View>

        {/* Card */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(500)}
          style={styles.cardWrap}
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 40 : 20}
            tint="light"
            style={styles.card}
          >
            {/* Screens */}
            {screen === "welcome" && (
              <View>
                <Text style={styles.panelTitle}>Get started</Text>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => setScreen("register")}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.btnText}>Create account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnIndigo]}
                  onPress={() => setScreen("login")}
                >
                  <Ionicons name="log-in" size={18} color="#fff" />
                  <Text style={styles.btnText}>Login</Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity
                  style={[styles.btn, styles.btnGoogle]}
                  disabled={!request}
                  onPress={onGooglePress}
                >
                  <Ionicons name="logo-google" size={18} color="#111827" />
                  <Text style={[styles.btnText, styles.btnTextDark]}>
                    Sign in with Google
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {screen === "register" && (
              <View>
                <Text style={styles.panelTitle}>Create account</Text>
                <Input
                  icon="person-circle-outline"
                  placeholder="Name (optional)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  textContentType="name"
                />
                <Input
                  icon="id-card-outline"
                  placeholder="Surname (optional)"
                  value={surname}
                  onChangeText={setSurname}
                  autoCapitalize="words"
                  textContentType="familyName"
                />
                <Input
                  icon="mail-outline"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <Input
                  icon="lock-closed-outline"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry={secure}
                  rightIcon={secure ? "eye-outline" : "eye-off-outline"}
                  onRightIconPress={() => setSecure((v) => !v)}
                  textContentType="password"
                />
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.btnText}>Create account</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setScreen("welcome")}
                >
                  <Ionicons name="arrow-back" size={18} color="#6d28d9" />
                  <Text style={[styles.btnText, styles.btnGhostText]}>
                    Back
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {screen === "login" && (
              <View>
                <Text style={styles.panelTitle}>Welcome back</Text>
                <Input
                  icon="mail-outline"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <Input
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry={secure}
                  rightIcon={secure ? "eye-outline" : "eye-off-outline"}
                  onRightIconPress={() => setSecure((v) => !v)}
                  textContentType="password"
                />
                <View style={styles.loginRow}>
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgot}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.btn, styles.btnIndigo]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={18} color="#fff" />
                      <Text style={styles.btnText}>Login</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGoogle]}
                  disabled={!request}
                  onPress={onGooglePress}
                >
                  <Ionicons name="logo-google" size={18} color="#111827" />
                  <Text style={[styles.btnText, styles.btnTextDark]}>
                    Sign in with Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setScreen("welcome")}
                >
                  <Ionicons name="arrow-back" size={18} color="#6d28d9" />
                  <Text style={[styles.btnText, styles.btnGhostText]}>
                    Back
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {screen === "checkEmail" && (
              <View>
                <Text style={styles.panelTitle}>Check your email</Text>
                <View style={styles.centerBox}>
                  <View style={styles.emojiBadge}>
                    <Ionicons name="mail-unread" size={28} color="#6d28d9" />
                  </View>
                  <Text style={styles.centerText}>We sent a reset link to</Text>
                  <Text style={styles.centerEmail}>
                    {maskEmail(resetTarget || email)}
                  </Text>
                  <Text style={styles.centerSub}>
                    Open your inbox, finish the reset, then return and login
                    again.
                  </Text>
                </View>

                <View style={styles.resendRow}>
                  <Text style={styles.resendHint}>Didn’t receive it?</Text>
                  <TouchableOpacity
                    disabled={resendIn > 0}
                    onPress={resendReset}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        resendIn > 0 && { opacity: 0.5 },
                      ]}
                    >
                      Send again
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.resendTimer}>
                    {resendIn > 0
                      ? ` ${String(resendIn).padStart(2, "0")}s`
                      : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.btn, styles.btnIndigo]}
                  onPress={() => setScreen("login")}
                >
                  <Ionicons name="log-in" size={18} color="#fff" />
                  <Text style={styles.btnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {screen === "updated" && (
              <View>
                <Text style={styles.panelTitle}>Password updated</Text>
                <View style={styles.centerBox}>
                  <View style={styles.emojiBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={28}
                      color="#10b981"
                    />
                  </View>
                  <Text style={styles.centerText}>Your password changed.</Text>
                  <Text style={styles.centerSub}>
                    Login with your new password.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.btn, styles.btnIndigo]}
                  onPress={() => setScreen("login")}
                >
                  <Ionicons name="log-in" size={18} color="#fff" />
                  <Text style={styles.btnText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
        </Animated.View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#c084fc" />
          <Text style={styles.loadingText}>Processing…</Text>
        </View>
      )}

      {/* Decorative gradients */}
      <LinearGradient
        colors={["rgba(192,132,252,0.25)", "transparent"]}
        style={[styles.glow, { top: -40, left: -80 }]}
      />
      <LinearGradient
        colors={["rgba(99,102,241,0.25)", "transparent"]}
        style={[styles.glow, { bottom: -60, right: -60 }]}
      />
    </LinearGradient>
  );
}

/* ----------------- UI ----------------- */

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
};

function Input(props: InputProps) {
  const {
    icon,
    rightIcon,
    onRightIconPress,
    placeholder,
    value,
    onChangeText,
    autoCapitalize,
    keyboardType,
    secureTextEntry,
    textContentType,
  } = props;

  return (
    <View style={styles.inputWrap}>
      <Ionicons
        name={icon}
        size={18}
        color="#7c3aed"
        style={{ marginRight: 10 }}
      />
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
        <TouchableOpacity
          onPress={onRightIconPress}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <Ionicons name={rightIcon} size={18} color="#7c3aed" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ----------------- Helpers ----------------- */

function maskEmail(value?: string | null) {
  if (!value) return "";
  const [local, domain] = value.split("@");
  if (!domain) return value;
  const L = Math.min(3, local.length);
  const masked = local.slice(0, L) + "•".repeat(Math.max(0, local.length - L));
  return `${masked}@${domain}`;
}

/* ----------------- Styles ----------------- */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingTop: 80, paddingBottom: 120, paddingHorizontal: 20 },

  heroWrap: { alignItems: "center", marginBottom: 16 },
  heroBadge: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "transparent",
    alignItems: "center",
    marginBottom: 14,
  },
  heroBadgeText: { color: "#0b1020", fontWeight: "600" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fafafa",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#e9d5ff",
    textAlign: "center",
    marginTop: 6,
  },

  cardWrap: { marginTop: 20 },
  card: {
    borderRadius: 20,
    padding: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  panelTitle: {
    color: "#1f2937",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    height: 50,
  },
  input: { flex: 1, color: "#111827", fontSize: 16 },

  loginRow: { alignItems: "flex-end", marginBottom: 6 },
  forgot: { color: "#6d28d9", fontSize: 12, fontWeight: "700" },

  btn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnPrimary: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnIndigo: {
    backgroundColor: "#6d28d9",
    shadowColor: "#6d28d9",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnGoogle: { backgroundColor: "#ffffff" },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#6d28d9",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnTextDark: { color: "#111827" },
  btnGhostText: { color: "#6d28d9" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(109,40,217,0.25)" },
  dividerText: { color: "#6b7280", fontSize: 12 },

  centerBox: { alignItems: "center", gap: 8, paddingVertical: 10 },
  emojiBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  centerText: { color: "#1f2937", fontWeight: "700" },
  centerEmail: { color: "#1f2937", fontWeight: "800", marginBottom: 4 },
  centerSub: { color: "#4b5563", fontSize: 13, textAlign: "center" },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  resendHint: { color: "#6b7280", fontSize: 12 },
  resendLink: { color: "#6d28d9", fontSize: 12, fontWeight: "800" },
  resendTimer: { color: "#6b7280", fontSize: 12 },

  profileCard: { alignItems: "center", padding: 12, gap: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 6 },
  profileText: { color: "#1f2937" },

  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: "#f3e8ff" },

  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    filter: Platform.OS === "web" ? "blur(80px)" : (undefined as any),
  },
});
