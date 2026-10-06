<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans
  3. phases/README.md (§Kilitli kararlar K4)
  4. phases/auth_sso/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 6 — SSO / OAuth (⛔ sunucu değişikliğine bağımlı)

**Hedef:** İstemci tarafını eksiksiz kur; sunucu engelini (K4) kullanıcıya ve geliştiriciye **açıkça** bildir. Sunucu değişikliği geldiği an ek kod yazmadan çalışsın.

> **Bu faz, sunucu tarafı tamamlanmadan `KODLANDI` işaretlenmez.** Gerekçe ve istenen değişiklik: `phases/auth_sso/README.md`.

## 6.1 Sağlayıcı listesi

- [ ] `services/auth/sso.service.client.ts` (Faz 3'te oluşturuldu) → `getProviders()` `GET /auth/sso` yanıtı `{providers: [...]}`, `SSOProvidersResponseSchema` ile parse edilir.
- [ ] `components/auth/SSOButtons.tsx` → içindeki **sabit sağlayıcı listesi kaldırılır**; tenant'ın izin verdikleri sunucudan gelir (`SSOService.isProviderEnabled` tenant başına gate'liyor).
- [ ] Sağlayıcı ikonları `@fortawesome/free-brands-svg-icons`'tan eşlenir (AGENTS.md §6 Kural 10: FontAwesome dışı ikon kütüphanesi yok). Karşılığı olmayan sağlayıcı için nötr fallback.
- [ ] Liste boşsa SSO bölümü **hiç render edilmez** (ayırıcı çizgi dahil).

## 6.2 Tarayıcı akışı

- [ ] `GET /auth/sso/{provider}` → `{url, state}`; `state` saklanır ve dönüşte karşılaştırılır (CSRF/karışık akış koruması).
- [ ] `app.config.ts`'e `scheme` eklenir (örn. `expoboilerplate`) — `reset-password` deep link'i de bunu kullanır.
- [ ] `expo-web-browser` → `openAuthSessionAsync(url, redirectUrl)`; `redirectUrl` `expo-linking`'in `createURL('/auth/callback')` çıktısı.
- [ ] `expo-linking` handler'ı `<scheme>://auth/callback?rawAccessToken=…&rawRefreshToken=…` yakalar:
  - `state` eşleşmesi doğrulanır.
  - Token'lar `setToken(kind, activeTenantId, value)` ile yazılır.
  - `GET /auth/session` ile doğrulanır, `authStore` + `tenantStore` doldurulur.
- [ ] Kullanıcı tarayıcıyı kapatırsa (`type: 'cancel'` / `'dismiss'`) sessizce login ekranında kalınır, hata gösterilmez.

## 6.3 Engel davranışı (sunucu değişikliği gelene kadar)

- [ ] Akış **web audience** token ile dönerse (bugünkü durum): `GET /auth/session` 401 döner.
- [ ] Bu hâl **özel olarak** yakalanır:
  - `logger.error` ile "SSO callback returned a web-audience token; device bearer flow requires server-side `audience: 'device'` — see phases/auth_sso/README.md" loglanır.
  - Kullanıcıya `toast.error` ile anlaşılır mesaj: "Sosyal giriş şu an kullanılamıyor, lütfen e-posta ile giriş yapın."
  - Token'lar **yazılmaz** (yazılırsa her istek 401 döner ve kullanıcı kilitli kalır).
- [ ] Yönlendirme https bir adrese düşüp tarayıcı kapanmazsa zaman aşımı sonrası aynı mesaj gösterilir.

## 6.4 Bağlı hesaplar (kapsamın sınırı)

- [ ] `GET /auth/me/social-accounts` ile bağlı hesaplar **listelenir** (salt okunur).
- [ ] Bağlama / çözme (`connect/{provider}`, `DELETE /{provider}`) **bu fazın kapsamı dışıdır** — aynı callback engeline takılır, sunucu değişikliği sonrasına bırakılır.

## Dokunulan / oluşturulan dosyalar

- Değişen: `components/auth/SSOButtons.tsx`, `app/(auth)/login.tsx` (SSO girişi), `app.config.ts` (+`scheme`), `package.json` (`expo-web-browser` ve `expo-linking` zaten var — doğrulanır)
- Yeni: `libs/ssoSession.ts` (tarayıcı akışı + deep-link handler), `app/(drawer)/settings/social-accounts.tsx` (salt okunur liste)
- Test: `__tests__/` altında sağlayıcı listesi, state uyuşmazlığı, web-audience engeli

## Yeniden kullan

- `services/auth/sso.service.client.ts` + `services/auth/sso.dto.ts` — Faz 3'te oluşturuldu, burada yalnız tüketilir.
- `libs/secureStorage.ts` tenant başına anahtarlar (Faz 2).
- `stores/tenantStore.ts:activeTenantId` (Faz 5) — `state`'in tenant yarısı buradan.
- `libs/apiError.ts` (Faz 2), `libs/logger.ts`, `sonner-native`.
- `expo-web-browser` + `expo-linking` — ikisi de `package.json`'da mevcut, yeni bağımlılık yok.
- `@/components/ui` (kui-native, Faz 1C): `Button`, `Separator`, `AlertBanner`, `Spinner`.

## Kabul kriterleri

**Sunucu değişikliği YOKKEN** (bu fazın teslim edilebilir hâli):

- `GET /auth/sso` sağlayıcı listesi gelir ve butonlar tenant'ın izin verdiklerini gösterir; liste boşsa bölüm hiç çıkmaz.
- Butona basınca tarayıcı doğru provider URL'iyle açılır.
- Dönüşte web-audience engeli **açıkça loglanır** ve kullanıcıya anlaşılır mesaj gösterilir; **token yazılmaz**, kullanıcı kilitlenmez.
- Kullanıcı tarayıcıyı kapatırsa hata gösterilmez.
- `state` uyuşmazlığında akış reddedilir.

**Sunucu değişikliği GELDİKTEN sonra** (fazın `KODLANDI` şartı):

- Google ile giriş uygulamaya geri döner, token'lar yazılır, `GET /auth/session` 200 döner ve kullanıcı drawer'a girer.
- Sonraki tüm bearer istekleri çalışır (audience `device`).

## Riskler

- **Engelin "geçici çözümle" aşılmaya çalışılması:** cookie tutan bir WebView ile oturum taşımak teknik olarak mümkün görünür ama uygulamayı bearer ile cookie arasında bölünmüş bir kimlik modeline sokar ve Faz 2'nin tüm refresh mantığını geçersizleştirir. **Yapılmayacak.**
- **Token'ın yine de yazılması:** web-audience token SecureStore'a yazılırsa kullanıcı, her isteği 401 dönen bir "giriş yapılmış" duruma kilitlenir ve çıkışı bulamaz. En kötü senaryo.
- **`scheme` çakışması:** seçilen şema başka bir uygulamayla çakışırsa deep link yanlış uygulamaya gider; yeterince özgün seçilmeli.
- **`state` saklama yeri:** MMKV'ye yazılırsa uygulama arka plana atılıp dönerse kaybolmaz; bellekte tutulursa kaybolur ve akış her seferinde reddedilir.
- **Sağlayıcı ikonu eksikliği:** FontAwesome brands'te karşılığı olmayan sağlayıcı (autodesk, weibo, alipay) için fallback yoksa render kırılır.
- **Faz durumunun yanlış işaretlenmesi:** istemci tarafı bitti diye `KODLANDI` yazılırsa, sonraki okuyucu SSO'yu çalışır sanır. §Sıra satırı sunucu değişikliği gelene kadar `⛔ SUNUCUYA BAĞIMLI` kalmalı.
