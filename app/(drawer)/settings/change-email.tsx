import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/auth.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { ChangeEmailRequestSchema } from "@/dto/auth.dto";

export default function ChangeEmailScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const result = ChangeEmailRequestSchema.safeParse({ newEmail: email });
    if (!result.success) {
      setEmailError(t("AUTH.EMAIL_INVALID"));
      return;
    }
    setEmailError(undefined);
    setLoading(true);
    try {
      await AuthClientService.changeEmail(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Verification email sent. Check your inbox.");
      setEmail("");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "ChangeEmailScreen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      contentContainerClassName="px-4 py-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enter your new email address. We'll send a verification link to confirm the change.
      </Text>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        New {t("AUTH.EMAIL")}
      </Text>
      <TextInput
        className={`w-full border rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-1 ${
          emailError
            ? "border-red-400 dark:border-red-500"
            : "border-gray-300 dark:border-gray-600"
        }`}
        placeholder="new@example.com"
        value={email}
        onChangeText={(v) => { setEmail(v); setEmailError(undefined); }}
        keyboardType="email-address"
        autoCapitalize="none"
        accessible
        accessibilityLabel="New email address"
      />
      {emailError && (
        <Text className="text-red-500 text-xs mb-3">{emailError}</Text>
      )}
      <TouchableOpacity
        className={`w-full rounded-lg py-4 items-center mt-4 ${loading ? "bg-orange-300" : "bg-orange-500"}`}
        onPress={handleSubmit}
        disabled={loading}
        accessible
        accessibilityLabel="Save new email"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold">{loading ? "Saving..." : t("PROFILE.SAVE")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
