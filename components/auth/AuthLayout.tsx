import { View, Text, ScrollView, Image } from "react-native";
import { SSOButtons } from "@/components/auth/SSOButtons";

// ============================================================================
// AuthLayout — Wrapper for auth screens
// ============================================================================

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showSSO?: boolean;
  onSSOPress?: (provider: string) => void;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  showSSO = false,
  onSSOPress,
}: AuthLayoutProps) {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerClassName="flex-grow"
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="bg-orange-500 px-6 pt-16 pb-12 items-center">
        <View className="w-16 h-16 rounded-2xl bg-orange-400 items-center justify-center mb-4">
          <Text className="text-white text-2xl font-bold">B</Text>
        </View>
        {title && (
          <Text className="text-white text-2xl font-bold text-center">{title}</Text>
        )}
        {subtitle && (
          <Text className="text-orange-100 text-sm text-center mt-1">{subtitle}</Text>
        )}
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-8 -mt-4 bg-white dark:bg-gray-900 rounded-t-3xl">
        {children}
        {showSSO && (
          <View className="mt-6">
            <SSOButtons onPress={onSSOPress} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
