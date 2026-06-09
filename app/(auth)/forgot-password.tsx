import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link } from "expo-router";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/auth.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { ForgotPasswordRequestSchema } from "@/dto/auth.dto";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    const result = ForgotPasswordRequestSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(t("AUTH.EMAIL_INVALID"));
      return;
    }
    setEmailError(undefined);
    setLoading(true);
    try {
      await AuthClientService.forgotPassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t("AUTH.RESET_LINK_SENT"));
      setSent(true);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "ForgotPasswordScreen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerClassName="flex-grow items-center justify-center px-6 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
          {t("AUTH.RESET_PASSWORD")}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          {sent
            ? "Check your email for the reset link."
            : "Enter your email to receive a reset link."}
        </Text>

        {!sent && (
          <>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("AUTH.EMAIL")}
            </Text>
            <TextInput
              className={`w-full border rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-1 ${
                emailError
                  ? "border-red-400 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(undefined); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessible
              accessibilityLabel="Email address"
            />
            {emailError && (
              <Text className="text-red-500 text-xs mb-3">{emailError}</Text>
            )}
            <TouchableOpacity
              className={`w-full rounded-lg py-4 items-center mt-4 ${loading ? "bg-orange-300" : "bg-orange-500"}`}
              onPress={handleSend}
              disabled={loading}
              accessible
              accessibilityLabel="Send reset email"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? "Sending..." : t("AUTH.SEND_RESET_LINK")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Link href="/login" asChild>
          <TouchableOpacity className="mt-6 items-center" accessible accessibilityLabel="Back to login">
            <Text className="text-orange-500 text-sm">Back to Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
