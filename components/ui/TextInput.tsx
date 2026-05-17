import { View, Text, TextInput as RNTextInput, type TextInputProps } from "react-native";
import { cn } from "@/utils/cn";

// ============================================================================
// TextInput Component
// ============================================================================

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerClassName?: string;
}

export function TextInput({
  label,
  error,
  helper,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <View className={cn("mb-4", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </Text>
      )}
      <RNTextInput
        className={cn(
          "w-full border rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800",
          error
            ? "border-red-500 dark:border-red-400"
            : "border-gray-300 dark:border-gray-600",
          className,
        )}
        placeholderTextColor="#9ca3af"
        accessible
        accessibilityLabel={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${label}-error` : helper ? `${label}-helper` : undefined}
        {...props}
      />
      {error && (
        <Text
          className="text-red-500 dark:text-red-400 text-xs mt-1"
          nativeID={`${label}-error`}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
      {helper && !error && (
        <Text
          className="text-gray-500 dark:text-gray-400 text-xs mt-1"
          nativeID={`${label}-helper`}
        >
          {helper}
        </Text>
      )}
    </View>
  );
}
