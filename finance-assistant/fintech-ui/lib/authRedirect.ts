import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

export function getRedirectTo() {
  return Platform.OS === "web"
    ? window.location.origin
    : AuthSession.makeRedirectUri({ scheme: "fintechui" });
}
