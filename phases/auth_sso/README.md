<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/auth_sso/server/{sso.route,sso-provider.route,auth_sso.config,auth_sso.dto}.ts ·
     app/api/auth/callback/[provider]/route.ts ·
     modules/user_session/server/user_session.token.service.ts (TokenAudience)
  3. phases/README.md (§Kilitli kararlar K4)
  4. phases/auth_sso/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# auth_sso — sosyal giriş (Faz Planı index)

> ⛔ **BU SET SUNUCU DEĞİŞİKLİĞİNE BAĞIMLIDIR.** İstemci tarafı eksiksiz kurulur, ancak
> sahibi `next-boilerplate`'te aşağıdaki iki değişikliği yapmadan akış **çalışamaz** ve faz
> `KODLANDI` işaretlenmez. Sahip kararı gereği bu repodan sunucuya dokunulmaz.

## Neden çalışmıyor (K4 — kod okumasıyla doğrulandı)

`app/api/auth/callback/[provider]/route.ts` iki şey yapıyor:

1. **`createSession({ user, request, userSecurity, otpIgnore: true, tenantId })` — `audience` parametresi vermiyor.**
   `user_session.crud.service.ts:43` varsayılanı `"web"`. Yani SSO ile üretilen token çifti **`web` audience**'tadır.
   Bearer yolu (`user_session.service.next.ts:63`) cookie yokken audience'ı **`device`** seçer ve
   `verifyAccessToken` bu token'ı reddeder. **Bu istemci tarafında aşılamaz.**
2. **`${APP_HOST}/tenant/{tenantId}/auth/callback?rawAccessToken=…&rawRefreshToken=…` adresine yönlendiriyor** —
   yani **https bir web URL'ine**, uygulama şemasına değil. `openAuthSessionAsync` yalnız kendi verdiği
   `redirectUrl`'e varınca kapanır; https bir adrese varınca tarayıcı açık kalır.

Ayrıca manevra alanı yok: `sso-provider.route.ts` `state`'i `"{tenantId}.{uuid}"` olarak **kendisi** üretiyor
(içine dönüş adresi veya audience bayrağı koyacak yer yok) ve `auth_sso.config.ts`'te `callbackPath`
sağlayıcı başına **sabit**.

## Sunucudan istenen minimum değişiklik (sahibi uygular)

1. `app/api/auth/callback/[provider]/route.ts` → `createSession(...)` çağrısına `audience` seçeneği; device akışında `'device'` geçilmesi.
2. Device akışında son yönlendirmenin uygulama şemasına (`<scheme>://auth/callback?...`) yapılabilmesi; akışın device olduğunun `state` üzerinden taşınabilmesi.

## Sıra

| Faz | Dosya | Konu | Öncelik |
|-----|-------|------|---------|
| 6 | [phase-6-sso.md](phase-6-sso.md) | SSO / OAuth istemci tarafı | ⛔ **SUNUCUYA BAĞIMLI** |

## Kilitli kararlar

- **Sessiz başarısızlık yasak.** Sunucu değişikliği gelmeden akış denendiğinde kullanıcı anlamlı bir hata görür ve olay `libs/logger` ile loglanır; "bir şeyler ters gitti" ile geçiştirilmez.
- **İstemci tarafı eksiksiz kurulur.** Sağlayıcı listesi, `openAuthSessionAsync` akışı, deep-link handler ve DTO'lar bu fazda tamamlanır ki sunucu değişikliği gelince tek satır beklemeden çalışsın.
- **Sağlayıcı listesi sunucudan gelir.** `components/auth/SSOButtons.tsx`'teki sabit liste kaldırılır; tenant'ın izin verdiği sağlayıcılar `GET /auth/sso`'dan okunur.
- **Faz `KODLANDI` işaretlenmez** — sunucu tarafı tamamlanana kadar §Sıra satırı `⛔ SUNUCUYA BAĞIMLI` kalır.

## Bağımlılık grafiği (özet)

- Faz 6, Faz 3'ün `services/auth/sso.dto.ts`'ine ve `services/auth/sso.service.client.ts`'ine dayanır.
- Faz 6, Faz 5'in `activeTenantId`'sine dayanır (`state = "{tenantId}.{uuid}"`).
- `app.config.ts`'e eklenecek `scheme`, Faz 4'ün `reset-password` deep link'i tarafından da kullanılır.

## Her faz dosyasının formatı

`Hedef` · `Görevler (checkbox)` · `Dokunulan / oluşturulan dosyalar` · `Yeniden kullan` · `Kabul kriterleri` · `Riskler`.
