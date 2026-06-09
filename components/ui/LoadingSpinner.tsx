import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "@/libs/theme/ThemeContext";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "large",
  color,
  label,
  className,
}: LoadingSpinnerProps) {
  const { tokens: t } = useTheme();

  return (
    <View
      className={className ?? "items-center justify-center"}
      accessible
      accessibilityLabel={label ?? "Loading"}
      accessibilityRole="progressbar"
      aria-busy
    >
      <ActivityIndicator size={size} color={color ?? t.primary} />
      {label && (
        <Text className="mt-2 text-sm" style={{ color: t.textSecondary }}>
          {label}
        </Text>
      )}
    </View>
  );
}
