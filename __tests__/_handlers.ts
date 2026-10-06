import { http, HttpResponse } from "msw";
import {
  deviceLoginJson,
  invitationsJson,
  meTenantsJson,
  membersJson,
  notificationsJson,
  preferencesJson,
  sessionJson,
  sessionsJson,
  userProfileJson,
  userSecurityJson,
} from "./fixtures";

// ============================================================================
// Default MSW handlers — the server's real answers (see fixtures.ts), under
// /api/tenant/{tenantId}/…, which is where libs/axios addresses every request.
// Tests override single routes with mockRoute() from ./_helpers.
// ============================================================================

const T = "*/api/tenant/:tenantId";
const ack = (message = "OK") => HttpResponse.json({ message });

export const handlers = [
  // auth
  http.post(`${T}/auth/device/login`, () => HttpResponse.json(deviceLoginJson)),
  http.post(`${T}/auth/register`, () =>
    HttpResponse.json(
      { message: "Registration successful", user: { userId: "u2", email: "new@example.com" }, tenant: { tenantId: "t", name: "Acme Studio" } },
      { status: 201 },
    ),
  ),
  http.get(`${T}/auth/session`, () => HttpResponse.json(sessionJson)),
  http.post(`${T}/auth/otp/send`, () => ack("OTP_SENT_SUCCESSFULLY")),
  http.post(`${T}/auth/otp/verify`, () => ack("OTP_VERIFIED_SUCCESSFULLY")),
  http.post(`${T}/auth/forgot-password`, () => ack("FORGOT_PASSWORD_SUCCESSFUL")),
  http.post(`${T}/auth/reset-password`, () => ack("PASSWORD_RESET_SUCCESSFUL")),
  http.post(`${T}/auth/change-password`, () => ack("PASSWORD_RESET_SUCCESSFUL")),
  http.get(`${T}/auth/sso`, () => HttpResponse.json({ providers: ["google", "github"] })),

  // account
  http.get(`${T}/auth/me/sessions`, () => HttpResponse.json(sessionsJson)),
  http.get(`${T}/auth/me/security`, () => HttpResponse.json({ message: "OK", userSecurity: userSecurityJson })),
  http.get(`${T}/auth/me/profile`, () => HttpResponse.json({ userProfile: userProfileJson })),
  http.get(`${T}/auth/me/preferences`, () => HttpResponse.json({ userPreferences: preferencesJson })),
  http.get(`${T}/auth/me/notifications`, () => HttpResponse.json(notificationsJson)),
  http.get(`${T}/auth/me/tenants`, () => HttpResponse.json(meTenantsJson)),

  // tenant
  http.get(`${T}/members`, () => HttpResponse.json(membersJson)),
  http.get(`${T}/invitations`, () => HttpResponse.json(invitationsJson)),
];
