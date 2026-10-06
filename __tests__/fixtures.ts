// ============================================================================
// Server-shaped JSON for the tests.
// Every object is what next-boilerplate really answers (route handlers + the
// Safe* schemas, read from its source), including the fields this app does not
// model — `.parse()` has to cope with those. Dates are ISO strings, as JSON.
// ============================================================================

export const TENANT_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000a1";
export const OTHER_TENANT_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000b2";
export const USER_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000c3";
export const SESSION_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000d4";
export const MEMBER_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000e5";

const NOW = "2026-10-06T10:00:00.000Z";

/** A JWT-shaped string whose payload the app can read (the signature is junk). */
export function makeJwt(payload: Record<string, unknown>): string {
  // UTF-8 → base64url without Node's Buffer (tsconfig only loads the jest types).
  const b64url = (o: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.signature`;
}

export const userProfileJson = {
  name: "Ayşe Yılmaz",
  firstName: "Ayşe",
  lastName: "Yılmaz",
  displayName: null,
  nameOrder: "GIVEN_FIRST",
  pronouns: null,
  biography: "Product designer.",
  profilePicture: null,
  headerImage: null,
  socialLinks: [{ id: "6f1c2a3b-4d5e-4f60-8a7b-0000000000f6", platform: "GITLAB", url: "https://gitlab.com/ayse", order: 0 }],
  visibility: "PUBLIC",
  fieldVisibility: {},
  isVerified: false,
  verificationStatus: "UNVERIFIED",
  customFields: {},
  anonymizedAt: null,
};

/** SafeUser (login) — no name / image / language / theme. */
export const safeUserJson = {
  userId: USER_ID,
  email: "ayse@example.com",
  phone: null,
  userRole: "USER",
  userStatus: "ACTIVE",
  emailVerifiedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  userProfile: userProfileJson,
};

/** SafeUserSecurity. */
export const userSecurityJson = {
  otpMethods: ["EMAIL"],
  lastLoginAt: NOW,
  lastLoginIp: "203.0.113.7",
  lastLoginDevice: "Pixel 8",
  failedLoginAttempts: 0,
  lockedUntil: null,
  passkeyEnabled: false,
  trustedDevices: [{ idHash: "abc123", label: null, createdAt: NOW, lastSeenAt: null, expiresAt: NOW }],
  passwordChangedAt: null,
  mustChangePassword: false,
};

export const tenantJson = {
  tenantId: TENANT_ID,
  name: "Acme Studio",
  description: "Product design & engineering",
  tenantStatus: "ACTIVE",
  domains: [
    // Raw entity rows: more columns than the app models.
    { tenantDomainId: "d1", tenantId: TENANT_ID, domain: "acme.example.com", isPrimary: true, domainStatus: "VERIFIED", sslStatus: "ACTIVE", createdAt: NOW },
  ],
};

/** POST /auth/device/login — the nine fields. */
export const deviceLoginJson = {
  accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: TENANT_ID }),
  refreshToken: "refresh-1",
  otpRequired: false,
  user: safeUserJson,
  tenant: { tenantId: TENANT_ID, name: "Acme Studio" },
  tenantMember: { memberRole: "OWNER" },
  userSecurity: userSecurityJson,
  mustChangePassword: false,
  passwordExpiresInDays: 12,
};

/** GET /auth/session — a slim user, plus tenant and membership. */
export const sessionJson = {
  success: true,
  user: { userId: USER_ID, email: "ayse@example.com", userRole: "USER" },
  tenant: { tenantId: TENANT_ID, name: "Acme Studio", description: "Product design & engineering", tenantStatus: "ACTIVE" },
  tenantMember: { tenantMemberId: MEMBER_ID, memberRole: "OWNER", memberStatus: "ACTIVE" },
  message: "SESSION_RETRIEVED_SUCCESSFULLY",
};

/** GET /auth/me/sessions — includes a session of another organization. */
export const sessionsJson = {
  sessions: [
    {
      userSessionId: SESSION_ID,
      userId: USER_ID,
      tenantId: TENANT_ID,
      userAgent: "okhttp/4.12",
      ipAddress: "203.0.113.7",
      sessionStatus: "ACTIVE",
      otpVerifyNeeded: false,
      sessionExpiry: "2026-10-13T10:00:00.000Z",
      createdAt: NOW,
      updatedAt: NOW,
      metadata: {
        geo: { city: "Istanbul", state: null, country: "Türkiye", countryCode: "TR" },
        rememberMe: true,
        device: { type: "phone", brand: "Google", model: "Pixel 8", os: "Android", osVersion: "16", appVersion: "1.0.0" },
        someFutureKey: 1,
      },
    },
    {
      userSessionId: "6f1c2a3b-4d5e-4f60-8a7b-000000000107",
      userId: USER_ID,
      tenantId: OTHER_TENANT_ID,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140",
      ipAddress: null,
      sessionStatus: "ACTIVE",
      otpVerifyNeeded: null,
      sessionExpiry: "2026-10-13T10:00:00.000Z",
      createdAt: NOW,
      updatedAt: null,
      metadata: null,
    },
  ],
};

export const preferencesJson = {
  theme: "SYSTEM",
  language: "tr",
  currency: "TRY",
  numberFormat: "COMMA_DOT",
  measurementSystem: "METRIC",
  timezone: "Europe/Istanbul",
  dateFormat: "DD_MM_YYYY",
  timeFormat: "H24",
  firstDayOfWeek: "MON",
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  newsletter: true,
  productUpdates: true,
  promotionalOffers: false,
  newsletterConsentAt: null,
  marketingConsentAt: null,
  schemaVersion: 2,
};

export const notificationsJson = {
  notifications: [
    {
      notificationId: "6f1c2a3b-4d5e-4f60-8a7b-000000000201",
      title: "Welcome",
      message: "You joined Acme Studio.",
      path: null,
      type: "system",
      action: { label: "Open", url: "/admin" },
      expiresAt: null,
      isRead: false,
      createdAt: NOW,
    },
    { notificationId: "6f1c2a3b-4d5e-4f60-8a7b-000000000202", title: "Old", message: "Read already.", isRead: true, createdAt: NOW },
  ],
};

/**
 * GET /auth/me/tenants. Memberships have NO top-level tenantId / userId; the
 * key is `invitations` (the handler's variable is called pendingInvitations,
 * the JSON key is not); delegatedTenants is always [] for now.
 */
export const meTenantsJson = {
  success: true,
  tenants: [
    { tenantMemberId: MEMBER_ID, memberRole: "OWNER", memberStatus: "ACTIVE", tenant: tenantJson },
    {
      tenantMemberId: "6f1c2a3b-4d5e-4f60-8a7b-000000000308",
      memberRole: "USER",
      memberStatus: "ACTIVE",
      tenant: { tenantId: OTHER_TENANT_ID, name: "Side Project", description: null, tenantStatus: "INACTIVE", domains: [] },
    },
  ],
  delegatedTenants: [],
  invitations: [
    {
      invitationId: "6f1c2a3b-4d5e-4f60-8a7b-000000000409",
      tenantId: OTHER_TENANT_ID,
      memberRole: "ADMIN",
      status: "PENDING",
      expiresAt: "2026-10-20T10:00:00.000Z",
      createdAt: NOW,
      tenant: { tenantId: OTHER_TENANT_ID, name: "Side Project", description: null, tenantStatus: "ACTIVE" },
    },
  ],
};

const memberUser = (userId: string, email: string, name: string) => ({ ...safeUserJson, userId, email, userProfile: { ...userProfileJson, name } });

/** GET /members — `page` is 0-based. */
export const membersJson = {
  members: [
    {
      tenantMemberId: MEMBER_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
      memberRole: "OWNER",
      roleKeys: [],
      memberStatus: "ACTIVE",
      externalId: null,
      sessionVersion: 0,
      suspensionReason: null,
      suspendedUntil: null,
      lastActiveAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      user: memberUser(USER_ID, "ayse@example.com", "Ayşe Yılmaz"),
    },
    {
      tenantMemberId: "6f1c2a3b-4d5e-4f60-8a7b-00000000050a",
      tenantId: TENANT_ID,
      userId: "6f1c2a3b-4d5e-4f60-8a7b-00000000060b",
      memberRole: "USER",
      roleKeys: ["support"],
      memberStatus: "SUSPENDED",
      createdAt: NOW,
      updatedAt: NOW,
      user: memberUser("6f1c2a3b-4d5e-4f60-8a7b-00000000060b", "can@example.com", "Can Öztürk"),
    },
  ],
  total: 2,
  page: 0,
  pageSize: 10,
};

/** GET /invitations — `page` is 1-based; SafeTenantInvitation (no token). */
export const invitationsJson = {
  invitations: [
    {
      invitationId: "6f1c2a3b-4d5e-4f60-8a7b-00000000070c",
      tenantId: TENANT_ID,
      email: "zeynep@example.com",
      invitedByUserId: USER_ID,
      memberRole: "USER",
      status: "PENDING",
      expiresAt: "2026-10-13T10:00:00.000Z",
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 10,
};
