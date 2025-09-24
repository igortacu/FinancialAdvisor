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
import { router } from "expo-router";
import { useAuth } from "@/store/auth";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

// Types

type Screen = "welcome" | "register" | "login";
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen(): React.ReactElement {
  const { setUser } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secure, setSecure] = useState(true);

  const [userInfo, setUserInfo] = useState<any>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "929357446480-b2c2qttouuka55mk1ojqqit53mermpge.apps.googleusercontent.com",
    iosClientId:
      "929357446480-fjouufrkndv6fbme5bir54c86q33o5pj.apps.googleusercontent.com",
    webClientId:
      "929357446480-gf7bks19r5o9nu4jau4s4p43vtohve6f.apps.googleusercontent.com",
    // ask for profile + email in one go
    scopes: ["openid", "profile", "email"],
  });

  // derive title per screen
  const title = useMemo(() => {
    if (screen === "register") return "Create account";
    if (screen === "login") return "Welcome back";
    return "Financial Advisor";
  }, [screen]);

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
      const { error: insertError } = await supabase.from("users").insert([
        {
          email: userInfo.email,
          name: userInfo.name,
        },
      ]);

      if (insertError) {
        console.error("Error saving user:", insertError);
      }
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

      setUser({ userId: data.user?.id, email: data.user?.email ?? emailTrimmed });
      setEmail("");
      setPassword("");
      setIsLoading(false);
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg = String(error?.message ?? "Login failed");
      Alert.alert(
        "Login Failed",
        msg.includes("Invalid login credentials") ? "Invalid email or password." : msg,
      );
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
      colors={["#0f172a", "#111827", "#0b1220"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          {/* Brand / Hero */}
          <View style={styles.heroWrap}>
            <LinearGradient
              colors={["#22d3ee", "#3b82f6", "#a78bfa"]}
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
            tint="dark"
            style={styles.card}
          >
            {/* Segmented control */}
            <View style={styles.segmentWrap}>
              {(["welcome", "login", "register"] as Screen[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setScreen(s)}
                  style={[styles.segment, screen === s && styles.segmentActive]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      screen === s && styles.segmentTextActive,
                    ]}
                  >
                    {s === "welcome"
                      ? "Start"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Welcome */}
            {screen === "welcome" && (
              <View>
                {!userInfo && (
                  <View>
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

                {userInfo && (
                  <View style={styles.profileCard}>
                    {userInfo?.picture && (
                      <Image
                        source={{ uri: userInfo.picture }}
                        style={styles.avatar}
                      />
                    )}
                    <Text style={styles.profileText}>
                      Email: {userInfo.email}
                    </Text>
                    <Text style={styles.profileText}>
                      Verified: {userInfo.verified_email ? "yes" : "no"}
                    </Text>
                    <Text style={styles.profileText}>
                      Name: {userInfo.name}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Register */}
            {screen === "register" && (
              <View>
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
                  <Ionicons name="arrow-back" size={18} color="#c7d2fe" />
                  <Text style={[styles.btnText, styles.btnGhostText]}>
                    Back
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Login */}
            {screen === "login" && (
              <View>
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
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setScreen("welcome")}
                >
                  <Ionicons name="arrow-back" size={18} color="#c7d2fe" />
                  <Text style={[styles.btnText, styles.btnGhostText]}>
                    Back
                  </Text>
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
          </BlurView>
        </Animated.View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Processing…</Text>
        </View>
      )}

      {/* Decorative Gradients */}
      <LinearGradient
        colors={["rgba(99,102,241,0.25)", "transparent"]}
        style={[styles.glow, { top: -40, left: -80 }]}
      />
      <LinearGradient
        colors={["rgba(16,185,129,0.25)", "transparent"]}
        style={[styles.glow, { bottom: -60, right: -60 }]}
      />
    </LinearGradient>
  );
}

// ------- UI Subcomponents -------

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
        color="#93c5fd"
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
          <Ionicons name={rightIcon} size={18} color="#93c5fd" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ------- Styles -------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  heroWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
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
  heroBadgeText: {
    color: "#0b1020",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#e5e7eb",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#a3a3a3",
    textAlign: "center",
    marginTop: 6,
  },
  cardWrap: {
    marginTop: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(17,24,39,0.5)",
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.12)",
    padding: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: "#111827",
  },
  segmentText: {
    color: "#cbd5e1",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#e5e7eb",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.6)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    height: 50,
  },
  input: {
    flex: 1,
    color: "#e5e7eb",
    fontSize: 16,
  },
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
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnIndigo: {
    backgroundColor: "#6366f1",
    shadowColor: "#6366f1",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnGoogle: {
    backgroundColor: "#ffffff",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4f46e5",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextDark: {
    color: "#111827",
  },
  btnGhostText: {
    color: "#c7d2fe",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.25)",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  profileCard: {
    alignItems: "center",
    padding: 12,
    gap: 6,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 6,
  },
  profileText: {
    color: "#e5e7eb",
  },
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
  loadingText: {
    color: "#cbd5e1",
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    filter: Platform.OS === "web" ? "blur(80px)" : (undefined as any),
  },
});
