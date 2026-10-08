// ============================================================================
// The tenant settings this app edits (A3: an explicit allowlist, never a raw
// key/value editor). Keys and defaults mirror next-boilerplate's field files:
//   tenant_member/server/tenant_member.settings.fields.ts
//   tenant_setting/server/tenant_setting.localization.fields.ts
// The server stores every value as a string; booleans are 'true' | 'false'.
// ============================================================================

export const TENANT_SETTING_KEYS = ["defaultMemberRole", "tenantMemberDualControl", "defaultLanguage"] as const;
export type TenantSettingKey = (typeof TENANT_SETTING_KEYS)[number];
export type TenantSettingsDraft = Record<TenantSettingKey, string>;

export const TENANT_SETTING_DEFAULTS: TenantSettingsDraft = {
  defaultMemberRole: "USER",
  tenantMemberDualControl: "false",
  defaultLanguage: "en",
};

/** OWNER is deliberately absent: defaulting new members to owner is unsafe (server rule). */
export const DEFAULT_MEMBER_ROLES = ["USER", "ADMIN"] as const;

/** The allowlisted values of a `GET /settings` answer, with the server's defaults for keys that were never set. */
export function pickSettings(all: Record<string, string>): TenantSettingsDraft {
  const out = { ...TENANT_SETTING_DEFAULTS };
  for (const key of TENANT_SETTING_KEYS) {
    const value = all[key];
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}

/** Only what changed — the POST must not rewrite untouched keys (and gated keys queue approvals). */
export function changedSettings(saved: TenantSettingsDraft, draft: TenantSettingsDraft): Partial<TenantSettingsDraft> {
  const diff: Partial<TenantSettingsDraft> = {};
  for (const key of TENANT_SETTING_KEYS) if (draft[key] !== saved[key]) diff[key] = draft[key];
  return diff;
}
