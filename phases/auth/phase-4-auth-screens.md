<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans
  3. phases/README.md (§Kilitli kararlar)
  4. phases/auth/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 4 — Auth çekirdek ekranları

**Hedef:** login → (OTP) → oturum akışı uçtan uca çalışsın; uygulama kapanıp açıldığında oturum korunsun.

## 4.1 Login

- [ ] `app/(auth)/login.tsx` → `AuthClientService.deviceLogin({ email, password, rememberMe, device: buildDeviceInfo() })`.
- [ ] Yanıt işleme sırası:
  1. `accessToken` + `refreshToken` → `setToken(kind, tenantId, value)` (aktif tenant anahtarıyla).
  2. `otpRequired === true` → `/2fa`'ya yönlendir, **`authStore`'u authenticated yapma**.
  3. `mustChangePassword === true` → parola değiştirme ekranına zorla.
  4. `passwordExpiresInDays` düşükse uyarı toast'ı.
  5. `user` → `authStore.setUser`, `tenant` + `tenantMember` → `tenantStore`.
- [ ] Hata yolları `normalizeApiError` ile: `INVALID_CREDENTIALS`, 403 "not a member of this organization", 404 tenant pasif, 429 `Retry-After`.
- [ ] `Haptics.notificationAsync(Success | Error)` (AGENTS.md §6 Kural 11), `toast.success/error` (Kural 12).
- [ ] Butonlar / alanlar Faz 1C'de `@/components/ui` barrel'ından açılan kui-native `Button`, `Input`, `Label`, `AlertBanner` (doğrudan `kui-native/*` import'u yok).

## 4.2 OTP / 2FA

- [ ] `app/(auth)/2fa.tsx` → `verifyOTP({ method, action: 'authenticate', otpToken })`. Bugünkü `{code, method}` gövdesi **yanlış**.
- [ ] Yöntem seçimi `userSecurity.otpMethods` üzerinden (`EMAIL` / `SMS` / `TOTP_APP`); tek yöntem varsa seçim gösterilmez.
- [ ] Yeniden gönder: `sendOTP({ method, action: 'authenticate' })`, geri sayımlı buton.
- [ ] Doğrulama sonrası `GET /auth/session` ile oturum tazelenir ve drawer'a girilir.

## 4.3 Kayıt ve parola

- [ ] `app/(auth)/register.tsx` → `{ email, password, phone?, consentVersion? }`. Bugünkü zorunlu `name` alanı formdan **çıkar** (sunucu kabul etmiyor); istenirse kayıt sonrası `PUT /auth/me/profile` ile ayrı adımda alınır.
- [ ] `consentVersion` — KVKK / GDPR onay sürümü; `constants/` altında sabit tutulur ve onay kutusu işaretlenince gönderilir.
- [ ] `app/(auth)/forgot-password.tsx` → `POST /auth/forgot-password`.
- [ ] `app/(auth)/reset-password.tsx` (**yeni**) → `{ email, resetToken, password }`. `resetToken` e-postadaki deep link'ten okunur.
- [ ] Parola değiştirme (`mustChangePassword` akışı) → `POST /auth/change-password` `{currentPassword, newPassword}`.

## 4.4 Oturum restore

- [ ] `app/_layout.tsx` → aktif tenant'ın `accessToken`'ı varsa `GET /auth/session` ile doğrulanır:
  - 200 → `authStore.setUser`, `tenantStore` tazelenir.
  - 401 `OTP_REQUIRED` → `/2fa`.
  - 401 (diğer) → interceptor zaten refresh denedi; buraya düştüyse token'lar temizlenir ve login'e gidilir.
- [ ] Splash yalnız bu kontrol bittikten sonra kapanır (bugünkü `loaded` bayrağına bağlanır) — aksi halde login ekranı bir an görünüp kaybolur.

## 4.5 Aktif oturumlar

- [ ] `app/(drawer)/settings/sessions.tsx` → `GET /auth/me/sessions`; her satırda `metadata.device` (`brand`, `model`, `os`, `osVersion`) ve `metadata.geo` gösterilir, yoksa `userAgent`'a düşülür.
- [ ] Mevcut oturum işaretlenir; `DELETE /auth/me/sessions/{id}` ile diğerleri sonlandırılır.
- [ ] Kendi oturumunu sonlandırırsa logout akışına düşer.

## 4.6 Profil alanlarının yeni kaynağı

- [ ] `SafeUser`'da artık `name` / `image` **yok**. `UserMenu` baş harfleri ve profil başlığı `userProfile.name` / `userProfile.profilePicture`'a bağlanır (`dto/profile.dto.ts` zaten modelliyor).
- [ ] `language` / `theme` `GET /auth/me/preferences`'tan okunur; `appStore.locale` / `colorScheme` ile senkronlanır.
- [ ] `app/(drawer)/settings/change-email.tsx` → `/auth/change-email` **yok**; `POST /auth/me/complete-email` + `POST /auth/verify-email/send|verify` akışına bağlanır.

## Dokunulan / oluşturulan dosyalar

- Yeni: `app/(auth)/reset-password.tsx`
- Değişen: `app/(auth)/{login,register,2fa,forgot-password}.tsx`, `app/_layout.tsx`, `app/(drawer)/settings/{sessions,change-email,profile,index}.tsx`, `components/shell/UserMenu.tsx`, `components/auth/AuthLayout.tsx`, `stores/authStore.ts`, `constants/` (consent sürümü)
- Test: `__tests__/` altında login / OTP / oturum restore akış testleri

## Yeniden kullan

- `components/auth/AuthLayout.tsx` — auth ekranlarının ortak çerçevesi, yeniden yazılmaz.
- `@/components/ui` (kui-native, Faz 1C): `Button`, `Input`, `Label`, `AlertBanner`, `Spinner`, `Card`, `EmptyState`.
- `libs/apiError.ts` + `dto/common.dto.ts:extractErrorMessage` — tüm hata mesajları.
- `libs/deviceInfo.ts` (Faz 2) — login gövdesindeki `device`.
- `libs/i18n.ts` + `locales/*.json` — `AUTH`, `ERRORS`, `SETTINGS` namespace'leri zaten var; yeni anahtarlar altı dile de eklenir.
- `expo-haptics`, `sonner-native` — mevcut kullanım deseni.

## Kabul kriterleri

- Yanlış parola → `INVALID_CREDENTIALS` mesajı ve hata haptiği.
- Üyeliği olmayan tenant'a login → 403 mesajı ("bu organizasyonun üyesi değilsiniz"), login ekranında kalınır.
- Pasif tenant → 404 mesajı, `/select-tenant`'a yönlendirme.
- OTP açık kullanıcı `/2fa`'ya düşer; doğru kod sonrası drawer'a girer, yanlış kodda ekranda kalır.
- `mustChangePassword` olan kullanıcı parola değiştirmeden drawer'a **giremez**.
- Uygulama kapatılıp açıldığında oturum korunur; splash login ekranını "flaş"lamaz.
- `sessions` ekranında cihaz marka / model / OS bilgisi görünür (Faz 2'nin gönderdiği `device` nesnesi).
- `UserMenu` baş harfleri ve profil adı dolu gelir (`userProfile`'dan).
- Altı dilde de yeni metin anahtarları mevcut; `npm run test:ci` geçer.

## Riskler

- **Faz 3 ile birlikte gitmemesi:** `SafeUser`'dan `name`/`image` çıktığı an bu ekranlar boş render eder. İki faz sıra bozulmadan ardışık gitmeli.
- **`otpRequired` atlanması:** OTP gerekliyken `authStore`'u authenticated yapmak, kullanıcıyı drawer'a sokar ve **her** istek 401 `OTP_REQUIRED` döner — sonsuz hata döngüsü.
- **Token yazma sırası:** `setUser` token yazılmadan çağrılırsa, sonraki `GET /auth/session` isteği bearer'sız gider ve 401 alır.
- **Deep link `resetToken`:** link şeması (`app.config.ts` `scheme`) Faz 6'da ekleniyor; reset-password linki ondan önce test edilemez → bu faz için token elle girilebilir bir alan da sunmalı.
- **i18n eksik anahtar:** yeni anahtar yalnız `en`/`tr`'ye eklenirse diğer dört dilde ham anahtar görünür.
- **`consentVersion` sabitinin unutulması:** boş gönderilirse sunucu kabul eder ama KVKK kaydı izsiz kalır — hukuki iz kaybı, sessiz hata.
