import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "@/stores/authStore";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";

export default function LoginScreen() {
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogin() {
    setLoading(true);
    try {
      const { user, userSecurity } = await AuthClientService.login({ email, password });
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
          Welcome back
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Sign in to your account
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</Text>
        <TextInput
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-4"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessible
          accessibilityLabel="Email address"
        />

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</Text>
        <TextInput
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-6"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          accessible
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
          onPress={handleLogin}
          disabled={loading}
          accessible
          accessibilityLabel="Sign in"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between mt-4">
          <Link href="/forgot-password" asChild>
            <TouchableOpacity accessible accessibilityLabel="Forgot password">
              <Text className="text-orange-500 text-sm">Forgot password?</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/register" asChild>
            <TouchableOpacity accessible accessibilityLabel="Create account">
              <Text className="text-orange-500 text-sm">Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
