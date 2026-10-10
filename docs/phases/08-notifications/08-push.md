<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/notification_push/{module.json,server/notifications-push-subscribe.route.ts,server/providers/}
  3. docs/phases/README.md (§Locked decisions K2)
  4. docs/phases/08-notifications/README.md (N1–N3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 8 — Push notifications

**Goal:** A signed-in device receives push notifications for the tenants it holds a token pair for, can opt out per category, and stops receiving them after sign-out.

Module: `notification_push` (with `notification`, `user_preferences`). Priority 1. ~~Blocked on a server change (N1)~~ — option A was written in next-boilerplate (uncommitted there as of 2026-10-10); see the dated section at the end.

## 8.1 Server option (owner decision needed)

The subscribe route validates `{endpoint: url, keys: {p256dh, auth}}` and the channel sends through providers under the `push:provider` extension point. Options:

| Option | Server work | Client work |
|---|---|---|
| **A. Expo provider** (recommended) | Add an Expo push provider and accept `{provider: 'expo', token}` on the subscribe route | `expo-notifications` → `getExpoPushTokenAsync` |
| B. FCM + APNs direct | Add FCM provider (FCM can carry APNs) | `getDevicePushTokenAsync`, own credentials per platform |
| C. Web Push from the app | None | Not possible on native without a WebView service worker — **rejected** |

- [x] Owner picks A or B (**A, Expo provider**, 2026-10-10); the server change is written in next-boilerplate (it is not touched from this repo, so it is done and deployed by the owner, as for K4).
- [x] Body shape recorded below (read from the server source, which replaces the `/subscribe` paths named in 8.2 with `/tokens`).

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


---

## ✅ CODED — 2026-10-10 (live verification pending)

Server: option A (Expo provider), read from the UNCOMMITTED working tree of next-boilerplate (`modules/notification_push/server/{notifications-push-tokens.route,notification_push.dto,notification_push.expo,notification_push.subscription.service,notification_push.channel}.ts`, `modules/messaging/server/messaging.notify.ts`).

### What shipped

- `expo-notifications ~57.0.22` (`npx expo install`) and the `expo-notifications` plugin in `app.config.ts` (`defaultChannel: "default"`; no icon asset was invented). `extra.eas.projectId` now comes from `EXPO_PUBLIC_EAS_PROJECT_ID` (alias `EAS_PROJECT_ID`).
- `libs/env.ts`: optional, UUID-validated `EXPO_PUBLIC_EAS_PROJECT_ID` (empty counts as unset). `libs/push.ts` resolves the project id from it, else from `extra.eas.projectId` / `easConfig`, and validates it again; without one push stays off (`no-project-id`), nothing throws.
- `services/user/push.{dto,service.client}.ts`: `POST /notifications/push/tokens` and `DELETE /notifications/push/tokens?deviceId=` (Zod request schemas mirror `RegisterPushTokenDTO` / `UnregisterPushTokenQuery`, including the Expo token regex).
- `stores/pushStore.ts` (MMKV): install id (`deviceId`), the device switch, "prompt answered", and tenantId to last-registered time. **No push token is persisted or logged; nothing goes in a URL but the install id.**
- `libs/push.ts`: `registerPushForTenant(tenantId)` (never prompts; permission, project id, Android channel, `getExpoPushTokenAsync`, POST with that tenant's own bearer pair), `unregisterAllPush()`, `requestPushPermission()`, `pushTargetFor()`.
  - Guarding like `libs/realtime.ts`: registrations run through one queue; `unregisterAllPush()` bumps an epoch synchronously, so a registration that is queued or in flight (token fetch, POST) when someone signs out gives up and never records itself; the unregister runs after any in-flight registration finished.
- `libs/usePushNotifications.ts`, mounted in `app/(drawer)/_layout.tsx` next to `useRealtimeSync`: foreground presentation handler (banner shown, except for the conversation on screen via `getOpenConversation()`), registration of the ACTIVE organization when the shell opens or the active organization changes (per-tenant registration, K2/N2), `addPushTokenListener` re-registration on rotation, tap routing (cold start and live taps, native only; handled once per notification id; waits for the shell to be open).
- `components/notifications/PushPrePrompt.tsx`: our own explanation (`Modal`) BEFORE the one-shot OS prompt, shown 2.5 s after the signed-in shell opens and only while the permission is undetermined and "not now" was not chosen. Never at launch of a signed-out app.
- `app/(drawer)/settings/notifications.tsx` (+ hub tile): switch for this device (on: OS prompt if still undetermined, then register; off: unregister everywhere), denied state with an "Open system settings" link instead of a dead switch, unsupported-device notice, and the account-wide `pushNotifications` preference (`PUT /auth/me/preferences`, rolled back on failure, ignored if the organization changed meanwhile).
- Sign-out and deletion: `logout()` calls `unregisterAllPush()` FIRST, before the per-tenant session revocation and before `clearAllTokens()`. `DeleteAccountModal` calls it before `POST /auth/me/deletion-request` (the deletion revokes every session) and registers again if the deletion is refused. `clearLocalSession()` also clears the registration books. Unregistering covers the active tenant, every `knownTenantIds` entry and every registered tenant that still has an access token, each request with a 4 s timeout and the whole call capped at 8 s; failures are logged (status only) and never block.
- Tests (`__tests__/push.test.ts`, `__tests__/pushScreens.test.tsx`, root `__mocks__/expo-notifications.ts`): 26 + 9 cases — register body and per-tenant bearer, no prompt without permission, disabled/unsupported/signed-out/no project id, sign-out during the token fetch and while queued, unregister for every tenant with its own token, unreachable server, time cap, logout ordering (unregister before revoke, token still present) and offline logout, payload to route mapping (including that a payload can never navigate to an arbitrary path), foreground suppression, tap dedupe, cold-start tap, tenant-switch registration, token rotation, pre-prompt, settings screen, deletion ordering and re-registration after a refused deletion.

### Server contract as READ from source

- `POST …/notifications/push/tokens` body `{provider:'expo', token, platform:'ios'|'android', deviceId?≤128, appVersion?≤40, categories?≤50×64}`; `token` must match `^(Exponent|Expo)PushToken\[[^\]\s]+\]$` (≤512). 200 `{message}`; 400 validation; 429 `SUBSCRIPTION_LIMIT_REACHED` past `pushMaxSubscriptionsPerUser` (default 10, genuinely new devices only). Idempotent; a token already on the tenant under another account is re-bound to the caller; a new token for the same `deviceId` replaces the old row.
- `DELETE …/notifications/push/tokens` takes `?deviceId=` or `?token=` (one is required, else 400; no body). Only ever the caller's own rows. The app sends `deviceId` only.
- Delivery: Expo's push API, ticket status only (no receipts polled); `DeviceNotRegistered` prunes the row. Raw FCM/APNs are not implemented.
- Payload (what the app receives): `title`, `body`, `data = { ...payload.data, url?, tag? }`. Messaging sends `data: { conversationId, messageId }`, `url: "/messaging/{conversationId}"` (a WEB path, not an app route), `tag: "messaging:{conversationId}"`. **There is no tenant id in it.** The notification channel spreads `event.data` into the payload top level, so only `url`, `tag`, `icon` and a nested `data` object survive Expo's mapping; other top-level keys are dropped. The only producer verified in source is the offline-recipient message push.
- Logout does not remove tokens (revokes the session only), as stated.

### Deviations

- The plan names `/notifications/push/subscribe` and `data.route`. The real routes are `/notifications/push/tokens` and the payload has no `route`: taps map `data.conversationId` (or `url` of the form `/messaging/{id}`) to `/messages/[conversationId]`; everything else opens `/notifications`. Web paths are never opened from a push.
- Registration happens for the tenant that is active when the shell opens or when it becomes active (as the task asked), not for every tenant up front. Rows of previously active tenants stay on the server until sign-out or until Expo reports the token dead.
- No per-category preferences UI: the server's `categories` field is supported by the DTO but the app registers for every category. `user_preferences` exposes only the coarse `pushNotifications` flag (and no quiet-hours fields in the client DTO), which is what the second switch controls.
- Foreground behavior is the system banner, not a `sonner-native` toast (a toast cannot carry the tap-to-open action). Haptics and toasts are used for the enable/disable results.
- Unregistering needs a live bearer token: a tenant whose session already died (the transport cleared its pair) cannot be unregistered, and its row stays until Expo reports `DeviceNotRegistered` or another account signs in on this phone (re-bind).

### Not verified

- Everything on a real device: permission prompts, the Expo token, delivery in foreground / background / killed state, tap routing from a cold start, Android channel behaviour, and that the pre-prompt feels right. Push cannot be verified on simulators or in Expo Go (SDK 53+); a development build is required.
- That the deployed server matches the uncommitted working tree read here.
- The wrong-tenant tap: with several organizations registered, a push for a non-active organization carries no tenant id, so a tap opens `/messages/{id}` in the ACTIVE organization (the thread screen shows its error state if the conversation is not there). Fixing it needs a `tenantId` in the server payload.

### What the owner still must supply

- `EXPO_PUBLIC_EAS_PROJECT_ID` (run `eas init`; documented in `.env.example`, empty placeholder).
- Android: an FCM V1 service account key uploaded to EAS and `google-services.json` (path in `app.config.ts` `android.googleServicesFile`; not added, no file was invented). iOS: an APNs key via `eas credentials` and a paid Apple Developer team; the bundle identifier / Android package in `app.config.ts` are still the boilerplate placeholders (`com.kuraykaraaslan.boilerplate`).
- Optionally `EXPO_ACCESS_TOKEN` on the server if Expo's enhanced push security is enabled, and deploying the next-boilerplate changes.

---

## 🔧 Adversarial review fixes — 2026-10-10

Every route, body and response above was re-read against the uncommitted next-boilerplate source (`notifications-push-tokens.route.ts`, `notification_push.dto.ts`, `notification_push.subscription.service.ts`, `notification_push.channel.ts`, `notification_push.expo.ts`, `messaging.notify.ts`); the client matches it. The delivered payload (`data = {conversationId, messageId, url, tag}`) was traced end to end through `channel.ts` and `toExpoMessage`.

- **Web crash fixed.** `Notifications.useLastNotificationResponse()` was called unconditionally in the shell, and on web it throws `UnavailabilityError` from `getLastNotificationResponse()` in a layout effect (the web emitter module has no native side), so the signed-in shell would have crashed in a browser although the static export itself built. Taps are now handled by an effect that runs only where push is supported (`pushSupported()`: physical iOS/Android device) using `getLastNotificationResponseAsync()` (cold start) plus `addNotificationResponseReceivedListener` (live), still handled once per notification id. `npx expo export -p web` was run and succeeds (with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_DEFAULT_TENANT_ID` set).
- **Other organizations re-registered after a refused deletion.** `unregisterAllPush()` removes the device everywhere and clears the books, but a refused deletion (wrong password, last owner) re-registered only the active organization. New `registerPushForAllTenants()` (active first, then every known tenant, each with its own bearer pair, answering with the active outcome) is used there, after switching the device on in settings, and after the pre-prompt.
- Tests: cold-start and live taps, no native emitter use on unsupported devices, `registerPushForAllTenants`; `__mocks__/expo-notifications.ts` now mocks the two functions instead of the hook.

Known limits kept (documented, not fixed): switching the device off while offline leaves the server rows until Expo reports `DeviceNotRegistered` (best effort by design); a tap for a non-active organization opens the thread in the active one (no tenant id in the payload); the server cap answers 429, which the client reports as a generic failure.
