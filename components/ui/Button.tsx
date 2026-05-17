import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { cn } from "@/utils/cn";

// ============================================================================
// Button Component
// ============================================================================

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-orange-500 active:bg-orange-600",
  secondary: "bg-gray-200 dark:bg-gray-700 active:bg-gray-300",
  destructive: "bg-red-500 active:bg-red-600",
  ghost: "bg-transparent border border-gray-300 dark:border-gray-600",
};

const textClasses: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-gray-800 dark:text-gray-100",
  destructive: "text-white",
  ghost: "text-gray-700 dark:text-gray-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "py-2 px-4 rounded-lg",
  md: "py-3 px-6 rounded-xl",
  lg: "py-4 px-8 rounded-2xl",
};

const textSizeClasses: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={cn(
        "items-center justify-center flex-row",
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && "opacity-50",
        className,
      )}
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "destructive" ? "#ffffff" : "#f4511e"}
          className="mr-2"
          aria-busy
        />
      )}
      <Text
        className={cn(
          "font-semibold",
          textClasses[variant],
          textSizeClasses[size],
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
