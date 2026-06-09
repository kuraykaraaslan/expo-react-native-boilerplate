import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "@/stores/authStore";
import { AuthClientService } from "@/services/auth.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { LoginRequestSchema } from "@/dto/auth.dto";

type FieldErrors = { email?: string; password?: string };

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogin() {
    const result = LoginRequestSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errs.email ? t("AUTH.EMAIL_INVALID") : undefined,
        password: errs.password ? t("AUTH.PASSWORD_REQUIRED") : undefined,
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { user, userSecurity } = await AuthClientService.login(result.data);
      if (userSecurity?.otpVerifyNeeded) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/2fa");
        return;
      }
      setUser(user);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/select-tenant");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "LoginScreen");
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
          Welcome back
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Sign in to your account
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("AUTH.EMAIL")}
        </Text>
        <TextInput
          className={`w-full border rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-1 ${
            fieldErrors.email
              ? "border-red-400 dark:border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="you@example.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, email: undefined })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessible
          accessibilityLabel="Email address"
        />
        {fieldErrors.email && (
          <Text className="text-red-500 text-xs mb-3">{fieldErrors.email}</Text>
        )}

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-3">
          {t("AUTH.PASSWORD")}
        </Text>
        <TextInput
          className={`w-full border rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-1 ${
            fieldErrors.password
              ? "border-red-400 dark:border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="••••••••"
          value={password}
          onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: undefined })); }}
          secureTextEntry
          autoComplete="password"
          accessible
          accessibilityLabel="Password"
        />
        {fieldErrors.password && (
          <Text className="text-red-500 text-xs mb-3">{fieldErrors.password}</Text>
        )}

        <TouchableOpacity
          className={`w-full rounded-lg py-4 items-center mt-4 ${loading ? "bg-orange-300" : "bg-orange-500"}`}
          onPress={handleLogin}
          disabled={loading}
          accessible
          accessibilityLabel="Sign in"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Signing in..." : t("AUTH.LOGIN")}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between mt-4">
          <Link href="/forgot-password" asChild>
            <TouchableOpacity accessible accessibilityLabel="Forgot password">
              <Text className="text-orange-500 text-sm">{t("AUTH.FORGOT_PASSWORD")}</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/register" asChild>
            <TouchableOpacity accessible accessibilityLabel="Create account">
              <Text className="text-orange-500 text-sm">{t("AUTH.REGISTER_NOW")}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
