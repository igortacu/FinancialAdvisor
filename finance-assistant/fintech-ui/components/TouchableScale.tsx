import React from "react";
import { Pressable, PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const APressable = Animated.createAnimatedComponent(Pressable);

export default function TouchableScale(
  props: PressableProps & { onPress?: () => void },
) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(
    () => ({ transform: [{ scale: s.value }] }),
    [],
  );
  return (
    <APressable
      {...props}
      onPressIn={() => (s.value = withSpring(0.97, { damping: 20 }))}
      onPressOut={() => (s.value = withSpring(1))}
      onPress={() => {
        Haptics.selectionAsync();
        props.onPress?.();
      }}
      style={[props.style, anim]}
    />
  );
}
