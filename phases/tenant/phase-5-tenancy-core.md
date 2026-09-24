<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans
  3. phases/README.md (§Kilitli kararlar K1–K2)
  4. phases/tenant/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 5 — Tenancy çekirdek

**Hedef:** Tenant seçimi, geçişi ve oluşturma uçtan uca çalışsın; birden fazla tenant üyesi kullanıcı ikisi arasında parola sormadan geçebilsin.

## 5.1 Store

- [ ] `stores/tenantStore.ts` alanları:
  - `activeTenantId: string | null` — **transport'un okuduğu tek kaynak** (Faz 2 interceptor'ı).
  - `selectedTenantMembership: TenantMember | null` (mevcut)
  - `memberships: TenantMember[]` (mevcut)
  - **Yeni** `delegatedTenants: []`, `pendingInvitations: []`
  - **Yeni** `knownTenantIds: string[]` — SecureStore anahtar temizliği için (Faz 2'nin `clearAllTokens`'ı bunu okur).
- [ ] Aksiyonlar: `setMemberships`, `selectMembership`, `setActiveTenant(tenantId)`, `flush()`.
- [ ] `flush()` **tüm** tenant token'larını siler (`clearAllTokens`) ve `knownTenantIds`'i boşaltır.
- [ ] İlk açılışta `activeTenantId` boşsa `env.EXPO_PUBLIC_DEFAULT_TENANT_ID`'ye düşer (K1).

## 5.2 Tenant seçimi

- [ ] `app/(auth)/select-tenant.tsx` → `GET /auth/me/tenants`.
  - Yanıt `{tenants, delegatedTenants, pendingInvitations}` — üçü de store'a yazılır.
  - Liste `memberStatus === 'ACTIVE'` olanları öne alır; `INACTIVE` / `SUSPENDED` / `PENDING` ayrı gruplanır ve seçilemez.
  - `tenant.tenantStatus !== 'ACTIVE'` olanlar işaretlenir ve seçilemez (login zaten 404 döner).
- [ ] Bekleyen davetler gösterilir ama **kabul/ret bu fazın kapsamı dışıdır** (invitations seti) — yalnızca "N bekleyen davetiniz var" bilgisi.
- [ ] Boş liste durumu `EmptyState` ile: "Hiçbir organizasyona üye değilsiniz" + "Organizasyon oluştur" aksiyonu.

## 5.3 Tenant geçişi (K2)

- [ ] Seçilen tenant için `getToken('accessToken', tenantId)` kontrol edilir:
  - **Token varsa** → `setActiveTenant(tenantId)`, `GET /auth/session` ile doğrula, drawer'a gir. **Parola sorulmaz.**
  - **Token yoksa** → o tenant için login ekranı açılır (`/login?tenantId=...`); başarılı login `deviceLogin` ile o tenant'ın çiftini yazar.
  - **Token var ama `GET /auth/session` 401** → interceptor refresh dener; o da düşerse token temizlenir ve login'e düşülür.
- [ ] Geçiş sonrası `authStore.user` tazelenir — kullanıcı aynı olsa da `tenantMember.memberRole` tenant'a göre değişir.
- [ ] Drawer'da aktif tenant adı görünür ve oradan hızlı geçiş açılır (`UserMenu` veya `DrawerContent` başlığı).

## 5.4 Tenant oluşturma

- [ ] `app/(auth)/create-tenant.tsx` → `POST /tenants/create` gövde `{name, description?, region?}`.
  - Yanıt `{success, tenant: {tenantId, name, description, tenantStatus}, message}`; oluşturan kullanıcı `OWNER` olur.
  - Başarıda: yeni tenant için **login gerekir** (yeni tenant'a ait token yok) → `deviceLogin` ile o tenant'a giriş yapılır ve aktif tenant o olur.
- [ ] `region` alanı sunucunun `TenantRegionSchema` enum'undan; varsayılan `TR`.
- [ ] Ekran `app/(auth)/_layout.tsx`'teki `Stack.Screen` listesinde tanımlı olmalı (Faz 0'da eklendi).

## 5.5 Tenant profili

