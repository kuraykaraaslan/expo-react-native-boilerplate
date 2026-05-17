import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await AuthClientService.forgotPassword({ email });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Password reset email sent. Check your inbox.");
      setSent(true);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(extractErrorMessage(err));
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
          Reset Password
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          {sent
            ? "Check your email for the reset link."
            : "Enter your email to receive a reset link."}
        </Text>

        {!sent && (
          <>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</Text>
            <TextInput
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-6"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessible
              accessibilityLabel="Email address"
            />
            <TouchableOpacity
              className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
              onPress={handleSend}
              disabled={loading}
              accessible
              accessibilityLabel="Send reset email"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? "Sending..." : "Send Reset Link"}
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
