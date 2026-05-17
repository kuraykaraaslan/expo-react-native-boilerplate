import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAppStore } from "@/stores/appStore";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import * as Haptics from "expo-haptics";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "it", label: "Italian", native: "Italiano" },
];

export default function ChangeLanguageScreen() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  async function handleSelect(code: string) {
    setLocale(code);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerClassName="px-4 py-6">
      <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {LANGUAGES.map((lang, idx) => (
          <TouchableOpacity
            key={lang.code}
            className={`flex-row items-center px-4 py-4 ${idx < LANGUAGES.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
            onPress={() => handleSelect(lang.code)}
            accessible
            accessibilityLabel={`Select ${lang.label}`}
            accessibilityRole="button"
          >
            <View className="flex-1">
              <Text className="text-gray-900 dark:text-white font-medium">{lang.native}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">{lang.label}</Text>
            </View>
            {locale === lang.code && (
              <FontAwesomeIcon icon={faCheck} color="#f4511e" size={16} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
