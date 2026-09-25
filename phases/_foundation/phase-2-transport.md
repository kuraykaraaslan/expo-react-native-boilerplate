<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user_session/server/user_session.{token.service,service.next,session.service.next}.ts ·
     modules/common/server/csrf.ts · proxy.ts
  3. phases/README.md (§Kilitli kararlar K1–K3)
  4. phases/_foundation/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 2 — Transport katmanı (device bearer)

**Hedef:** Tek `axiosInstance` sunucunun **device bearer** sözleşmesini eksiksiz konuşsun: doğru adres şekli, `Authorization: Bearer`, tenant başına şeffaf refresh, dört hata zarfının tekilleştirilmesi.

> **Bugünkü durum yanlış:** `libs/axios.ts` elle `Cookie: accessToken=…; refreshToken=…` header'ı kuruyor, yanıttan `Set-Cookie` ayrıştırıyor ve `/api/system/auth/refresh` çağırıyor. Sunucuda ne bu yol var ne de cookie'ye ihtiyaç. Dahası `user_session.service.next.ts:63` audience'ı `cookieAccessToken ? 'web' : 'device'` ile seçiyor — cookie göndermek istemciyi **yanlış audience'a** düşürür.

## 2.1 Env

- [ ] `libs/env.ts` → `EXPO_PUBLIC_API_URL` artık **yalnız origin**: `/api` **yok**, default `http://10.0.2.2:3000` (Android emülatör host'u).
- [ ] **Yeni** `EXPO_PUBLIC_DEFAULT_TENANT_ID` — uuid, **zorunlu** (default yok). K1 gereği: sunucuda kimlik doğrulamasız tenant keşif yüzeyi yoktur, taze kurulum bu tenant'a login olur.
- [ ] `.env.example` iki anahtarla da güncellenir.

## 2.2 SecureStore — tenant başına anahtar (K2)

- [ ] `libs/secureStorage.ts` API'si tenant alır:
  - `getToken(kind: 'accessToken'|'refreshToken', tenantId: string): Promise<string|null>`
  - `setToken(kind, tenantId, value)` · `clearTenantTokens(tenantId)` · `clearAllTokens()`
  - Fiziksel anahtar: `kind` + `":"` + `tenantId`.
- [ ] `clearAllTokens()` **tüm** tenant'ların anahtarlarını siler. SecureStore anahtar listeleme sunmadığı için bilinen tenantId listesi `tenantStore`'dan okunur; ek güvence olarak MMKV'de bir `knownTenantIds` dizisi tutulur.
- [ ] Neden: device token **tek tenant'a** bağlıdır (`TokenPayload.tenantId`) ve device için tenant-switch endpoint'i **kasıtlı olarak yoktur**. Tenant başına çift tutmak, daha önce girilmiş tenant'a **parola sormadan** geçmeyi sağlar.

## 2.3 libs/axios.ts — tam yeniden yazım

- [ ] `baseURL` = `env.EXPO_PUBLIC_API_URL` (origin).
- [ ] **Request interceptor:**
  - Göreli yola `/api/tenant/{activeTenantId}/api` öneki eklenir; `activeTenantId` `useTenantStore.getState().activeTenantId` ile **senkron** okunur (hook değil).
  - `Authorization: Bearer <accessToken>` (o tenant'ın token'ı).
  - **Cookie kurma mantığı tamamen silinir.**
- [ ] **Response interceptor:** `Set-Cookie` ayrıştırma **tamamen silinir**.
- [ ] **401 + `SESSION_EXPIRED` / `UNAUTHORIZED`** → tenant başına **single-flight** refresh:
  - `POST /api/tenant/{tenantId}/api/auth/device/refresh` gövde `{refreshToken}`.
  - Yanıt `{message, accessToken, refreshToken}` — **ikisi de** SecureStore'a yazılır (refresh rotate olur; eski token'ı saklamak reuse detection'ı tetikler ve **tüm oturumları** siler).
  - Bekleyen istekler kuyruğa alınır, refresh sonrası tekrarlanır. Kuyruk **tenant başına** ayrıdır.
  - Refresh de 401 dönerse: o tenant'ın token'ları silinir, `authStore.logout()`, login'e yönlendirilir.
  - Refresh **başka** bir hatayla düşerse (429, ağ, 5xx) oturum **ölü sayılmaz** — sunucu route'unun yorumu bunu açıkça söylüyor.
- [ ] **401 + `OTP_REQUIRED` / `TOTP_REQUIRED`** → refresh **denenmez**, `/2fa`'ya yönlendirilir. (Oturum canlı, yalnız OTP kapısı kapalı.)
- [ ] **`TENANT_INACTIVE` / `NOT_TENANT_MEMBER` / `TENANT_NOT_FOUND`** → o tenant oturumu düşürülür, `/select-tenant`'a yönlendirilir.
- [ ] **429** → `Retry-After` okunur, `sonner-native` ile süre gösterilir; istek **tekrarlanmaz**, refresh döngüsüne girilmez.
- [ ] `timeout` 10000 korunur.

## 2.4 Hata normalizasyonu

- [ ] `libs/apiError.ts` (yeni) — `normalizeApiError(err: unknown)` → `{message, code?, statusCode?, issues?}`. **Dört** zarf şeklini de karşılar:
  1. `{message, code}` (AppError)
  2. `{message: 'Validation error', issues: [...]}` (ZodError)
  3. `{error: '<string>'}` (login/register 403/404)
  4. `{error: [<zod issues>]}` (device login 400)
- [ ] `dto/common.dto.ts:extractErrorMessage` ve `libs/errorUtils.ts` buna **delege eder** — ikisi de korunur, mevcut çağrı yerleri kırılmaz.
- [ ] Bilinmeyen şekil → `i18n.t('ERRORS.UNEXPECTED')` (bugünkü davranış).

## 2.5 Cihaz bilgisi

- [ ] `expo-device` bağımlılık olarak eklenir (`package.json`'da **yok**; `npx expo install expo-device`).
- [ ] `libs/deviceInfo.ts` (yeni) → `DeviceInfoDTO` gövdesi üretir:

  | DTO alanı | Kaynak |
  |---|---|
  | `type` | `Device.deviceType` → `phone` / `tablet` / `tv` / `desktop` / `other` eşlemesi |
  | `brand` | `Device.brand` |
  | `model` | `Device.modelName` |
  | `name` | `Device.deviceName` |
  | `os` | `Device.osName` |
  | `osVersion` | `Device.osVersion` |
  | `appVersion` | `env.EXPO_PUBLIC_APP_VERSION` |

- [ ] Tüm alanlar optional; `null` / `undefined` olanlar gövdeye **konmaz** (sunucu `.optional()` bekliyor, `null` göndermek Zod'u kırar).
- [ ] Bu nesne `UserSession.metadata.device`'a yazılır ve "Aktif oturumlar" panelinde görünür (`SessionMetaSchema`).

## Dokunulan / oluşturulan dosyalar

- Yeni: `libs/apiError.ts`, `libs/deviceInfo.ts`
- Değişen: `libs/axios.ts` (tam yeniden yazım), `libs/env.ts`, `libs/secureStorage.ts`, `libs/errorUtils.ts`, `dto/common.dto.ts`, `stores/tenantStore.ts` (+`activeTenantId`), `package.json` (+`expo-device`), `.env.example`
- Test: `__tests__/_handlers.ts`, `__tests__/_server.ts` (MSW), yeni `__tests__/axios.test.ts`, `__tests__/apiError.test.ts`

## Yeniden kullan

- `libs/secureStorage.ts` — silinmez, imzası genişletilir (AGENTS.md §6 Kural 5: token'lar **yalnız** SecureStore).
- `libs/logger.ts` — tüm interceptor logları buradan (Kural 9: `console.*` yasak).
- `dto/common.dto.ts:extractErrorMessage` + `libs/errorUtils.ts` — korunur, `apiError.ts`'e delege eder.
- `sonner-native` — 429 ve oturum düşme bildirimleri (Kural 12).
- Mevcut single-flight `isRefreshing` + `failedQueue` deseni — tenant başına kuyruk olacak şekilde genişletilir, sıfırdan yazılmaz.

## Kabul kriterleri

- Geçerli kimlikle `POST …/auth/device/login` 200 döner; `accessToken` + `refreshToken` SecureStore'a **tenant anahtarıyla** yazılır.
- Sunucuda `ACCESS_TOKEN_EXPIRES_IN=60s` iken, süre dolduktan sonraki ilk istek **şeffaf** refresh ile başarılı olur; kullanıcı hiçbir şey görmez.
- **Eşzamanlı 5 istek tek bir refresh tetikler** (birim testle doğrulanır), beşi de başarıyla tamamlanır.
- Refresh 401 dönerse kullanıcı login'e düşer; refresh 429 dönerse oturum **korunur** ve toast çıkar.
- `OTP_REQUIRED` gelen istek refresh **denemez**, `/2fa`'ya yönlendirir.
- Giden isteklerde **hiçbir** `Cookie` header'ı yoktur (ağ logu ile doğrulanır) — aksi halde sunucu `web` audience'a düşer ve token'ı reddeder.
- Giden isteklerde `x-csrf-token` **yoktur** ve gerekmez (bearer CSRF'den muaf).
- `normalizeApiError` dört zarf şekli için de dört fixture testinde doğru mesajı döner.
- Login gövdesindeki `device` nesnesi emülatörde dolu gelir ve `/auth/me/sessions` yanıtında geri görünür.

## Riskler

- **Cookie kalıntısı (en sinsi):** interceptor'da tek bir `Cookie` satırı kalırsa sunucu audience'ı `web` seçer ve **her** bearer isteği 401 döner. Silme tam olmalı, yorum satırı bile bırakılmamalı.
- **Refresh token rotasyonu:** dönen yeni `refreshToken` yazılmazsa bir sonraki refresh **reuse detection**'a takılır ve kullanıcının **tüm** oturumları silinir. En pahalı hata.
- **Tenant başına kuyruk:** tek global `isRefreshing` bayrağı bırakılırsa, A tenant'ının refresh'i B tenant'ının isteklerini yanlış token'la tekrarlatır.
- **`activeTenantId` boş:** store hydrate olmadan atılan ilk istek `/api/tenant/undefined/api/...` üretir. Interceptor `activeTenantId` yoksa `EXPO_PUBLIC_DEFAULT_TENANT_ID`'ye düşmeli, asla `undefined` yazmamalı.
- **Sonsuz refresh döngüsü:** refresh isteğinin kendisi 401 alırsa interceptor onu yeniden refresh'e sokmamalı — refresh çağrısı `_retry` ile işaretlenmeli.
- **`clearAllTokens` eksikliği:** SecureStore anahtar listelemediği için bilinmeyen bir tenant anahtarı cihazda kalabilir → `knownTenantIds` listesi güncel tutulmazsa oturum sızıntısı olur.

---

## ✅ KODLANDI — 2026-09-25 (branch `feat/transport`)

Doğrulama:
- typecheck 0 hata.
- test:ci 20/20: `axios.test.ts` 10, `apiError.test.ts` 8, smoke 2.
- web export başarılı (`EXPO_PUBLIC_DEFAULT_TENANT_ID` ile).
- Giden isteklerde `Cookie` ve `x-csrf-token` yok (testle doğrulandı).
- **Mutasyon kontrolü:** grace penceresi ya da single-flight kaldırılınca ilgili test kırılıyor.

Sözleşme, next-boilerplate kaynağından doğrulandı: `auth-device-{login,refresh}.route.ts`, `user_session.service.next.ts` (bearer yolu), `route-error.ts`, `proxy.ts` ve web istemcisi `common/server/axios/axios.client.ts`.

**Bilinçli sapmalar (plan, kaynak koda göre düzeltildi):**
- **URL öneki `/api/tenant/{id}`** (plan: `/api/tenant/{id}/api`). Proxy `/api` segmentini kendisi ekliyor. K3 README'de düzeltildi.
- **401 sınıflandırması mesaja göre yapılıyor, koda göre değil.**
  - Sunucu, süresi dolmuş access token için `message: TOKEN_EXPIRED, code: SESSION_EXPIRED` dönüyor; gerçekten ölmüş oturum için de `message: SESSION_EXPIRED` ile aynı kod geliyor. Plandaki "`SESSION_EXPIRED` → refresh" kuralı ölü oturumu refresh'e sokardı.
  - Uygulanan kural next'in kendi istemcisiyle aynı:
    - Refresh + tekrar: `TOKEN_EXPIRED` / `SESSION_NOT_FOUND` / `USER_NOT_AUTHENTICATED`.
    - Oturum biter: `SESSION_EXPIRED` / `SESSION_REVOKED` / `INVALID_TOKEN` / `REFRESH_TOKEN_REUSED` / `DEVICE_FINGERPRINT_MISMATCH`.
    - OTP kapısı: `OTP_REQUIRED` (mesaj ya da kod) ve `TOTP_REQUIRED`.
- **Refresh sonrası 10 sn grace penceresi eklendi** (plan: yalnız kuyruk). Refresh bittikten hemen sonra eski token'la dönen 401'ler yeniden refresh edilmiyor, doğrudan tekrarlanıyor. next istemcisindeki reuse-detection fırtınası korumasının aynısı.
- **SecureStore anahtarı `kind.tenantId`** (plan: `kind:tenantId`). SecureStore yalnız `[A-Za-z0-9._-]` kabul ediyor; `:` çalışma anında hata fırlatırdı.
- **Yönlendirme interceptor'da değil.** appshell-compliance kuralı gereği interceptor store'u güncelliyor, layout guard'ları yönlendiriyor:
  - Oturum bitince `authStore.logout()` → `/login`.
  - OTP gerekince `authStore.otpRequired` → `/2fa`. `(auth)` guard'ı `otpRequired` iken kullanıcıyı grupta tutuyor.
- **Organizasyon erişimi bitince:** `TENANT_*` / `NOT_TENANT_MEMBER` durumunda plan `/select-tenant` diyordu; şimdilik login'e dönülüyor. `select-tenant` `(auth)` grubunda olduğu için oturum açık kullanıcı oraya yönlendirilemiyor; bilinen akış hatası. Faz 4/5'te select-tenant'a çevrilecek.
- **429 toast'ı interceptor'da değil:** `normalizeApiError` `Retry-After`'lı mesajı üretiyor, ekranın `handleApiError`'ı gösteriyor. Interceptor'ın ele aldığı hatalar (oturum bitti, OTP) `markHandled` ile işaretleniyor; `handleApiError` bunlarda ikinci toast'ı göstermiyor.
- **Açılışta oturum geri yükleme:** yalnız 401/403 çıkış yaptırıyor. Ağ hatası veya 5xx kalıcı oturumu korur (eskiden her hata çıkış yaptırıyordu).
- **`EXPO_PUBLIC_DEFAULT_TENANT_ID` zorunlu**, `.env` olmadan uygulama başlangıçta Zod hatasıyla durur. Uuid şartı konmadı (`min(1)`), çünkü sunucu tenantId biçimini zorunlu kılmıyor.

**Kalan (Faz 3):** servisler hâlâ `/api/system/...` çağırıyor ve yeni önekle hâlâ yanlış adrese gidiyor. `deviceInfo` login gövdesine Faz 3'te bağlanacak (`AuthClientService.deviceLogin`). Emülatörde gerçek sunucuyla doğrulama (60 sn access token ile şeffaf refresh) Faz 3'ten sonra yapılabilir.