- [ ] `app/(drawer)/settings/tenant/index.tsx` → `GET /tenant/profile` (`{name, description}`), `PUT /tenant/profile` (`UpdateOwnTenantProfileDTO`).
- [ ] Yalnız `OWNER` / `ADMIN` düzenleyebilir; `memberRole` `USER` ise alanlar salt okunur.
- [ ] `tenantStatus`, `region`, üyelik rolü bilgi olarak gösterilir.

## Dokunulan / oluşturulan dosyalar

- Değişen: `stores/tenantStore.ts`, `app/(auth)/{select-tenant,create-tenant,login}.tsx`, `app/(drawer)/settings/tenant/index.tsx`, `components/shell/{DrawerContent,UserMenu}.tsx`, `services/tenant.service.client.ts`, `libs/secureStorage.ts` (`knownTenantIds` entegrasyonu)
- Test: `__tests__/` altında tenant geçişi (token var / yok), `flush()` temizliği, pasif tenant reddi

## Yeniden kullan

- **Faz 4'ün login akışı** — tenant geçişindeki login ayrı implementasyon değildir, aynı ekran `tenantId` parametresiyle açılır.
- `libs/secureStorage.ts` tenant başına anahtarlar (Faz 2) — geçişin tüm mekaniği buna dayanır.
- `libs/axios.ts` interceptor'ının `TENANT_INACTIVE` / `NOT_TENANT_MEMBER` yönlendirmesi (Faz 2) — ekranlar bu hataları ayrıca yakalamaz.
- `dto/tenant.dto.ts` (Faz 3'te hizalandı) — `SafeTenant`, `MyTenantsResponseSchema`.
- `@/components/ui` (kui-native, Faz 1C): `Card`, `Badge`, `EmptyState`, `Avatar`, `Select`, `Spinner`.
- `app/(drawer)/settings/tenant/{members,invitations}.tsx` — **dokunulmaz**, kapsam dışı.

## Kabul kriterleri

- İki tenant üyesi kullanıcı, ikisine de bir kez giriş yaptıktan sonra aralarında **parola sormadan** geçer.
- Hiç girilmemiş tenant seçilince o tenant için login istenir ve başarılı girişte aktif tenant değişir.
- Askıya alınmış tenant seçilemez; zorlanırsa `TENANT_INACTIVE` yakalanır ve seçim ekranına dönülür.
- `logout` sonrası cihazda **hiçbir** tenant'ın token'ı kalmaz (SecureStore doğrulaması ile test edilir).
- Yeni tenant oluşturan kullanıcı `OWNER` olarak o tenant'a girer.
- `USER` rolündeki üye tenant profilini **düzenleyemez** (alanlar salt okunur).
- Hiç üyeliği olmayan kullanıcıya boş durum ekranı ve "Organizasyon oluştur" aksiyonu gösterilir.
- `npm run registry:snapshot` sonrası katalog güncel.

## Riskler

- **Oturum sızıntısı (en kritik):** `logout` yalnız aktif tenant'ın token'ını silerse, diğer tenant'ın refresh token'ı cihazda **7 gün** canlı kalır. `knownTenantIds` listesi güncel tutulmazsa bu sessizce olur — testle kapatılmalı.
- **`activeTenantId` ile token uyumsuzluğu:** store'da tenant A aktifken SecureStore'dan tenant B'nin token'ı okunursa **her** istek 401 döner. Okuma her zaman `activeTenantId` ile aynı anahtardan yapılmalı.
- **Boş bootstrap:** `EXPO_PUBLIC_DEFAULT_TENANT_ID` yanlış / pasif bir uuid ise uygulama ilk açılışta login edilemez hale gelir ve kullanıcıya anlamsız 404 gösterir → env doğrulaması ve net hata mesajı şart.
- **Geçişte rol karışması:** `tenantMember.memberRole` tenant'a özgüdür; geçişte tazelenmezse kullanıcı yanlış tenant'ta ADMIN görünür ve yetkisi olmayan ekranlar açılır.
- **Davet gösteriminin kapsam kaymasına yol açması:** "bekleyen davet" listesi gösterilirken kabul/ret düğmesi eklenirse kapsam dışına taşılır; bu fazda **yalnız bilgi** gösterilir.
