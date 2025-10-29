import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView,
  useWindowDimensions,
  ImageBackground,
} from "react-native";
import * as SecureStore from 'expo-secure-store';
import { Colors } from "@/constants/theme";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Input from "./input";
import GoogleSignIn from "./signInGoogle"
import CreateButton from "./createButton";
import { supabase } from "@/api";
import { useAuth } from "@/store/auth";
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
import styles from "./styles"
type Screen = "welcome" | "register" | "login";

export default function AuthScreen(): React.ReactElement {
  const { user, setUser, isLoading: authLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      (async () => {
        const POST_OAUTH_KEY = 'post_oauth_route';
        try {
          let postRoute: string | null = null;
          if (Platform.OS === 'web') {
            postRoute = localStorage.getItem(POST_OAUTH_KEY);
          } else {
            postRoute = await SecureStore.getItemAsync(POST_OAUTH_KEY);
          }

          if (postRoute) {
            // Clear stored flag and navigate to the requested route
            try {
              if (Platform.OS === 'web') localStorage.removeItem(POST_OAUTH_KEY);
              else await SecureStore.deleteItemAsync(POST_OAUTH_KEY);
            } catch (e) {
              console.warn('Could not clear post-oauth flag', e);
            }
            console.log('➡️ Redirecting to post-OAuth route:', postRoute);
            router.replace(postRoute as any);
            return;
          }
        } catch (err) {
          console.warn('Error reading post-OAuth flag:', err);
        }

        router.replace("/(tabs)");
      })();
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
  console.log(` ${type} login enabled - auto-triggering`);
  setTimeout(() => handleBiometricLogin(), 800);
      }
    })();
  }, [authLoading, user, hasBiometricTriggered]);

  async function handleBiometricLogin() {
    // Prevent multiple simultaneous biometric prompts
    if (isLoading) {
      console.log(" Biometric login already in progress");
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
        console.log("User already exists");
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
        console.log("Email confirmation required for:", data.user.id);
        console.log("Profile will be created after email confirmation on first login");
        
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
                  router.replace("/cont");
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
                  router.replace("/cont");
                }
              }
            ]
          );
        } else {
          setEmail("");
          setPassword("");
          setName("");
          setSurname("");
          router.replace("/cont");
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
    <ImageBackground  
    source={require("@/assets/images/marm.jpg")}
    style={[styles.screen, { flex: 1 }]}  
    resizeMode="cover"
    >
    <View style={[styles.screen]}>
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


                  <GoogleSignIn setIsLoading = {setIsLoading}/>


                </View>
              </Animated.View>
            )}

            {screen === "register" && (
              <Animated.View entering={FadeInUp.duration(300).delay(80)} exiting={FadeOutDown.duration(250)}>
                <View style = {[styles.inputs]}>
                  <Input 
                    icon="person-circle-outline" 
                    placeholder="Name (optional)" 
                    value={name} onChangeText={setName} 
                    autoCapitalize="words" textContentType="name" 
                    inputHeight={dyn.inputH} />
                  <Input icon="person-outline" placeholder="Surname (optional)" value={surname} onChangeText={setSurname} autoCapitalize="words" textContentType="familyName" inputHeight={dyn.inputH} />
                  <Input icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" inputHeight={dyn.inputH} />
                  <Input icon="lock-closed-outline" placeholder="Password (min 6 characters)" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry={secure} rightIcon={secure ? "eye-outline" : "eye-off-outline"} onRightIconPress={() => setSecure(v => !v)} textContentType="password" inputHeight={dyn.inputH} />
                  <CreateButton isLoading = {isLoading} handleRegister={() => {
                      handleRegister();
                  }}/>

                </View>
              </Animated.View>
            )}

            {screen === "login" && (
              <Animated.View entering={FadeInUp.duration(300).delay(80)} exiting={FadeOutDown.duration(250)}>
                <View style = {[styles.loginInputs]}>
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

    </ImageBackground>
  );
}