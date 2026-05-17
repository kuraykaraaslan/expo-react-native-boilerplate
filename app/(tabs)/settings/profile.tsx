import { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { ProfileClientService } from "@/services/profile.service.client";
import { extractErrorMessage } from "@/dto/common.dto";
import type { UpdateProfileRequest } from "@/dto/profile.dto";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpdateProfileRequest>({
    name: null,
    biography: null,
    profilePicture: null,
    headerImage: null,
    socialLinks: [],
  });

  useEffect(() => {
    ProfileClientService.getProfile()
      .then((profile) => {
        if (profile) {
          setForm({
            name: profile.name ?? null,
            biography: profile.biography ?? null,
            profilePicture: profile.profilePicture ?? null,
            headerImage: profile.headerImage ?? null,
            socialLinks: profile.socialLinks ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await ProfileClientService.updateProfile(form);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Profile updated successfully");
      router.back();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerClassName="p-4 pb-8">
      <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Personal Info
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</Text>
          <TextInput
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
            value={form.name ?? ""}
            onChangeText={(text) => setForm((f) => ({ ...f, name: text || null }))}
            placeholder="Your full name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mb-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biography</Text>
          <TextInput
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
            value={form.biography ?? ""}
            onChangeText={(text) => setForm((f) => ({ ...f, biography: text || null }))}
            placeholder="Tell us about yourself"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </View>
      </View>

      <TouchableOpacity
        className={`rounded-xl py-4 items-center ${saving ? "bg-orange-300" : "bg-orange-500"}`}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-semibold text-base">Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
