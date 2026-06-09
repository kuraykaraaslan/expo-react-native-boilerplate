import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/auth.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { RegisterRequestSchema } from "@/dto/auth.dto";

type FieldErrors = { name?: string; email?: string; password?: string };

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleRegister() {
    const result = RegisterRequestSchema.safeParse({ email, password, name });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errs.email ? t("AUTH.EMAIL_INVALID") : undefined,
        password: errs.password ? t("AUTH.PASSWORD_MIN_LENGTH") : undefined,
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await AuthClientService.register(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t("AUTH.REGISTER_SUCCESS"));
      router.replace("/login");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "RegisterScreen");
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
          Create account
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Join us today
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </Text>
        <TextInput
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-4"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          accessible
          accessibilityLabel="Full name"
        />

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
          autoComplete="new-password"
          accessible
          accessibilityLabel="Password"
        />
        {fieldErrors.password && (
          <Text className="text-red-500 text-xs mb-3">{fieldErrors.password}</Text>
        )}

        <TouchableOpacity
          className={`w-full rounded-lg py-4 items-center mt-4 ${loading ? "bg-orange-300" : "bg-orange-500"}`}
          onPress={handleRegister}
          disabled={loading}
          accessible
          accessibilityLabel="Create account"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Creating..." : t("AUTH.REGISTER")}
          </Text>
        </TouchableOpacity>

        <Link href="/login" asChild>
          <TouchableOpacity className="mt-4 items-center" accessible accessibilityLabel="Back to login">
            <Text className="text-orange-500 text-sm">{t("AUTH.HAVE_ACCOUNT")} {t("AUTH.LOGIN_NOW")}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
