import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { TenantClientService } from "@/services/tenant.service.client";
import { handleApiError } from "@/libs/errorUtils";

export default function CreateTenantScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Workspace name must be at least 2 characters");
      return;
    }

    setLoading(true);
    try {
      await TenantClientService.createTenant({
        name: trimmedName,
        description: description.trim() || null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Workspace created successfully");
      router.replace("/select-tenant");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "CreateTenantScreen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerClassName="px-6 pt-12 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Text className="text-orange-500 font-medium">← Back</Text>
      </TouchableOpacity>

      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Create Workspace
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-8">
        Set up a new workspace for your team
      </Text>

      <View className="mb-5">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Workspace Name *
        </Text>
        <TextInput
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
          value={name}
          onChangeText={setName}
          placeholder="My Company"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
        />
        <Text className="text-xs text-gray-400 mt-1">Minimum 2 characters</Text>
      </View>

      <View className="mb-8">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </Text>
        <TextInput
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
        />
      </View>

      <TouchableOpacity
        className={`rounded-xl py-4 items-center ${
          loading || name.trim().length < 2 ? "bg-orange-300" : "bg-orange-500"
        }`}
        onPress={handleCreate}
        disabled={loading || name.trim().length < 2}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-semibold text-base">Create Workspace</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
