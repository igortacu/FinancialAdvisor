// Cross-platform Victory bridge (web -> victory, native -> victory-native)
import { Platform } from "react-native";

let V: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod =
    Platform.OS === "web" ? require("victory") : require("victory-native");
  V = mod?.default ? { ...mod.default, ...mod } : mod;
} catch {
  V = {};
}

export const VictoryChart = V.VictoryChart ?? (() => null);
export const VictoryLine = V.VictoryLine ?? (() => null);
export const VictoryArea = V.VictoryArea ?? (() => null);
export const VictoryAxis = V.VictoryAxis ?? (() => null);
export const VictoryBar = V.VictoryBar ?? (() => null);
export const VictoryPie = V.VictoryPie ?? (() => null);
export const VictoryGroup = V.VictoryGroup ?? (() => null);
export const VictoryContainer = V.VictoryContainer ?? (() => null);
export const VictoryStack = V.VictoryStack ?? (() => null);
export const VictoryScatter = V.VictoryStack ?? (() => null);
export const ChartsReady =
  !!V.VictoryChart && !!V.VictoryPie && !!V.VictoryAxis;
