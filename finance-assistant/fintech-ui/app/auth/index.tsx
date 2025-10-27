import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { Colors } from "@/constants/theme";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { supabase } from "@/api";
import { useAuth } from "@/store/auth";
import { getRedirectTo } from "@/lib/authRedirect";
import { upsertProfile, getProfile } from "@/lib/profile";
import { 
  isBiometricLoginEnabled, 
  getStoredCredentials,
  getBiometricType,
  isBiometricSupported,
  enableBiometricLogin,
  getStoredEmail,
  disableBiometricLogin
} from "@/lib/biometric";

type Screen = "welcome" | "register" | "login";

export default function AuthScreen(): React.ReactElement {
  const { user, setUser, isLoading: authLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [hasBiometricTriggered, setHasBiometricTriggered] = useState(false);
  const [secure, setSecure] = useState(true);

  const { height, width } = useWindowDimensions();
  const hScale = Math.min(height / 800, 1);
  const wScale = Math.max(Math.min(width / 390, 1), 0.85);
  const redirectTo = Platform.select({
    web: window.location.origin,
    default: AuthSession.makeRedirectUri({ scheme: "fintechui" }),
  })!;

  const title = useMemo(() => {
    if (screen === "register") return "Create account";
    if (screen === "login") return "Welcome back";
    return "Financial Advisor";
  }, [screen]);

  // If user is already logged in, redirect to tabs
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/(tabs)");
    }
  }, [user, authLoading]);

  // Check if biometric login is available and auto-trigger if enabled
  useEffect(() => {
    // Only run once when auth is initialized and there's no user
    if (authLoading || user || hasBiometricTriggered) return;
    
    (async () => {
      const enabled = await isBiometricLoginEnabled();
      if (enabled) {
        const type = await getBiometricType();
        
        // Mark as triggered to prevent multiple attempts
        setHasBiometricTriggered(true);
        
  // Auto-trigger biometric login (slight delay for better reliability)
  console.log(`🔐 ${type} login enabled - auto-triggering`);
  setTimeout(() => handleBiometricLogin(), 800);
      }
    })();
  }, [authLoading, user, hasBiometricTriggered]);

  async function handleBiometricLogin() {
    // Prevent multiple simultaneous biometric prompts
    if (isLoading) {
      console.log("⚠️ Biometric login already in progress");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("🔵 Requesting biometric authentication...");
      const credentials = await getStoredCredentials();
      
      if (!credentials) {
        console.log("❌ No credentials returned - user may have cancelled or Face ID failed");
        setIsLoading(false);
        return; // User cancelled - don't show error
      }

      console.log("🔵 Attempting biometric login for:", credentials.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });
      
      if (error) {
        console.error("❌ Biometric login error:", error);
        
        // If credentials are wrong, disable biometric and clear stored data
        if (error.message.includes("Invalid login credentials")) {
          console.log("⚠️ Stored credentials are invalid - disabling biometric");
          const { disableBiometricLogin } = await import("@/lib/biometric");
          await disableBiometricLogin();
          Alert.alert(
            "Face ID Disabled",
            "Your stored credentials are no longer valid. Please login with your email and password to re-enable Face ID."
          );
        } else {
          Alert.alert(
            "Login Failed",
            "Unable to sign in with biometric. Please try again or use password."
          );
        }
        setIsLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        throw new Error("Login failed - no user or session returned");
      }

      console.log("✅ Biometric login successful!");

      // Fetch profile from database
      const profile = await getProfile(data.user.id);
      
      setUser({
        id: data.user.id,
        email: data.user.email ?? credentials.email,
        name: profile?.name ?? data.user.user_metadata?.name ?? null,
        avatarUrl: data.user.user_metadata?.avatar_url ?? null,
      });
      
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("❌ Biometric login error:", err);
      Alert.alert("Login Failed", err?.message ?? "Biometric login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    // Prevent multiple simultaneous calls
    if (isGoogleLoading) {
      console.log("⚠️ Google sign-in already in progress");
      return;
    }
    
    try {
      setIsGoogleLoading(true);
      setIsLoading(true);
      const redirectUri = getRedirectTo();
      console.log("🔄 OAuth redirect URI:", redirectUri);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: Platform.OS === "web" ? false : true,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      
      if (error) {
        console.error("❌ Google Sign-in error:", error);
        Alert.alert(
          "Google Sign-in Failed",
          `${error.message}\n\nMake sure you're connected to the internet and try again.`
        );
      }
    } catch (err: any) {
      console.error("❌ Unexpected error during Google sign-in:", err);
      Alert.alert(
        "Sign-in Error",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
      // Add delay before allowing another attempt
      setTimeout(() => setIsGoogleLoading(false), 2000);
    }
  }

  async function handleRegister() {
    const e = email.trim().toLowerCase();
    const p = password.trim();
    if (!e || !p) return Alert.alert("Error", "Enter email and password");
    if (p.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");

    setIsLoading(true);
    try {
      // Combine name and surname into single name field
      const fullName = [name.trim(), surname.trim()].filter(Boolean).join(" ") || null;
      
      console.log("🔵 Starting registration for:", e);
      
      // Sign up with metadata
      const { data, error } = await supabase.auth.signUp({ 
        email: e, 
        password: p,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            name: fullName,
          }
        }
      });
      
      console.log("🔵 Signup response:", JSON.stringify({ 
        hasUser: !!data.user, 
        hasSession: !!data.session,
        userId: data.user?.id,
        identities: data.user?.identities?.length,
        error: error 
      }, null, 2));
      
      if (error) {
        console.error("❌ Signup error:", error);
        // Handle specific error cases
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          throw new Error("This email is already registered. Please login instead.");
        }
        throw error;
      }

      // Check if user already exists (Supabase returns user but with empty identities array)
      if (data.user && data.session && data.user.identities && data.user.identities.length === 0) {
        console.log("⚠️  User already exists");
        Alert.alert(
          "Account Exists",
          "An account with this email already exists. Please login instead.",
          [{ text: "Go to Login", onPress: () => setScreen("login") }]
        );
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log("📧 Email confirmation required for:", data.user.id);
        console.log("ℹ️  Profile will be created after email confirmation on first login");
        
        // Note: We cannot create the profile here due to RLS (Row Level Security)
        // The profile will be created automatically during the first login
        // after the user confirms their email and gets a valid session
        
        Alert.alert(
          "Check Your Email", 
          "We've sent you a confirmation email. Please verify your email address, then login to continue.",
          [{ text: "OK", onPress: () => {
            setScreen("login");
            setEmail("");
            setPassword("");
            setName("");
            setSurname("");
          }}]
        );
        setIsLoading(false);
        return;
      }

      // If we have a session, user is automatically logged in
      if (data.user && data.session) {
        console.log("✅ User registered and logged in:", data.user.id);
        
        // Store profile in profiles table
        await upsertProfile(fullName || undefined);
        console.log("✅ Profile stored");
        
        setUser({
          id: data.user.id,
          email: data.user.email ?? e,
          name: fullName,
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        });
        
        // Check if biometric is available
        const biometricSupported = await isBiometricSupported();
        
        if (biometricSupported) {
          const biometricType = await getBiometricType();
          // Ask user if they want to enable biometric login
          Alert.alert(
            `Enable ${biometricType}?`,
            `Would you like to use ${biometricType} to sign in? This will allow you to sign in without entering your password.`,
            [
              {
                text: "Not Now",
                style: "cancel",
                onPress: () => {
                  setEmail("");
                  setPassword("");
                  setName("");
                  setSurname("");
                  router.replace("/(tabs)");
                }
              },
              {
                text: "Enable",
                onPress: async () => {
                  console.log(`🔐 Enabling ${biometricType}...`);
                  const success = await enableBiometricLogin(e, p);
                  if (success) {
                    console.log(`✅ ${biometricType} enabled successfully`);
                    Alert.alert(
                      "Success",
                      `${biometricType} has been enabled. Next time you can sign in with just your face!`
                    );
                  }
                  setEmail("");
                  setPassword("");
                  setName("");
                  setSurname("");
                  router.replace("/(tabs)");
                }
              }
            ]
          );
        } else {
          setEmail("");
          setPassword("");
          setName("");
          setSurname("");
          router.replace("/(tabs)");
        }
      }
    } catch (err: any) {
      console.error("❌ Registration error:", err);
      const errorMessage = err?.message ?? "Unknown error";
      Alert.alert("Registration Failed", errorMessage);
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
      console.log("🔵 Attempting login for:", e);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      
      console.log("🔵 Login response:", JSON.stringify({
        hasUser: !!data.user,
        hasSession: !!data.session,
        userId: data.user?.id,
        emailConfirmed: data.user?.email_confirmed_at,
        error: error
      }, null, 2));
      
      if (error) {
        console.error("❌ Login error:", error);
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error("Login failed - no user or session returned");
      }

      console.log("✅ Login successful for:", data.user.id);

      // Fetch profile from database
      let profile = await getProfile(data.user.id);
      console.log("🔵 Profile fetched:", profile);
      
      // If profile doesn't exist, create it from user metadata
      if (!profile) {
        console.log("🔵 Profile not found, creating from metadata");
        const userName = data.user.user_metadata?.name ?? null;
        console.log("🔵 User metadata name:", userName);
        
        // Create profile with name from metadata
        await upsertProfile(userName ?? undefined);
        
        // Fetch the newly created profile
        profile = await getProfile(data.user.id);
        console.log("✅ Profile created:", profile);
      } else {
        console.log("✅ Profile exists");
      }
      
      setUser({
        id: data.user.id,
        email: data.user.email ?? e,
        name: profile?.name ?? data.user.user_metadata?.name ?? null,
        avatarUrl: data.user.user_metadata?.avatar_url ?? null,
      });
      
      console.log("✅ User state updated, redirecting to app");
      
      // Check if biometric is available and not already enabled
      const biometricEnabled = await isBiometricLoginEnabled();
      const biometricSupported = await isBiometricSupported();
      
      console.log(`🔐 Biometric check - Enabled: ${biometricEnabled}, Supported: ${biometricSupported}`);
      
      // If biometric is enabled, check if the stored email matches current login
      if (biometricEnabled) {
        const storedEmail = await getStoredEmail();
        console.log(`🔐 Stored email: ${storedEmail}, Current email: ${e}`);
        
        if (storedEmail && storedEmail !== e) {
          // Different account - ask to update Face ID
          console.log("⚠️ Different account detected - clearing old Face ID data");
          await disableBiometricLogin();
          
          const biometricType = await getBiometricType();
          Alert.alert(
            `Update ${biometricType}?`,
            `You're logging in with a different account (${e}). Would you like to enable ${biometricType} for this account?`,
            [
              {
                text: "Not Now",
                style: "cancel",
                onPress: () => {
                  setEmail("");
                  setPassword("");
                  router.replace("/(tabs)");
                }
              },
              {
                text: "Enable",
                onPress: async () => {
                  console.log(`🔐 Enabling ${biometricType} for new account...`);
                  const success = await enableBiometricLogin(e, p);
                  if (success) {
                    console.log(`✅ ${biometricType} enabled for ${e}`);
                    Alert.alert("Success", `${biometricType} has been enabled for your account!`);
                  }
                  setEmail("");
                  setPassword("");
                  router.replace("/(tabs)");
                }
              }
            ]
          );
          return;
        } else if (storedEmail === e) {
          // Same account - update password silently in case it changed
          console.log("🔐 Same account - updating stored credentials silently");
          await enableBiometricLogin(e, p, true); // Skip Face ID prompt when updating
          setEmail("");
          setPassword("");
          router.replace("/(tabs)");
          return;
        }
      }
      
      if (!biometricEnabled && biometricSupported) {
        const biometricType = await getBiometricType();
        console.log(`🔐 Showing ${biometricType} enable prompt...`);
        // Ask user if they want to enable biometric login
        Alert.alert(
          `Enable ${biometricType}?`,
          `Would you like to use ${biometricType} to sign in next time? This will allow you to sign in without entering your password.`,
          [
            {
              text: "Not Now",
              style: "cancel",
              onPress: () => {
                setEmail("");
                setPassword("");
                router.replace("/(tabs)");
              }
            },
            {
              text: "Enable",
              onPress: async () => {
                console.log(`🔐 Enabling ${biometricType}...`);
                const success = await enableBiometricLogin(e, p);
                if (success) {
                  console.log(`✅ ${biometricType} enabled successfully`);
                  Alert.alert(
                    "Success",
                    `${biometricType} has been enabled. Next time you can sign in with just your face!`
                  );
                } else {
                  console.log(`❌ Failed to enable ${biometricType}`);
                }
                setEmail("");
                setPassword("");
                router.replace("/(tabs)");
              }
            }
          ]
        );
      } else {
        setEmail("");
        setPassword("");
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("❌ Login error:", err);
      const msg = String(err?.message ?? "Login failed");
      let errorMessage = msg;
      
      if (msg.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password.";
      } else if (msg.includes("Email not confirmed")) {
        errorMessage = "Please confirm your email before logging in.";
      }
      
      Alert.alert("Login Failed", errorMessage);
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
    <View style={[styles.screen, { backgroundColor: Colors.light.background }]}>
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
    </View>
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
