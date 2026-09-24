<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/tenant/server/tenant.{dto,types}.ts · modules/account (auth/me/tenants) ·
     modules/user_session/server/user_session.token.service.ts (TokenPayload.tenantId)
  3. phases/README.md (§Kilitli kararlar K1–K2)
  4. phases/tenant/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# tenant — tenant seçimi, geçişi ve oluşturma (Faz Planı index)

> **Bu yeni bir modül değildir.** Mevcut `stores/tenantStore.ts`, `services/tenant.service.client.ts`
> ve `app/(auth)/{select-tenant,create-tenant}.tsx` ekranlarını device token'ın tenant bağlamasına göre yeniden bağlar.

## Neden (bağlam)

Device token **tek bir tenant'a** bağlıdır (`TokenPayload.tenantId`) ve başka tenant'ın route'ları tarafından reddedilir. Sunucu device akışı için **bilinçli olarak** tenant-switch endpoint'i sunmaz — yorumu birebir şöyle der: *"a device install is expected to hold one tenant's credentials at a time"*.

Bu iki sonucu doğurur ve ikisi de bugün istemcide çözülmemiştir:

1. **Bootstrap tavuk-yumurta problemi.** Login için URL'de tenantId şarttır; tenant listesi (`GET /auth/me/tenants`) ise mevcut oturum ister. Sunucuda kimlik doğrulamasız tenant keşif yüzeyi **yoktur** (`/api/public/*` taramasında tenant endpoint'i yok; `GET /api/tenants` GLOBAL scope ister).
2. **Geçiş problemi.** Tenant değiştirmek, o tenant için **yeni bir token çifti** almak demektir.

Ayrıca `MyTenantsResponseSchema` bugün `{tenants, invitations}` diyor; sunucu `{tenants, delegatedTenants, pendingInvitations}` döndürüyor.

## Sıra

| Faz | Dosya | Konu | Öncelik |
|-----|-------|------|---------|
| 5 | [phase-5-tenancy-core.md](phase-5-tenancy-core.md) | Tenancy çekirdek | ⬜ Bekliyor |

## Kilitli kararlar

- **K1 — Bootstrap config ile.** `EXPO_PUBLIC_DEFAULT_TENANT_ID` zorunlu env'dir. Taze kurulum bu tenant'a login olur, sonra gerçek üyelik listesini çeker.
- **K2 — Tenant başına token çifti.** SecureStore anahtarları `accessToken:{tenantId}` / `refreshToken:{tenantId}`. Daha önce girilmiş tenant'a geçiş **parola sormaz**; hiç girilmemiş tenant'a geçişte o tenant için login istenir. Takas: cihazda N adet refresh token durur, bu yüzden `logout` ve `flush()` **hepsini** silmek zorundadır.
- **`activeTenantId` tek kaynaktır.** Transport (Faz 2 interceptor'ı) yalnız `tenantStore.activeTenantId`'yi okur; başka hiçbir yerde tenant yolu kurulmaz.
- **Members / invitations / roles kapsam dışıdır.** `app/(drawer)/settings/tenant/{members,invitations}.tsx` ve ilgili servis metotları bu sette **dokunulmadan** bırakılır.

## Bağımlılık grafiği (özet)

- Faz 5, Faz 2'nin tenant başına SecureStore anahtarlarına ve `activeTenantId` alanına dayanır.
- Faz 5, Faz 3'ün düzeltilmiş `MyTenantsResponseSchema` ve `SafeTenant` şemalarına dayanır.
- Faz 5, Faz 4'ün login akışını **yeniden kullanır** — tenant geçişinde ayrı bir login implementasyonu yazılmaz.
- Faz 6 (SSO), Faz 5'in `activeTenantId` kavramına dayanır (`state = "{tenantId}.{uuid}"`).

## Her faz dosyasının formatı

`Hedef` · `Görevler (checkbox)` · `Dokunulan / oluşturulan dosyalar` · `Yeniden kullan` · `Kabul kriterleri` · `Riskler`.
