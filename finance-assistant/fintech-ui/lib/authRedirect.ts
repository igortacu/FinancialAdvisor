import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";
import Constants from "expo-constants";

export function getRedirectTo() {
  if (Platform.OS === "web") {
    return window.location.origin;
  }
  
  // Always use custom scheme for mobile (both dev and production)
  // This ensures OAuth redirects work properly
  const scheme = "fintechui";
  
  // In development with Expo Go, we need to use a path
  const redirectUri = Constants.appOwnership === "expo"
    ? `${scheme}://`
    : AuthSession.makeRedirectUri({ 
        scheme,
        preferLocalhost: false,
        isTripleSlashed: false
      });
  
  console.log("📍 Generated redirect URI:", redirectUri);
  return redirectUri;
}
