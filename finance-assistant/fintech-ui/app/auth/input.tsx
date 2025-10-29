import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles";
type InputProps = {
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: any;
  secureTextEntry?: boolean;
  textContentType?: any;
  inputHeight?: number;
};

export default function Input(props: InputProps) {
  const { icon, rightIcon, onRightIconPress, placeholder, value, onChangeText, autoCapitalize, keyboardType, secureTextEntry, textContentType, inputHeight = 48 } = props;

  return (
    <View style={[styles.inputWrap, { height: inputHeight }]}>
      <Ionicons name={icon} size={18} color="#93c5fd" style={{ marginRight: 10 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
      />
      {rightIcon ? (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
          <Ionicons name={rightIcon} size={18} color="#93c5fd" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}