// lib/victory.ts
let V: any = {};
try {
  // Lazy load to avoid crashes if the package isn’t installed on web/dev.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  V = require("victory-native");
} catch {
  V = {};
}

// Minimal presence check
export const HasVictory =
  !!V?.VictoryChart && !!V?.VictoryPie && !!V?.VictoryAxis && !!V?.VictoryLine;

export default V;
