# MODERNIZATION — expo-react-native-boilerplate

## Context

Mevcut boilerplate Expo 52 + React Navigation tabanlı servis-sınıf mimarisi kullanıyor. Hedef:

- `Code_Structure_Rules_ReactNative` kurallarına tam uyum (6 kritik mandate)
- Expo Router v5 gruplu navigasyon (`(auth)` / `(tabs)`)
- Zustand + MMKV state yönetimi (AsyncStorage yasak)
- `axiosInstance` hook pipeline mimarisi (servis sınıfları yerine)
- next-boilerplate ile aynı tenant API endpoint yapısı

---

## Mevcut Durum vs Hedef

| Alan | Şu An | Hedef |
|---|---|---|
| Config | `app.json` | `app.config.ts` (TypeScript) |
| Navigasyon | React Navigation Stack + Drawer | Expo Router v5 `(auth)` / `(tabs)` grupları |
| State | Zustand (persist yok) | Zustand + MMKV persist |
| Token | SecureStore (tek token) | SecureStore `accessToken` + `refreshToken` |
| Data fetch | Servis sınıfları (static methods) | Hook pipeline: Screen → Hook → axiosInstance |
| Auth header | `Authorization: Bearer ...` | Cookie-based (interceptor ile SecureStore'dan inject) |
| Env | `process.env` direkt | `libs/env.ts` (Zod validated) |
| Tipler | `interface` (plain) | Zod schema + `z.infer<>` |
| API URL | `/v1/auth/login` | `/api/system/auth/login` |
| Logging | `console.log` | `libs/logger.ts` |
| Toast | react-native-toast-message | sonner-native |

---

## API Endpoint Eşleşmesi

| Eski Endpoint | Yeni Endpoint | Auth |
|---|---|---|
| `POST /v1/auth/login` | `POST /api/system/auth/login` | Yok |
| `POST /v1/auth/register` | `POST /api/system/auth/register` | Yok |
| `POST /v1/auth/logout` | `POST /api/system/auth/logout` | Cookie |
| `GET /v1/auth/me` | `GET /api/system/auth/session` | Cookie |
| `POST /v1/auth/otp/email-send` | `POST /api/system/auth/otp/send` | Yok |
| `POST /v1/auth/otp/phone-send` | `POST /api/system/auth/otp/send` | Yok |
| `POST /v1/auth/otp/email-verify` | `POST /api/system/auth/otp/verify` | Yok |
| `POST /v1/auth/otp/phone-verify` | `POST /api/system/auth/otp/verify` | Yok |
| `POST /v1/auth/change-email` | `POST /api/system/auth/change-email` | Cookie |
| `GET /v1/auth/sessions` | `GET /api/system/auth/sessions` | Cookie |
| `DELETE /v1/auth/sessions` | `DELETE /api/system/auth/sessions` | Cookie |
| `DELETE /v1/auth/sessions/:id` | `DELETE /api/system/auth/sessions/:id` | Cookie |
| `GET /v1/tenants/me` | `GET /api/system/auth/me/tenants` | Cookie |
| `GET /v1/notifications/...` | `GET /api/system/notifications` | Cookie |

### Auth Stratejisi — Cookie Interceptor

1. **Login response interceptor**: `Set-Cookie` header'larından `accessToken` + `refreshToken` parse et
2. **SecureStore**: `setToken('accessToken', val)` + `setToken('refreshToken', val)` kaydet
3. **Request interceptor**: her request'e `Cookie: accessToken=...; refreshToken=...` header ekle
4. **401 interceptor**: otomatik `POST /api/system/auth/refresh` → yeni token → retry
5. **Logout**: `clearAllTokens()` + store flush + `router.replace('/(auth)/login')`

---

## Hedef Dosya Yapısı

```
├── app/
│   ├── _layout.tsx                    # Root: GestureHandlerRootView, SafeAreaProvider, fonts, Toaster
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx                # isAuthenticated → Redirect /(tabs)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── 2fa.tsx
│   │   ├── select-tenant.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/
│       ├── _layout.tsx                # !isAuthenticated → Redirect /(auth)/login
│       ├── index.tsx
│       ├── messages.tsx
│       ├── notifications.tsx
│       └── settings/
│           ├── _layout.tsx
│           ├── index.tsx
│           ├── change-email.tsx
│           ├── change-password.tsx
│           ├── change-phone.tsx
│           ├── change-name.tsx
│           ├── change-language.tsx
│           └── sessions.tsx
├── components/
│   ├── auth/
│   │   ├── AuthLayout.tsx
│   │   └── SSOButtons.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── TextInput.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useLogin.ts
│   ├── useLogout.ts
│   ├── useTFA.ts
│   ├── useRegister.ts
│   ├── useForgotPassword.ts
│   ├── useTenantMemberships.ts
│   ├── useNotifications.ts
│   ├── useSessions.ts
│   └── useProfile.ts
├── stores/
│   ├── authStore.ts
│   ├── tenantStore.ts
│   └── appStore.ts
├── libs/
│   ├── axios.ts
│   ├── env.ts
│   ├── logger.ts
│   ├── secureStorage.ts
│   ├── mmkv.ts
│   ├── zustandStorage.ts
│   └── utils/
│       └── cn.ts
├── types/
│   ├── auth.types.ts
│   ├── tenant.types.ts
│   ├── notification.types.ts
│   └── common.types.ts
├── __tests__/
│   ├── server.ts
│   ├── handlers.ts
│   └── setup.ts
├── app.config.ts                      # app.json yerine
├── tailwind.config.js
├── global.css
└── babel.config.js
```

---

## Package Değişiklikleri

### Eklenenler
- `react-native-mmkv` — MMKV hızlı storage
- `sonner-native` — modern toast
- `@react-native-community/netinfo` — offline detection
- `@testing-library/react-native` + `msw` — test altyapısı
- `clsx` + `tailwind-merge` — NativeWind class merging
- `zod` — runtime type validation

### SDK 53 Güncellemeleri
- `expo ~53.0.x`
- `expo-router ~5.0.x`
- `react-native 0.79.x`

### Kaldırılanlar
- `react-navigation/stack`, `drawer`, `bottom-tabs` (direkt import — Expo Router dahili kullanır)
- `react-native-toast-message` → `sonner-native`

---

## Kritik Kurallar

1. `app.config.ts` — `app.json` yok
2. Token asla Zustand'da — sadece SecureStore
3. `fetch()` yasak — sadece `axiosInstance`
4. AsyncStorage yasak — MMKV
5. Inline style yasak — NativeWind `className`
6. Auth guard yalnızca layout'ta
7. `process.env` direkt erişim yasak — `libs/env.ts`
8. `console.log` prod'da yasak — `libs/logger.ts`

---

## Doğrulama

1. `expo start` — başlıyor mu?
2. Login → 2FA → select-tenant → home flow
3. Logout → token temizleniyor, redirect
4. App restart → otomatik oturum restore
5. `npx tsc --noEmit` — tip hatası yok
6. `npx jest` — testler geçiyor
