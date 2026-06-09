import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useTheme } from "@/libs/theme/ThemeContext";

export type SkeletonCardProps = {
  style?: object;
};

export function SkeletonCard({ style }: SkeletonCardProps) {
  const { tokens: t } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.surfaceRaised,
          padding: 16,
        },
        style,
      ]}
    >
      <Animated.View style={{ opacity }}>
        <View style={{ height: 16, width: "50%", borderRadius: 6, backgroundColor: t.surfaceOverlay }} />
        <View style={{ height: 12, width: "100%", borderRadius: 6, backgroundColor: t.surfaceOverlay, marginTop: 12 }} />
        <View style={{ height: 12, width: "83%", borderRadius: 6, backgroundColor: t.surfaceOverlay, marginTop: 8 }} />
      </Animated.View>
    </View>
  );
}
