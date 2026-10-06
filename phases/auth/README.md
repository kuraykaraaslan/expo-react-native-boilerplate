<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user/server/user.types.ts · modules/user_session/server/user_session.types.ts
  3. phases/README.md (§Kilitli kararlar)
  4. phases/auth/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# auth — device bearer kimlik akışı (Faz Planı index)

> **Bu yeni bir modül değildir.** Mevcut `services/auth/auth.dto.ts`, `services/auth/auth.service.client.ts`, `stores/authStore.ts`
> ve `app/(auth)/**` ekranlarını sunucunun gerçek sözleşmesine hizalar. Hiçbir ekran sıfırdan yazılmaz.

## Neden (bağlam)

İstemcinin auth katmanı bugün **uydurma bir sözleşme** konuşuyor:

- `AuthClientService`'in on metodunun tamamı `/api/system/auth/*` çağırıyor — sunucuda bu yol **hiç yok**.
- `UserSchema` = `{userId, email, name, phone, image, userRole, language, theme, …}`; sunucunun `SafeUser`'ı = `{userId, email, phone, userRole, userStatus, emailVerifiedAt, createdAt, updatedAt, userProfile?}`. `name` / `image` / `language` / `theme` **`SafeUser`'da yok**, `userProfile` ve `preferences` altında.
- `LoginResponseSchema` = `{user, userSecurity}`; device login'in gerçek yanıtı **dokuz alanlı**.
- `OTPVerifyRequestSchema` = `{code, method}`; sunucu `{method, action, otpToken}` bekliyor — üç alanın ikisi farklı.
- `ChangeEmailRequestSchema` var ama sunucuda `/auth/change-email` **yok**.

Yani bu set olmadan hiçbir auth çağrısı 200 dönmez; dönse bile `.parse()` kırılır.

## Sıra

| Faz | Dosya | Konu | Öncelik |
|-----|-------|------|---------|
| 3 | [phase-3-dto-services.md](phase-3-dto-services.md) | DTO + servis hizalaması | ⬜ Bekliyor |
| 4 | [phase-4-auth-screens.md](phase-4-auth-screens.md) | Auth çekirdek ekranları | ⬜ Bekliyor |

## Kilitli kararlar

- **DTO'lar sunucunun `Safe*` şemalarının aynasıdır.** İstemci kendi rahatı için alan uydurmaz; eksik alan varsa sunucudaki gerçek kaynağından (`userProfile`, `preferences`) çekilir.
- **Servis yolları interceptor önekine göre görelidir.** Servislerde `/api/tenant/...` yazılmaz; `/auth/device/login` yazılır, öneki Faz 2'nin interceptor'ı ekler.
- **Token'lar Zustand'a asla girmez** (AGENTS.md §6 Kural 5). `authStore` yalnız `isAuthenticated` + `user` tutar.
- **Members / invitations / roles kapsam dışıdır.** `services/tenant/tenant.service.client.ts`'teki ilgili metotlar bu sette **dokunulmadan** bırakılır; yalnızca interceptor öneki sayesinde yolları kendiliğinden düzelir.
- **`change-email` ekranı silinmez**, sunucudaki gerçek karşılığına (`/auth/me/complete-email` + `/auth/verify-email/*`) yeniden bağlanır.

## Bağımlılık grafiği (özet)

- Faz 3, Faz 2'nin interceptor önekine ve `normalizeApiError`'a dayanır.
- Faz 4, Faz 3'ün DTO'larına ve Faz 1C'nin `@/components/ui` barrel'ına (kui-native git paketi) dayanır.
- Faz 5 (tenancy) ve Faz 6 (SSO), Faz 4'ün oturum kurma akışına dayanır.

## Her faz dosyasının formatı

`Hedef` · `Görevler (checkbox)` · `Dokunulan / oluşturulan dosyalar` · `Yeniden kullan` · `Kabul kriterleri` · `Riskler`.
