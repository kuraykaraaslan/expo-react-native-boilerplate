import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faGoogle, faApple, faGithub, faLinkedin, faFacebook } from "@fortawesome/free-brands-svg-icons";

// ============================================================================
// SSO Buttons Component
// ============================================================================

interface SSOProvider {
  key: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}

const SSO_PROVIDERS: SSOProvider[] = [
  { key: "google", label: "Google", icon: faGoogle, color: "#ea4335", bgColor: "bg-red-50 dark:bg-red-900/20" },
  { key: "apple", label: "Apple", icon: faApple, color: "#000000", bgColor: "bg-gray-50 dark:bg-gray-800" },
  { key: "github", label: "GitHub", icon: faGithub, color: "#333333", bgColor: "bg-gray-50 dark:bg-gray-800" },
  { key: "linkedin", label: "LinkedIn", icon: faLinkedin, color: "#0a66c2", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
];

interface SSOButtonsProps {
  onPress?: (provider: string) => void;
}

export function SSOButtons({ onPress }: SSOButtonsProps) {
  return (
    <View>
      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <Text className="mx-3 text-gray-400 dark:text-gray-500 text-sm">or continue with</Text>
        <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </View>

      <View className="flex-row justify-center gap-3">
        {SSO_PROVIDERS.map((provider) => (
          <TouchableOpacity
            key={provider.key}
            className={`w-12 h-12 rounded-xl items-center justify-center border border-gray-200 dark:border-gray-700 ${provider.bgColor}`}
            onPress={() => onPress?.(provider.key)}
            accessible
            accessibilityLabel={`Sign in with ${provider.label}`}
            accessibilityRole="button"
          >
            <FontAwesomeIcon icon={provider.icon} color={provider.color} size={20} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
