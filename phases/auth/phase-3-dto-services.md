<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user/server/user.types.ts · modules/user_security/server/user_security.types.ts ·
     modules/user_session/server/user_session.types.ts · modules/tenant/server/tenant.types.ts
  3. phases/README.md (§Kilitli kararlar)
  4. phases/auth/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 3 — DTO + servis hizalaması

**Hedef:** Zod şemaları sunucunun `Safe*` şemalarının birebir aynası olsun; servisler gerçek yolları çağırsın. Bu fazdan sonra hiçbir `.parse()` sunucu yanıtında kırılmaz.

## 3.1 `dto/auth.dto.ts`

- [ ] `UserSchema` / `SafeUserSchema` → sunucunun `SafeUser`'ı:
  - **Gelen:** `userStatus`, `emailVerifiedAt`, `userProfile?`
  - **Giden:** `name`, `image`, `language`, `theme` — bunlar `SafeUser`'da yok. `name` + `profilePicture` `userProfile` altında (`dto/profile.dto.ts` zaten modelliyor), `language` / `theme` `/auth/me/preferences` altında.
  - Kalan: `userId`, `email`, `phone` (nullable), `userRole`, `createdAt`, `updatedAt`.
- [ ] **Yeni** `DeviceInfoSchema` — `{type?: 'phone'|'tablet'|'watch'|'tv'|'desktop'|'other', brand?, model?, name?, os?, osVersion?, appVersion?}`; `DeviceInfoDTO` ile birebir, uzunluk sınırları dahil (`brand`/`model` ≤80, `name` ≤120, `os`/`osVersion`/`appVersion` ≤40).
- [ ] **Yeni** `DeviceLoginRequestSchema` = `LoginRequestSchema.extend({ captchaToken: optional, rememberMe: optional, device: DeviceInfoSchema.optional() })`.
- [ ] **Yeni** `DeviceLoginResponseSchema` — login'in gerçek dokuz alanı: `{accessToken, refreshToken, otpRequired, user, tenant: {tenantId, name}, tenantMember: {memberRole}, userSecurity, mustChangePassword, passwordExpiresInDays}`.
- [ ] **Yeni** `DeviceRefreshResponseSchema` = `{message, accessToken, refreshToken}`.
- [ ] `UserSecuritySchema` → sunucunun `SafeUserSecurity`'si: `{otpMethods[], lastLoginAt, lastLoginIp, lastLoginDevice, failedLoginAttempts, lockedUntil, passkeyEnabled, trustedDevices[], passwordChangedAt, mustChangePassword}`. Bugünkü `{totpEnabled, otpMethods, passkeyCount, otpVerifyNeeded}` **yanlış**.
- [ ] `SessionSchema.metadata` eklenir → `{geo?: {city,state,country,countryCode}, impersonation?, rememberMe?, device?}` (`SessionMetaSchema` aynası).
- [ ] `OTPVerifyRequestSchema` → `{method: OTPMethodEnum, action: OTPActionEnum, otpToken: string().min(4)}`. **Yeni** `OTPActionEnum = ['enable','disable','authenticate']`.
- [ ] `OTPSendRequestSchema` → `{method, action}` (bugün yalnız `method`).
- [ ] **Yeni** `ResetPasswordRequestSchema` = `{email, resetToken, password}` — sunucu route'u `password` alanını `ResetPasswordDTO.newPassword`'e kendisi eşliyor, istemci `password` göndermeli.
- [ ] **Yeni** `ChangePasswordRequestSchema` = `{currentPassword, newPassword: min(8)}`.
- [ ] **Yeni** `MagicLinkRequestSchema` = `{email}`, `MagicLinkConsumeSchema` = `{token: min(16).max(512)}`.
- [ ] **Yeni** `TOTPSetupResponseSchema` = `{message, secret, otpauthUrl}`, `TOTPEnableResponseSchema` = `{message, backupCodes}`.
- [ ] `ChangeEmailRequestSchema` **kaldırılır** — `/auth/change-email` sunucuda yok.
- [ ] `RegisterRequestSchema` → `{email, password: min(8), phone?: optional, consentVersion?: optional}`. Bugünkü zorunlu `name` **kaldırılır** (sunucu `RegisterDTO`'da yok).

## 3.2 `dto/tenant.dto.ts`

- [ ] `TenantSchema` → `SafeTenant`: `{tenantId, name, description (nullable), region?, slug?, metadata?, tenantStatus, createdAt, updatedAt, domains?}`. Bugünkü `logo`, `favicon`, `theme`, `language`, `timezone` alanları `SafeTenant`'ta **yok** — `tenant_branding` / `tenant_setting` altındalar, kapsam dışı.
- [ ] `MyTenantsResponseSchema` → `{tenants, delegatedTenants, pendingInvitations}` (bugün `{tenants, invitations}` — **iki alan da yanlış adlanmış**).
- [ ] `CreateTenantRequestSchema` → `{name: min(1).max(100), description?: nullable, region?}`; sunucu `CreateTenantDTO` ile hizalanır (bugünkü `min(2)` gevşetilir).
- [ ] `MemberRoleEnum` → `['OWNER','ADMIN','USER']` sırası sunucudakiyle aynı tutulur.

## 3.3 `dto/sso.dto.ts` (yeni)

- [ ] `SSOProviderEnum` — `google, apple, facebook, github, linkedin, microsoft, twitter, slack, tiktok, wechat, autodesk, yandex, vk, qq, weibo, alipay`.
- [ ] `SSOProvidersResponseSchema` = `{providers: [...]}`.
- [ ] `SSOAuthUrlResponseSchema` = `{url, state}`.

## 3.4 Servisler

Tüm `/api/system/...` yolları **silinir**. Yollar Faz 2 interceptor önekine göre **göreli** yazılır.

- [ ] `services/auth.service.client.ts` → `AuthClientService`:

  | Metot | Yol | Not |
  |---|---|---|
  | `deviceLogin(payload)` | `POST /auth/device/login` | `login` yerine geçer |
  | `deviceRefresh(refreshToken, tenantId)` | `POST /auth/device/refresh` | yalnız interceptor kullanır |
  | `logout()` | `POST /auth/logout` | |
  | `register(payload)` | `POST /auth/register` | |
  | `getSession()` | `GET /auth/session` | yanıt `{success, user, tenant, tenantMember, message}` |
  | `sendOTP(method, action)` | `POST /auth/otp/send` | |
  | `verifyOTP(method, action, otpToken)` | `POST /auth/otp/verify` | |
  | `setupTOTP()` / `enableTOTP(otpToken)` / `disableTOTP(otpToken)` | `POST /auth/totp/{setup,enable,disable}` | **yeni** |
  | `forgotPassword(payload)` | `POST /auth/forgot-password` | |
  | `resetPassword(payload)` | `POST /auth/reset-password` | **yeni** |
  | `changePassword(payload)` | `POST /auth/change-password` | **yeni** |
  | `getSessions()` | `GET /auth/me/sessions` | |
  | `revokeSession(id)` | `DELETE /auth/me/sessions/{id}` | |
  | `changeEmail` | — | **kaldırılır** |

- [ ] `services/profile.service.client.ts` → `GET|PUT /auth/me/profile`; **yeni** `getPreferences()` / `updatePreferences()` → `GET|PUT /auth/me/preferences` (`language`, `theme` buradan gelir).
- [ ] `services/tenant.service.client.ts` → `getMyTenants()` `GET /auth/me/tenants`, `createTenant()` `POST /tenants/create`, **yeni** `getTenantProfile()` / `updateTenantProfile()` `GET|PUT /tenant/profile`. Members / invitations metotları **dokunulmaz** (kapsam dışı) — yalnız `/api/tenant/{id}` önekleri kaldırılır ki interceptor öneki doğru çalışsın.
- [ ] `services/sso.service.client.ts` (yeni) → `getProviders()` `GET /auth/sso`, `getAuthUrl(provider)` `GET /auth/sso/{provider}`.
- [ ] Her servis yanıtı ilgili DTO ile `.parse()` edilir (AGENTS.md §6 Kural 7), hata `normalizeApiError` ile sarılır.

## 3.5 Test altyapısı

- [ ] `__tests__/_handlers.ts` — her endpoint için MSW handler'ı, **sunucunun gerçek yanıt şekliyle** (bu dokümandaki tablolar kaynak).
- [ ] Dört hata zarfı şekli fixture olarak eklenir.
- [ ] Her DTO için "sunucu yanıtı → `.parse()` kırılmıyor" testi.

## Dokunulan / oluşturulan dosyalar

- Yeni: `dto/sso.dto.ts`, `services/sso.service.client.ts`
- Değişen: `dto/auth.dto.ts`, `dto/tenant.dto.ts`, `services/auth.service.client.ts`, `services/profile.service.client.ts`, `services/tenant.service.client.ts`, `stores/authStore.ts` (yeni `SafeUser` şekli), `__tests__/_handlers.ts`
- Etkilenen (Faz 4/5'te güncellenecek): `app/(auth)/**`, `app/(drawer)/settings/**`

## Yeniden kullan

- `dto/profile.dto.ts` — `userProfile` şekli zaten modellenmiş (`name`, `biography`, `profilePicture`, `headerImage`, `socialLinks`); `SafeUser.userProfile` buna bağlanır, yeniden yazılmaz.
- `dto/common.dto.ts` — `PaginationSchema`, `paginatedResponseSchema`, `ApiErrorSchema` korunur.
- `libs/apiError.ts` (Faz 2) — tüm servis hataları buradan geçer.
- `libs/axios.ts` interceptor öneki — servisler tenant yolunu **kendileri kurmaz**.
- Mevcut `__tests__/_server.ts` MSW kurulumu.

## Kabul kriterleri

- `git grep "/api/system"` → **sıfır** sonuç.
- `git grep "api/tenant/"` servis dosyalarında **sıfır** sonuç (önek yalnız interceptor'da).
- Her servis metodu için MSW handler'ı sunucunun gerçek yanıtını döner ve DTO `.parse()` **hata vermez**.
- `npm run typecheck` sıfır hata; `npm run test:ci` geçer.
- `UserSchema` içinde `name` / `image` / `language` / `theme` alanları kalmaz.
- `npm run registry:snapshot` sonrası `public/registry/{dtos,services}.json` yeni şekli yansıtır.

## Riskler

- **Sessiz alan kaybı:** `name` / `image` `SafeUser`'dan çıkınca onları okuyan ekranlar (`UserMenu` baş harfleri, profil başlığı) **boş** render eder. Faz 4'te `userProfile`'a bağlanana kadar geçici görünüm bozulması olur — bu iki faz **aynı PR'da** birleştirilmeli ya da sıra bozulmamalı.
- **`.parse()` katılığı:** sunucu opsiyonel bir alanı `null` gönderirse `optional()` beklendiği yerde kırılır. `nullable()` / `nullish()` seçimleri sunucu şemalarına bakılarak yapılmalı, tahminle değil.
- **`OTPActionEnum` kaçırma:** `action` göndermeyen bir OTP çağrısı 400 döner ve kullanıcıya "Validation error" gösterilir — üç OTP çağrı yerinin de güncellendiği `git grep` ile doğrulanmalı.
- **Kapsam dışı metotların bozulması:** members / invitations metotlarından `/api/tenant/{id}` öneki kaldırılırken yol yanlış kesilirse kapsam dışı ekranlar kırılır; bu metotların testleri de handler'a eklenmeli.
- **`reset-password` alan adı tuzağı:** sunucu `password` alır ama iç DTO'su `newPassword` — istemci `newPassword` gönderirse 400 alır.
