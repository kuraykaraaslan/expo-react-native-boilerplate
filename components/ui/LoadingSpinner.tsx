import { View, ActivityIndicator, Text } from "react-native";
import { cn } from "@/utils/cn";

// ============================================================================
// LoadingSpinner Component
// ============================================================================

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "large",
  color = "#f4511e",
  label,
  className,
}: LoadingSpinnerProps) {
  return (
    <View
      className={cn("items-center justify-center", className)}
      accessible
      accessibilityLabel={label ?? "Loading"}
      accessibilityRole="progressbar"
      aria-busy
    >
      <ActivityIndicator size={size} color={color} />
      {label && (
        <Text className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
          {label}
        </Text>
      )}
    </View>
  );
}
