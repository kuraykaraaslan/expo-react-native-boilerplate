import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "@/stores/authStore";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";
import type { OTPMethod } from "@/dto/auth.dto";

export default function TFAScreen() {
  const [method, setMethod] = useState<OTPMethod>("EMAIL");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSend() {
    setLoading(true);
    try {
      await AuthClientService.sendOTP(method);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.success(`OTP sent via ${method.toLowerCase()}`);
      setOtpSent(true);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    try {
      const user = await AuthClientService.verifyOTP(code, method);
      setUser(user);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/select-tenant");
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
          Two-Factor Auth
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Verify your identity
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Choose method
        </Text>
        <View className="flex-row gap-3 mb-6">
          {(["EMAIL", "SMS"] as OTPMethod[]).map((m) => (
            <TouchableOpacity
              key={m}
              className={`flex-1 py-3 rounded-lg border items-center ${
                method === m
                  ? "bg-orange-500 border-orange-500"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              }`}
              onPress={() => setMethod(m)}
              accessible
              accessibilityLabel={`OTP method: ${m}`}
            >
              <Text className={`font-medium text-sm ${method === m ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!otpSent ? (
          <TouchableOpacity
            className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
            onPress={handleSend}
            disabled={loading}
            accessible
            accessibilityLabel="Send OTP"
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold text-base">
              {loading ? "Sending..." : "Send Code"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Verification Code
            </Text>
            <TextInput
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-6 text-center text-xl tracking-widest"
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              accessible
              accessibilityLabel="OTP code"
            />
            <TouchableOpacity
              className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
              onPress={handleVerify}
              disabled={loading}
              accessible
              accessibilityLabel="Verify code"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? "Verifying..." : "Verify"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-3 items-center"
              onPress={() => setOtpSent(false)}
              accessible
              accessibilityLabel="Resend code"
            >
              <Text className="text-orange-500 text-sm">Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}
