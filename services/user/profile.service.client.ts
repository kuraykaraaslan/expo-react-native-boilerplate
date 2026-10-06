import axiosInstance from "@/libs/axios";
import {
  PreferencesResponseSchema,
  UpdatePreferencesRequest,
  UpdatePreferencesRequestSchema,
  UserPreferences,
} from "@/services/user/preferences.dto";
import {
  ProfileResponseSchema,
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
  UserProfile,
} from "@/services/user/profile.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class ProfileClientService {
  static async getProfile(): Promise<UserProfile | null> {
    const res = await axiosInstance.get("/auth/me/profile");
    return ProfileResponseSchema.parse(res.data).userProfile ?? null;
  }

  static async updateProfile(payload: UpdateProfileRequest): Promise<UserProfile | null> {
    const body = UpdateProfileRequestSchema.parse(payload);
    const res = await axiosInstance.put("/auth/me/profile", { userProfile: body });
    return ProfileResponseSchema.parse(res.data).userProfile ?? null;
  }

  /** Language, theme and the other locale / notification preferences (not on SafeUser). */
  static async getPreferences(): Promise<UserPreferences> {
    const res = await axiosInstance.get("/auth/me/preferences");
    return PreferencesResponseSchema.parse(res.data).userPreferences;
  }

  /** Absent or null fields are left unchanged by the server. */
  static async updatePreferences(patch: UpdatePreferencesRequest): Promise<UserPreferences> {
    const body = UpdatePreferencesRequestSchema.parse(patch);
    const res = await axiosInstance.put("/auth/me/preferences", { userPreferences: body });
    return PreferencesResponseSchema.parse(res.data).userPreferences;
  }
}
