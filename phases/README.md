<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user_session/server/user_session.token.service.ts · proxy.ts
  3. phases/<set>/README.md
  4. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: bu dosya §Sıra
-->

# phases — Expo istemcisinin next-boilerplate'e bağlanması (Faz Planı kök index)

> Bu set, `expo-react-native-boilerplate`'i `next-boilerplate`'in **device bearer** auth yüzeyine bağlar ve
> arayüzü `kui-native` bileşenleriyle tek tasarım diline indirir.
> Konvansiyon, kardeş repo `next-boilerplate/phases/` ile birebir aynıdır.

## Neden (bağlam)

Bugün istemci sunucuyla **konuşmuyor**:

- `services/*.service.client.ts` `/api/system/auth/*` çağırıyor — bu yol sunucuda **hiç yok**.
- `libs/axios.ts` cookie tabanlı bir web akışı taklit ediyor (`Cookie` header'ı kurma, `Set-Cookie` ayrıştırma) — mobil için gereksiz ve yanlış.
- `dto/` şemaları sunucunun `Safe*` şemalarıyla uyuşmuyor (`UserSchema`, `MyTenantsResponseSchema`, `OTPVerifyRequestSchema`).
- Repo **derlenmiyor**: `@react-navigation/drawer` `package.json`'da yok ama `app/(drawer)/_layout.tsx` ve `components/shell/*` import ediyor.
- `components/ui/*` NativeWind `className`, `components/shell/*` inline `style={{}}` kullanıyor — iki rakip stil sistemi.

Sunucu tarafı ise **hazır**: `audience: 'device'` ile bearer akışı eklenmiş. İstemcinin cookie/CSRF dansına ihtiyacı yok.

## Sahibin kararları (sabit)

1. **kui-native git paketi olarak kurulur** (karar 2026-09-24; önceki "vendor et / kopyala" kararının **yerine geçer**). `package.json` → `"kui-native": "git+https://github.com/kuraykaraaslan/kui-native.git#<tag>"`. Kaynak kod repoya **kopyalanmaz**. Hatalar kui-native'de düzeltilir, yeni tag çıkarılır.
   - **Expo SDK 57'ye yükseltilir.** kui-native ile react / RN / expo tek kopya kalmalı. Önceki "SDK yükseltmesi yok" kararı kaldırıldı.
   - **KUInative reposunda paketleştirme değişikliği yapılabilir:** göreli import'lar, peerDependencies, tema override API'si.
2. **next-boilerplate'e dokunulmaz.** Mobil (`device`) desteğini sahibi zaten ekledi.
3. Kapsam: **auth çekirdek + tenancy çekirdek + SSO**. Members / invitations / roles **kapsam dışı** — mevcut ekran ve servisler bozulmadan bırakılır, ayrı bir faz setine kalır.

## Sıra

| Faz | Dosya | Konu | Öncelik |
|-----|-------|------|---------|
| 0 | [_foundation/phase-0-build-fix.md](_foundation/phase-0-build-fix.md) | Derlemeyi ayağa kaldır | ✅ `97a185e` |
| 1A | [_foundation/phase-1a-expo-sdk-57.md](_foundation/phase-1a-expo-sdk-57.md) | Expo SDK 55 → 57 | ✅ `365b597` |
| 1B | [_foundation/phase-1b-kui-native-package.md](_foundation/phase-1b-kui-native-package.md) | kui-native paketleştirme (**KUInative reposunda**) + `v0.2.0` tag | ✅ KUInative `887ad72` · `v0.2.0` |
| 1C | [_foundation/phase-1c-kui-native-dependency.md](_foundation/phase-1c-kui-native-dependency.md) | kui-native git bağımlılığı + tek tasarım dili | ✅ `ff2e1e1` |
| 1D | [_foundation/phase-1d-design-parity.md](_foundation/phase-1d-design-parity.md) | next-boilerplate görsel paritesi (renk, font, tüm ekranlar) | 🔵 Devam ediyor |
| 2 | [_foundation/phase-2-transport.md](_foundation/phase-2-transport.md) | Transport katmanı (device bearer) | ⬜ Bekliyor |
| 3 | [auth/phase-3-dto-services.md](auth/phase-3-dto-services.md) | DTO + servis hizalaması | ⬜ Bekliyor |
| 4 | [auth/phase-4-auth-screens.md](auth/phase-4-auth-screens.md) | Auth çekirdek ekranları | ⬜ Bekliyor |
| 5 | [tenant/phase-5-tenancy-core.md](tenant/phase-5-tenancy-core.md) | Tenancy çekirdek | ⬜ Bekliyor |
| 6 | [auth_sso/phase-6-sso.md](auth_sso/phase-6-sso.md) | SSO / OAuth | ⛔ **SUNUCU DEĞİŞİKLİĞİNE BAĞIMLI** (bkz. K4) |

## Kilitli kararlar

- **K1 — Tenant bootstrap config ile.** Sunucuda kimlik doğrulamasız tenant keşif yüzeyi **yok** (`/api/public/*` taramasında tenant endpoint'i çıkmadı; `GET /api/tenants` GLOBAL scope ister; `GET /auth/me/tenants` oturum ister). Taze kurulum `EXPO_PUBLIC_DEFAULT_TENANT_ID`'ye login olur, sonra gerçek üyelik listesini çeker.
- **K2 — Tenant başına token çifti.** Device token **tek tenant'a** bağlıdır ve device için tenant-switch endpoint'i **kasıtlı olarak yoktur**. SecureStore anahtarları `accessToken:{tenantId}` / `refreshToken:{tenantId}` olur; daha önce girilmiş tenant'a geçiş parola sormaz.
- **K3 — Origin + tenant prefix interceptor.** `EXPO_PUBLIC_API_URL` sadece origin'dir; request interceptor her göreli yola `/api/tenant/{activeTenantId}/api` önekini ekler.
- **K4 — SSO cihazda sunucu değişikliği olmadan ÇALIŞMAZ.** OAuth callback `createSession`'ı audience vermeden çağırır → **`web` audience token** üretir, bearer yolu bunu reddeder. Ayrıca https bir web URL'ine yönlendirir, uygulama şemasına değil. İstemci tarafı eksiksiz kurulur; sunucu değişikliği gelmeden Faz 6 `KODLANDI` işaretlenmez.
- **K5 — kui-native tag'e sabitli git bağımlılığıdır.** Uygulama kodu bileşenleri yalnız `@/components/ui` barrel'ından alır. Barrel, kui-native'den **derin import** ile re-export eder (`kui-native/modules/ui/Button`). Tam barrel (`kui-native/modules/ui`) opsiyonel peer'leri (maps, video) çektiği için kullanılmaz. `node_modules` yaması ve `patch-package` yasaktır. Branch'e (`#main`) sabitleme de yasaktır.
- **AGENTS.md kuralları bağlayıcıdır:** `@/*` tek alias, NativeWind + `cn()`, Zustand + MMKV, token'lar yalnız SecureStore, tüm fetch `libs/axios` üzerinden, Zod ile parse, env `libs/env`, log `libs/logger`, ikon yalnız FontAwesome, kritik aksiyonlarda `expo-haptics`, toast `sonner-native`.
- **Katalog senkronu zorunlu:** ekran / bileşen / servis / store / DTO / lib değişen her fazın sonunda `npm run registry:snapshot` çalıştırılır ve üretilen dosyalar commit edilir.

## Bağımlılık grafiği (özet)

- Faz 1A ve Faz 2, Faz 0 olmadan **açılamaz** (repo derlenmiyor).
- Faz 1B (KUInative reposu) Faz 0'dan bağımsızdır, **hemen** paralel başlayabilir.
- Faz 1C, hem Faz 1A'ya (aynı SDK) hem Faz 1B'nin tag'ine dayanır.
- Faz 2, Faz 1A'dan sonra açılır (transport SDK 57 üzerinde bir kez doğrulansın). Faz 1B/1C ile paralel yürür.
- Faz 3, Faz 2'nin interceptor önekine dayanır — servis yolları ona göre göreli yazılır.
- Faz 4 ve Faz 5, Faz 3'ün DTO'larına ve Faz 1C'nin `@/components/ui` barrel'ına dayanır.
- Faz 5'in tenant-switch'i, Faz 2'nin tenant başına SecureStore anahtarlarına dayanır (K2).
- Faz 6, Faz 5'in aktif tenant kavramına dayanır; ayrıca sunucu tarafı bir değişikliğe bağımlıdır (K4).

## Sunucu sözleşmesi (salt okunur özet)

Adres şekli: **`/api/tenant/{tenantId}/api/<path>`** (`proxy.ts` bunu `/tenant/{tenantId}/api/<path>`'e rewrite eder).

| Yol | Gövde | Yanıt |
|---|---|---|
| `POST …/auth/device/login` | `{email, password, captchaToken?, rememberMe?, device?}` | `{accessToken, refreshToken, otpRequired, user, tenant, tenantMember, userSecurity, mustChangePassword, passwordExpiresInDays}` |
| `POST …/auth/device/refresh` | `{refreshToken}` | `{message, accessToken, refreshToken}` |

- Diğer tüm route'lar `Authorization: Bearer <accessToken>` kabul eder; cookie yoksa audience `device` seçilir (`user_session.service.next.ts:63`).
- **Device audience'ta device-fingerprint doğrulaması yoktur** (`user_session.session.service.next.ts:95` yalnız `web` için türetir) ve **bearer istekleri CSRF'den muaftır** (`modules/common/server/csrf.ts`). IP / User-Agent değişimi oturumu düşürmez.
- `TokenAudience = "web" | "device"` (`user_session.token.service.ts:25`). Access ~1h, refresh ~7d, refresh rotate olur ve reuse detection vardır.
- JWT payload `{userId, userSessionId, tenantId, …}` — token **tek tenant'a** bağlıdır.
- Hata zarfı **tek tip değildir**, dört şekil de karşılanmalıdır: `{message, code}` · `{message:'Validation error', issues:[…]}` · `{error: <string>}` · `{error: <zod issues[]>}`.

## Her faz dosyasının formatı

`Hedef` · `Görevler (checkbox)` · `Dokunulan / oluşturulan dosyalar` · `Yeniden kullan` · `Kabul kriterleri` · `Riskler`.
Tamamlanınca dosyanın altına `---` + `## ✅ KODLANDI — <tarih>` damgası ve varsa `**Bilinçli sapmalar:**` listesi eklenir; bu dosyadaki §Sıra satırı commit SHA'sıyla güncellenir.
