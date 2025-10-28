
import { useState } from "react";
import { TouchableOpacity, Text, Platform, Alert, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons";
import { getRedirectTo } from "@/lib/authRedirect";
import { supabase } from "@/api";
import styles from "./styles";
type GoogleLoginProps = {
  setIsLoading: (loading: boolean) => void;
};

export default function GoogleLogin({ setIsLoading }: GoogleLoginProps){
 
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    
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

    return(
           <TouchableOpacity style={[styles.btn, styles.btnGoogle]} onPress={signInWithGoogle}>
                    <Ionicons name="logo-google" size={18} color="#111827" />
                    <Text style={[styles.btnText, styles.btnTextDark]}>Sign in with Google</Text>
            </TouchableOpacity>
    )
}