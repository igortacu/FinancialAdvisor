import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
// Local type for stock/ticker symbols; adjust if you have a shared type elsewhere
type SymbolKey = string;

type Props = {
  allowedSymbols: SymbolKey[];
  selectedSymbols: SymbolKey[];
  onSelect: (symbol: SymbolKey) => void;
};

function StockSelector({ allowedSymbols, selectedSymbols, onSelect }: Props) {
  return (
    <View style={s.container}>
      {allowedSymbols.map((symbol) => {
        const isActive = selectedSymbols.includes(symbol);
        return (
          <Pressable
            key={symbol}
            onPress={() => onSelect(symbol)}
            style={[s.chip, isActive && s.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Toggle ${symbol}`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[s.text, isActive && s.textActive]}>{symbol}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default React.memo(StockSelector);

const s = StyleSheet.create({
  container: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    backgroundColor: "#EEF4FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#246BFD",
    borderColor: "#1E40AF",
  },
  text: { color: "#1f2937", fontWeight: "700", fontSize: 12 },
  textActive: { color: "#FFFFFF" },
});
