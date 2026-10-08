<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/notification_push/{module.json,server/notifications-push-subscribe.route.ts,server/providers/}
  3. phases/README.md (§Locked decisions K2)
  4. phases/notifications/README.md (N1–N3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 8 — Push notifications

**Goal:** A signed-in device receives push notifications for the tenants it holds a token pair for, can opt out per category, and stops receiving them after sign-out.

Module: `notification_push` (with `notification`, `user_preferences`). Priority 1. **Blocked on a server change (N1).**

## 8.1 Server option (owner decision needed)

The subscribe route validates `{endpoint: url, keys: {p256dh, auth}}` and the channel sends through providers under the `push:provider` extension point. Options:

| Option | Server work | Client work |
|---|---|---|
| **A. Expo provider** (recommended) | Add an Expo push provider and accept `{provider: 'expo', token}` on the subscribe route | `expo-notifications` → `getExpoPushTokenAsync` |
| B. FCM + APNs direct | Add FCM provider (FCM can carry APNs) | `getDevicePushTokenAsync`, own credentials per platform |
| C. Web Push from the app | None | Not possible on native without a WebView service worker — **rejected** |

- [ ] Owner picks A or B; the server change is written in next-boilerplate (it is not touched from this repo, so it is done and deployed by the owner, as for K4).
- [ ] Record the chosen body shape here before 8.2 starts. Until then this phase stays 🔴.

## 8.2 Client registration

- [ ] Add `expo-notifications` (and `expo-device` is already present). Config plugin + Android notification channel + iOS permission string in `app.config.ts`.
- [ ] `libs/push.ts`: request permission **after sign-in, in context** (not at launch); obtain token; `registerPush(tenantId)` / `unregisterPush(tenantId)`.
- [ ] `services/user/push.service.client.ts` + `push.dto.ts` (K6): `POST/DELETE /notifications/push/subscribe` (DELETE accepts `?endpoint=`; without it the server removes every subscription of the user in that tenant).
- [ ] Register on login and tenant activation; re-register when the token rotates; keep the registered token per tenant in MMKV (not SecureStore — it is not a secret).
- [ ] `logout` and `flush()` call `unregisterPush` for **every** `knownTenantIds` entry **before** the tokens are deleted (the request needs the bearer token).
- [ ] Foreground handler shows a toast (`sonner-native`); tap handler routes via `expo-router` using a `data.route` field.

## 8.3 Preferences

- [ ] Settings screen "Notifications": per-category and channel opt-ins from `user_preferences` (`GET/PUT /auth/me/preferences`, already in the service); quiet hours if the server exposes them (verify in `modules/notification`).
- [ ] If the OS permission is denied, show the system-settings deep link instead of a dead switch.

## Files touched / created

- New: `libs/push.ts`, `services/user/push.{dto,service.client}.ts`, `app/(drawer)/settings/notifications.tsx`
- Changed: `app.config.ts`, `stores/authStore.ts` (logout), `stores/tenantStore.ts` (`flush`), `libs/tenantSwitch.ts`, `locales/*.json`, `package.json`
- Test: register/unregister per tenant, cleanup order on logout, permission-denied state

## Reuse

- `knownTenantIds` (Phase 2/5) for cleanup; `libs/axios.ts` tenant addressing; MMKV stores; toast via `sonner-native`.

## Acceptance criteria

- A push sent from the server to a user reaches the device in the foreground and background (physical device; push does not work on simulators for APNs).
- After `logout`, no push arrives for any tenant the device had registered.
- Denying the permission does not break the app and shows the settings link.
- No token is written to logs (`libs/logger` redaction).
- `npm run registry:snapshot` is up to date.

## Risks

- **Server change not deployed** — the phase cannot be verified; keep the 🔴 marker honest.
- **Orphaned subscriptions.** If `unregisterPush` runs after the tokens are cleared, it 401s and the server keeps pushing to a signed-out device. Order matters; add a test.
- **Expo Go limits.** Remote push needs a development build on SDK 57; Expo Go is not enough.
- **Permission prompt timing.** Asking at first launch tanks the grant rate; ask after the first meaningful action.
