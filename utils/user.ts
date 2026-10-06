import type { SafeUser } from "@/services/auth/auth.dto";

// SafeUser has no `name` / `image`: the display name and picture live under
// `userProfile` (next-boilerplate user_profile).

type UserLike = Pick<SafeUser, "email" | "userProfile"> | null | undefined;

/** Best human label for a user: display name, then name, then the e-mail address. */
export function getUserDisplayName(user: UserLike): string {
  const profile = user?.userProfile;
  return profile?.displayName?.trim() || profile?.name?.trim() || user?.email || "";
}

export function getUserAvatarUrl(user: UserLike): string | undefined {
  return user?.userProfile?.profilePicture || undefined;
}
