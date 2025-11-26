import { AlphaLensStats } from "@/lib/alphaLens";

export type SymbolKey =
  | "AAPL" | "MSFT" | "SPY" | "TSLA" | "GOOGL" | "AMZN" | "META" | "NVDA" | "NFLX";

export type SparkPoint = { x: Date; y: number };

export type StockCardData = {
  symbol: SymbolKey;
  price: number;
  changePct: number;
  series: SparkPoint[];
  stats: AlphaLensStats | null;
};
