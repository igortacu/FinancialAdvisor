// utils/shadow.ts
import { Platform } from "react-native";

export const cardShadow = Platform.select({
  web: { boxShadow: "0px 6px 12px rgba(0,26,77,0.08)" } as any,
  default: {
    shadowColor: "#001a4d",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
