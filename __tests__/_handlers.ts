import { http, HttpResponse } from "msw";

// ============================================================================
// MSW API Handlers for Testing
// ============================================================================

export const handlers = [
  http.post("*/api/system/auth/login", () => {
    return HttpResponse.json({
      user: {
        userId: "user-1",
        email: "admin@admin.com",
        name: "Admin User",
        userRole: "USER",
      },
      userSecurity: {
        totpEnabled: false,
        otpMethods: [],
        passkeyCount: 0,
        otpVerifyNeeded: false,
      },
    });
  }),

  http.get("*/api/system/auth/session", () => {
    return HttpResponse.json({
      user: {
        userId: "user-1",
        email: "admin@admin.com",
        name: "Admin User",
        userRole: "USER",
      },
    });
  }),

  http.post("*/api/system/auth/logout", () => {
    return HttpResponse.json({ success: true });
  }),

  http.get("*/api/system/auth/me/tenants", () => {
    return HttpResponse.json({
      tenants: [
        {
          tenantMemberId: "member-1",
          tenantId: "tenant-1",
          userId: "user-1",
          memberRole: "ADMIN",
          memberStatus: "ACTIVE",
          tenant: {
            tenantId: "tenant-1",
            name: "Test Workspace",
            tenantStatus: "ACTIVE",
            domains: [],
          },
        },
      ],
      invitations: [],
    });
  }),

  http.get("*/api/system/auth/sessions", () => {
    return HttpResponse.json({
      sessions: [
        {
          sessionId: "session-1",
          userId: "user-1",
          device: "iPhone 15",
          platform: "iOS",
          ip: "127.0.0.1",
          isCurrentSession: true,
        },
      ],
    });
  }),

  http.get("*/api/system/notifications", () => {
    return HttpResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      hasNext: false,
    });
  }),
];
