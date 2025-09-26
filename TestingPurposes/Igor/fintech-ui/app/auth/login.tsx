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
  ImageBackground,
} from "react-native";

import { supabase } from "../../api";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { useAuth } from "@/store/auth";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown, FadeOutDown } from "react-native-reanimated";
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
        router.replace("/cont");
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
      router.replace("/cont"); 
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

      setUser({
        userId: data.user?.id,
        email: data.user?.email ?? emailTrimmed,
      });
      setEmail("");
      setPassword("");
      setIsLoading(false);
      router.replace("/cont"); 
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

  const onGooglePress = () => {
    if (!request) return;
    promptAsync();
  };

  return (
    <ImageBackground
      source={require('../../assets/images/hero.jpg')}
      style={{ width: '100%', height: '100%' }}
      >

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {screen != "welcome" && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen("welcome")}
        >
          <Text style={{position: 'absolute', left: 20, top: 1, color: '#90a3ecff', fontSize: 30}}>{'<'}</Text>
        </TouchableOpacity>
      )}

        <Animated.View entering={FadeInUp.duration(500)}>
          {/* Brand / Hero */}
          <View style={styles.heroWrap}>
            <LinearGradient
              colors={["#22d3ee", "#3b82f6", "#a78bfa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadge}
            >
              <Ionicons name="shield-checkmark" size={18} color="#f0f3ffff" />
              <Text style={styles.heroBadgeText}>Secure & Private</Text>
            </LinearGradient>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Manage money with clarity</Text>
          </View>
        </Animated.View>

        {/* Card */}


          {screen === "welcome" && (
              <Animated.View
                entering={FadeInUp.duration(400)}
                exiting={FadeOutDown.duration(300)}
              >
            <View style={styles.container}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => setScreen("register")}
              >
                <Text style={styles.btnText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setScreen("login")}>
                <Text style={styles.smallText}>Have an account? Login</Text>
              </TouchableOpacity>
            </View>
            </Animated.View>
          )}

            {/* Register */}
            {screen === "register" && (
              <Animated.View
                entering={FadeInUp.duration(400).delay(100)}
                exiting={FadeOutDown.duration(300)}
              >
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

              </View>
              </Animated.View>
            )}

            {/* Login */}
            {screen === "login" && (
                <Animated.View
                entering={FadeInUp.duration(400).delay(100)}
                exiting={FadeOutDown.duration(300)}
                > 
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
              </Animated.View>
            )}
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Processing…</Text>
        </View>
      )}


    </ImageBackground>
    
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
    width: "100%",
    backgroundColor: "#f8fafc", // clean white background with slight gray tint
  },
  scroll: {
    width: "100%",
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroWrap: {
    alignItems: "center",
    marginBottom: 30,
    paddingTop:100,
  },
  heroBadge: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.1)", // light blue badge background
    alignItems: "center",
    marginBottom: 16,
  },
  heroBadgeText: {
    color: "#2563eb", // primary blue text
    fontWeight: "600",
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#0f172a", // dark navy text
    textAlign: "center",
  },
subtitle: {
    fontSize: 17,
    color: "#475569", // slate gray
    textAlign: "center",
    marginTop: 6,
  },
  cardWrap: {
    marginTop: 20,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end", // push content to bottom
    alignItems: "center",
    paddingTop: 430, // some space from top edge
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9", // light gray input bg
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 14,
    height: 52,
  },
  input: {
    flex: 1,
    color: "#0f172a",
    fontSize: 16,
  },
  btn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    width: "95%",
    marginTop: 12,
  },
   btnPrimary: {
    backgroundColor: "#3b6df6ff", // main blue
    shadowColor: "#3b82f6",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  backButton: {
    position: "absolute",
    top: 50, // adjust for safe area / status bar
    left: 20,
    backgroundColor: "rgba(255, 255, 255, 0)", // subtle transparent background,
    padding: 10,
  },
  btnIndigo: {
    backgroundColor: "#2563eb", // deeper blue
    shadowColor: "#2563eb",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  btnGoogle: {
    backgroundColor: "#ffffff",
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    width: 200,
    textAlign: "center",
    fontWeight: "700",
  },
  btnTextDark: {
    color: "#1e293b", // dark slate
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
    backgroundColor: "#e2e8f0", // light gray divider
  },
  dividerText: {
    color: "#ffffffff",
    fontSize: 14,
  },
  


loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.6)", // light overlay
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#bfdbfe", // pale blue
  },
    smallText: {
      paddingTop: 10,
    fontSize: 15,
    color: "#dae2f0ff", // gray-600
    textAlign: "center",
  },
});
