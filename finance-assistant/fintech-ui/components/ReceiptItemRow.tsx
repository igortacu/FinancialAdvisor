import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Item = { name: string; qty: number; price: number };

export default function ReceiptItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: Item;
  onChange: (v: Item) => void;
  onRemove: () => void;
}) {
  return (
    <View style={s.row}>
      <TextInput
        style={[s.input, { flex: 1 }]}
        defaultValue={item.name}
        placeholder="Item"
        onChangeText={(t) => onChange({ ...item, name: t })}
      />
      <TextInput
        style={[s.input, { width: 56, textAlign: "center" }]}
        defaultValue={String(item.qty)}
        keyboardType="numeric"
        onChangeText={(t) => onChange({ ...item, qty: Number(t || 0) })}
      />
      <TextInput
        style={[s.input, { width: 74, textAlign: "right" }]}
        defaultValue={item.price.toFixed(2)}
        keyboardType="decimal-pad"
        onChangeText={(t) => onChange({ ...item, price: Number(t || 0) })}
      />
      <Pressable onPress={onRemove} style={s.remove}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  remove: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
