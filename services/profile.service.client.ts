import axiosInstance from "@/libs/axios";
import { UserProfile, UserProfileSchema, UpdateProfileRequest } from "@/dto/profile.dto";

export class ProfileClientService {
  static async getProfile(): Promise<UserProfile | null> {
    const res = await axiosInstance.get("/api/system/auth/me/profile");
    const raw = res.data?.userProfile;
    if (!raw) return null;
    return UserProfileSchema.parse(raw);
  }

  static async updateProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
    const res = await axiosInstance.put("/api/system/auth/me/profile", { userProfile: payload });
    return UserProfileSchema.parse(res.data?.userProfile);
  }
}
