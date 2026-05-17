import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";

export default function ChangeEmailScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    try {
      await AuthClientService.changeEmail({ newEmail: email });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Verification email sent. Check your inbox.");
      setEmail("");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(extractErrorMessage(err));
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
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Email</Text>
      <TextInput
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-6"
        placeholder="new@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessible
        accessibilityLabel="New email address"
      />
      <TouchableOpacity
        className={`w-full rounded-lg py-4 items-center ${loading ? "bg-orange-300" : "bg-orange-500"}`}
        onPress={handleSubmit}
        disabled={loading}
        accessible
        accessibilityLabel="Save new email"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold">{loading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
