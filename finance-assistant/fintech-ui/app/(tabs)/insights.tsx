import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import Card from "@/components/Card";
import { supabase } from "../../api";
import { useAuth } from "@/store/auth";
import { fetchMarketData, getNewsForSymbol, Headline } from "@/lib/insightsApi";
import StockSelector from "@/components/insights/StockSelector";
import StockCard from "@/components/insights/StockCard";
import MonthlyMix from "@/components/insights/MonthlyMix";
import { SymbolKey, StockCardData } from "@/components/insights/types";

const allowedSymbols: SymbolKey[] = ["AAPL", "MSFT", "SPY", "TSLA", "GOOGL", "AMZN", "META", "NVDA", "NFLX"];

export default function Insights() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedSymbols, setSelectedSymbols] = React.useState<SymbolKey[]>(["AAPL", "MSFT", "SPY"]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingSymbols, setLoadingSymbols] = React.useState(false);

  const [newsBySymbol, setNewsBySymbol] =
    React.useState<Record<SymbolKey, Headline[]>>({} as Record<SymbolKey, Headline[]>);

  const [stockMap, setStockMap] =
    React.useState<Partial<Record<SymbolKey, StockCardData>>>({});

  const [loadingMarket, setLoadingMarket] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // load symbols from user investments
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSymbols(true);
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from("investments")
          .select("type")
          .eq("user_id", user.id);
        if (!error && Array.isArray(data) && data.length) {
          const unique = Array.from(
            new Set(
              (data as { type: string }[])
                .map((r) => String(r.type).trim())
                .filter(Boolean)
            )
          ).slice(0, 3);
          const filtered = unique.filter((s): s is SymbolKey =>
            (allowedSymbols as string[]).includes(s)
          );
          if (filtered.length && mounted) setSelectedSymbols(filtered);
        }
      } finally {
        if (mounted) setLoadingSymbols(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // headlines
  React.useEffect(() => {
    const map: Record<SymbolKey, Headline[]> = {} as Record<SymbolKey, Headline[]>;
    selectedSymbols.forEach((s) => { map[s] = getNewsForSymbol(s); });
    setNewsBySymbol(map);
  }, [selectedSymbols]);

  // market data from Finnhub + SPY for beta/idio
  React.useEffect(() => {
    const controller = new AbortController();
    
    (async () => {
      if (!selectedSymbols.length) return;

      setLoadingMarket(true);
      setError(null);
      try {
        const data = await fetchMarketData(selectedSymbols, controller.signal);
        if (!controller.signal.aborted) {
          setStockMap(data);
        }
      } catch (e) {
        console.error(e);
        if (!controller.signal.aborted) {
          setError("Failed to load market data. Please try again later.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMarket(false);
        }
      }
    })();
    
    return () => { controller.abort(); };
  }, [selectedSymbols]);

  // UI helpers
  const handleSymbolSelect = React.useCallback((symbol: string) => {
    const isSymbolKey = (s: string): s is SymbolKey =>
      (allowedSymbols as readonly string[]).includes(s);

    if (!isSymbolKey(symbol)) return;

    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) return prev.filter(s => s !== symbol);
      if (prev.length >= 3) return [symbol, ...prev.slice(0, 2)];
      return [symbol, ...prev];
    });
  }, []);

  return (
    <ScrollView
      style={[s.root, { paddingTop: insets.top + 6 }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Stock Selection */}
      <Animated.View entering={FadeInUp.duration(340)}>
        <Card>
          <Text style={s.h1}>Select Stocks to Track</Text>
          <StockSelector
            allowedSymbols={allowedSymbols}
            selectedSymbols={selectedSymbols}
            onSelect={handleSymbolSelect}
          />
        </Card>
      </Animated.View>

      {/* Market Overview + Alpha Lens */}
      <Animated.View entering={FadeInUp.duration(360)}>
        <View style={s.headerRow}>
          <Text style={s.h1}>Market Overview</Text>
          {loadingMarket && <ActivityIndicator size="small" color="#246BFD" />}
        </View>
        
        {error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : (
          <View style={s.stockCardsContainer}>
            {selectedSymbols.map((symbol, index) => {
              const card = stockMap[symbol];
              const colors = [
                { bg: "#FFB020", accent: "#FF8C00" },
                { bg: "#A855F7", accent: "#7C3AED" },
                { bg: "#1F2937", accent: "#374151" }
              ];
              const color = colors[index] || colors[0];

              return (
                <StockCard
                  key={symbol}
                  symbol={symbol}
                  data={card}
                  color={color}
                  onPressHeadline={() => {
                    const news = newsBySymbol[symbol];
                    if (news && news.length > 0) Linking.openURL(news[0].url);
                  }}
                />
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Portfolio Growth */}
      <Animated.View entering={FadeInUp.duration(380)}>
        <MonthlyMix stocks={Object.values(stockMap).filter((s): s is StockCardData => !!s)} />
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  stockCardsContainer: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  errorText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
});
