import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      await AuthClientService.register({ email, password, name });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Account created! Please log in.");
      router.replace("/login");
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
          Create account
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Join us today
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</Text>
        <TextInput
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-4"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          accessible
          accessibilityLabel="Full name"
        />

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
          autoComplete="new-password"
          accessible
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
          onPress={handleRegister}
          disabled={loading}
          accessible
          accessibilityLabel="Create account"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <Link href="/login" asChild>
          <TouchableOpacity className="mt-4 items-center" accessible accessibilityLabel="Back to login">
            <Text className="text-orange-500 text-sm">Already have an account? Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
