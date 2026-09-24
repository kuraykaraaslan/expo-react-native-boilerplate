<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. internal-ai-rules: UI_Interface_Rules_ReactNative (appshell-compliance.md BLOCKING) → UI_Interface_Rules_Common → Code_Structure_Rules_ReactNative
  3. next-boilerplate UI — SALT OKUNUR görsel referans
  4. phases/README.md (§Kilitli kararlar)
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 1D — next-boilerplate görsel paritesi

**Hedef:** Mobil uygulama next-boilerplate ile **aynı ürün** gibi görünsün: aynı renkler, aynı font, aynı sayfa kalıbı, aynı bileşen dili. Bunun için tüm ekranlar kui-native bileşenleriyle yeniden kurulur ve `internal-ai-rules` kurallarına uyar.

> **Sahibin kararı (2026-09-24):** Ana renk next-boilerplate ile aynı maviye (`#2563eb`) döner. Eski "marka rengi turuncu korunur" kararı **iptal edildi**. Bu faz Faz 2'den **önce** yapılır.

## Neden (tespit)

Sahip, mobil arayüzün next-boilerplate'ten "çok kopuk" olduğunu söyledi. Karşılaştırmada ortaya çıkanlar:

- **Renk:** mobil turuncuydu, next mavi.
- **Font:** mobil sistem fontunu kullanıyor, next Inter.
- **Sayfa kalıbı:** ekranlar el yapımı `TextInput` + `TouchableOpacity` + ham Tailwind gri/turuncu sınıflarıyla yazılmıştı. next'teki PageHeader, başlıklı Card ve rozet dili yoktu.
- **Faz 1C'nin kapsamı:** yalnız shell'i ve spinner'ı taşımıştı; `internal-ai-rules` hiç okunmamıştı.

## Referans (next-boilerplate'ten)

### Token'lar

Token'lar kui-native varsayılanlarından yalnız şu noktalarda ayrılır:

- **Açık tema:**
  - `primary #2563eb`, `primary-hover #1d4ed8`, `primary-active #1e40af`
  - `text-secondary #4b5563`, `text-disabled #6b7280`
- **Koyu tema:** `text-disabled #8a99b0`
- **Font:** Inter.

### Bileşen kalıpları

- **PageHeader:** başlık `text-2xl` bold, isteğe bağlı rozet, `text-sm` ikincil alt başlık, sağda aksiyonlar, altında `pb-5 border-b`.
- **Card:** `rounded-xl border` + `shadow-sm`.
  - Header: `px-6 py-4`, başlık `text-sm` semibold, açıklama `text-xs`.
  - Footer: `px-6 py-3`, zemin `bg-surface-base`.
- **Rozet renkleri:**
  - Rol: OWNER=primary, ADMIN=warning, USER=neutral.
  - Davet: Pending=warning, Accepted=success, Declined=error, Expired/Revoked=neutral.
- **Avatar:** baş harfler, `bg-primary-subtle text-primary`.
- **Auth ekranları:**
  - Ortada `max-w-md` kart: `rounded-2xl border bg-surface-raised shadow-sm p-8`.
  - Kartın üstünde BrandLogo (48px), H1 ve alt başlık.
  - İkincil bağlantı kartın **altında**.
  - Sıralama: önce SSO butonları, sonra "veya e-posta ile devam edin" ayırıcısı, sonra form.
- **Kabuk (shell):**
  - Marka satırı: 28px `bg-primary` kalkan logosu + başlık.
  - Menü grupları küçük büyük harfli etiketlerle ayrılır.
  - Aktif öğe: `bg-primary-subtle text-primary font-medium`.
  - Üst bar sağ grubu: bayrak + dil kodu → tema → zil → avatar.
  - Kullanıcı menüsü: ad ve e-posta başlığı, "Profilim", "Çıkış yap".
- **Metinler:** next'in `modules/*/dictionaries/{en,tr}.json` dosyalarındaki metinlerle birebir aynı.

## Görevler

### 1D.1 Renk + font

- [x] `libs/theme/brand.ts` → next token override'ları. `global.css` açık tema fallback'leri buna göre güncellendi.
- [ ] kui-native `configureFonts()`: **KUInative reposunda**, yeni tag `v0.3.0`. Tag push'u sahip onayına bağlı.
- [ ] Inter font: `@expo-google-fonts/inter` paketi, kök layout'ta `useFonts` ile yüklenir, `configureFonts` Inter'e ayarlanır.

### 1D.2 Kabuk

- [ ] **DrawerContent:**
  - Marka satırı: BrandLogo + organizasyon adı.
  - Gruplar: GENEL (Panel, Bildirimler), HESAP (Profilim, Oturumlar), ORGANİZASYON (Üyeler, Davetler, Ayarlar).
  - Alt kısım: dil + tema.
  - **Genişlik 256pt kalır.** Blocking kural; next'in mobil drawer'ı 288px ama kural önce gelir.
- [ ] **AppHeader:** solda hamburger; sağda LangSwitcher (bayrak + kod), ThemeToggle, bildirim zili (okunmamış sayısı; bildirimler ekranına gider) ve UserMenu.
- [ ] **UserMenu:** DropdownMenu. Başlıkta ad ve e-posta; öğeler: Profilim, Çıkış yap (kırmızı, `libs/logout.ts`).
- [ ] **LangSwitcher:**
  - Tetikleyici: bayrak (emoji) + kod.
  - Menü: bayrak + yerel dil adı.
  - Liste `SUPPORTED_LOCALES`'ten gelir.

### 1D.3 Auth

- [ ] `components/auth/AuthShell.tsx`: next'in auth kartı. Sağ üstte LangSwitcher + ThemeToggle (kuralın istisnası). `KeyboardAvoidingView` + `ScrollView`.
- [ ] **login:** SSO → ayırıcı → E-posta (zarf ikonu) → Parola (kilit ikonu + göster/gizle) → Beni hatırla → Giriş yap → "Parolanızı mı unuttunuz?". Kart altında "Hesabınız yok mu? Kayıt ol".
  - Önceden doldurulmuş `admin@admin.com` kaldırılır.
- [ ] **register:** E-posta, Parola ("En az 8 karakter"), Parolayı doğrula. Alanların altında satır içi Zod hataları.
- [ ] **forgot-password:** form ve "Gelen kutunuzu kontrol edin" başarı durumu.
- [ ] **2fa:** next'te karşılığı yok. Aynı AuthShell içinde 6 haneli kod girişi.
- [ ] **select-tenant:** organizasyon satırları (baş harf kutusu, ad, açıklama, rol, sağ ok) ve "Yeni organizasyon oluştur".
- [ ] **create-tenant:** Organizasyon adı (bina ikonu) + açıklama.

### 1D.4 Uygulama ekranları

- [ ] **Panel:**
  - PageHeader "Panel".
  - StatCard'lar: okunmamış bildirim, etkin oturum, organizasyon sayısı.
  - "Bu çalışma alanında" başlığı altında bağlantı karoları.
- [ ] **Bildirimler:** PageHeader + "Tümünü okundu işaretle". Satırlarda nokta, başlık, açıklama ve zaman; okunmamışlar hafif renkli zemin. EmptyState.
- [ ] **Ayarlar (hub):** next'in "Organizasyon ayarları" karo ızgarası. Bölümler: Hesap, Organizasyon. Hub kuralı gereği ayar alanı içermez.
- [ ] **Profilim:** PageHeader + rol rozeti + TabGroup:
  - **Profil:** Card içinde avatar, görünen ad, biyografi, "Profili kaydet".
  - **Güvenlik:** "Hesap güvenliği" kartı ve "Etkin oturumlar" kartı.
  - **Tercihler:** tema ve dil.
- [ ] **Oturumlar / Dil / E-posta değiştir:** aynı kartlar, hub'dan doğrudan erişim için ayrı ekranlar.
- [ ] **Üyeler:**
  - PageHeader ve "Üye davet et" butonu.
  - SearchBar.
  - Card içinde satırlar: avatar, ad/e-posta, rol rozeti, katılım tarihi, kebab menü (Düzenle / Kaldır).
  - Davet Modal'ı: E-posta + Rol.
- [ ] **Davetler:** PageHeader + "Yeni davet". "Bekleyen davetler" kartı; satırlarda e-posta, rol, durum rozeti, geçerlilik sonu, kebab menü (İptal et).

### 1D.5 Ortak kurallar (internal-ai-rules)

- Ekran kökü: SafeArea (drawer ekranlarında alt inset). Form ekranlarında `KeyboardAvoidingView`. Liste varsa `FlatList`. Ekran kenar boşluğu `px-4`.
- Her `catch` → `handleApiError`. Başarı → `toast.success`. Yıkıcı işlemler onay ister: başlık fiil + nesne, danger buton.
- Yükleme: spinner (next'in baskın kalıbı). Boş liste: EmptyState.
- Tüm metinler `t()` ile. TR ve EN anahtarları next metinleriyle aynı; diğer diller EN'e düşer.
- Ham hex yok. İstisnalar: FontAwesome `color` için `useThemeTokens()` ve SSO marka ikonları.
- Her etkileşimli öğede `accessibilityRole`/`Label` ve `testID` (`[modül]-[bileşen]-[bağlam]`).
- Veri çağrıları: servisler mevcut haliyle kalır. Hook pipeline'a geçiş Faz 3'e aittir.

### 1D.6 Doğrulama

- [ ] typecheck, test ve web export yeşil.
- [ ] Ekran görüntüleri `.junk/screenshots/after/{light,dark}/` altına; öncekiler `before/` içinde.
- [ ] Katalog snapshot'ı yenilenir. AGENTS.md ve README gerekirse güncellenir.

## Kural çatışmaları (sahip incelemesi için; bu fazda uygulanan seçim)

| # | Çatışma | Bu fazda |
|---|---|---|
| 1 | Kurallar kui-native'i "kopyala/uyarla" diyor. Sahip kararı ise git bağımlılığı. | Git bağımlılığı. `internal-ai-rules` güncellenmeli. |
| 2 | Kurallardaki token API'si camelCase (`t.surfaceBase` / `useTheme`). kui-native kebab kullanıyor (`useThemeTokens()`). | kui-native kebab. |
| 3 | `appshell-compliance` ham `bg-gray-50 dark:bg-gray-950` öneriyor. `color-tokens` bunu yasaklıyor. | Token sınıfları. |
| 4 | `LoadingSpinner` / `ActivityIndicator` mi, kui `Spinner` mı? | kui `Spinner`. |
| 5 | LangSwitcher kurallarda yalnız TR\|EN. next ve uygulama daha fazla dil destekliyor. | Açılır menü, `SUPPORTED_LOCALES`. |
| 6 | "Hata her zaman toast" (appshell) ile "satır içi hata / AlertBanner" (Common, next) çelişiyor. | API hatası → toast. Form alanı → satır içi. |
| 7 | Onay: `Alert.alert` (appshell) mi, stilli dialog (Common overlays) mı? | kui `Modal` ile stilli onay. |
| 8 | Gövde metni: `text-sm` (RN örnekleri) mi, "mobilde en az `text-base`" (Common) mı? | next ile aynı (`text-sm`). Common kuralına sapma olarak kaydedildi. |
| 9 | Drawer 256 (blocking) ile next mobil drawer 288 farklı. | 256. |

## Riskler

- **Font yükleme:** `configureFonts` kui-native tag'i gelmeden tam uygulanamaz. Tag gecikirse font adımı ayrı bir commit'e bırakılır.
- **Web ekran görüntüleri:** SecureStore web'de yok. Oturum mock'u yalnız scratchpad'deki build kopyasında yapılır; repo koduna dokunulmaz.
- **Kapsam:** servis ve DTO uyumsuzlukları (`/api/api/…`, `/api/system/*`) bu fazda **düzeltilmez**, Faz 2/3'e aittir. Ekran görüntüleri mock verilerle alınır.

---

## 🟡 KISMEN KODLANDI — 2026-09-24 (branch `feat/design-parity`) · font adımı sahip onayını bekliyor

Commit'ler: `f683be8` (palet) · `df888c8` (ortak bileşenler + TR/EN metinler) · `9c8efa6` (kabuk) · `093335b` (auth) · `b0d6af5` (uygulama ekranları) · `5ea333e` (katalog)

Doğrulama: typecheck 0 hata · test:ci 2/2 · web export başarılı · 19 ekran görüntüsü × açık/koyu (TR) `.junk/screenshots/after/{light,dark}/`. Sayfa hatası yok, her rota kendi adresinde açılıyor (drawer ve kullanıcı menüsü açık halleri dahil). Önceki durum `before/` altında.

**Kalan:** `configureFonts()` KUInative'de hazır: branch `feat/configurable-fonts`, `1b0db3a..a7d3117`, v0.3.0; testler 67 suite / 740. Merge, `v0.3.0` tag'i ve push sahip onayına bağlı. Ardından burada `@expo-google-fonts/inter` + `useFonts` + `configureFonts` eklenir ve bağımlılık `#v0.3.0`'a yükseltilir.

**Bilinçli sapmalar / bulgular:**
- **1C hatası düzeltildi:** DropdownMenu, `onPress`'i tetikleyici elemana enjekte ediyor. 1C'deki `View` tetikleyicili LangSwitcher bu yüzden **hiç açılmıyordu**. Tüm tetikleyiciler artık `Pressable`.
- **Bayraklar emoji:** Windows Chrome bayrak emojisi çizemediği için ekran görüntülerinde "TR" harfleri görünüyor. iOS ve Android'de bayrak çıkar.
- **Koyu tema kontrastı:** birincil buton (`#60a5fa` üzerinde beyaz metin, ~2.5:1) 4.5:1 kuralını karşılamıyor. next-boilerplate'te de aynı değerler var; parite korundu. Düzeltme iki projede birlikte yapılmalı.
- **Metin boyutu:** gövde metni `text-sm` (next ile aynı). Common kuralı mobilde en az `text-base` istiyor, bu yüzden sapma olarak kayıtlı.
- **Hata gösterimi:** API hataları toast ile, form hataları alan altında satır içi.
- **Onay diyalogları:** `Alert.alert` yerine stilli `ConfirmDialog` (kui `Modal`) kullanıldı.
- **2FA ekranı:** next'te karşılığı yok; aynı auth kartı kalıbıyla tasarlandı.
- **Tercihler:** tema + dil seçimi hemen uygulanıyor, kaydet butonu yok. next'teki bildirim tercihleri, saat dilimi ve tarih formatı bu fazda yok (sunucu sözleşmesi yok).
- **Oturumlar:** "Mevcut oturum" rozeti yok. Sunucu hangi oturumun bu cihaza ait olduğunu dönmüyor.
- **Açık akış hatası (Faz 4/5'e):** `select-tenant` `(auth)` grubunda. Grup layout'u oturum açmış kullanıcıyı `/`'e yönlendirdiği için girişten sonra organizasyon seçim ekranı atlanıyor.
- **Açık transport hatası (Faz 2'ye):** `baseURL` `…/api/` ile bitiyor, servis yolları da `/api/…` ile başlıyor. Sonuçta istekler `/api/api/…` adresine gidiyor. Ekran görüntüsü mock'u bu yolu kabul edecek şekilde yazıldı.
- **Testler:** yeni ekranlar için RNTL testi yazılmadı; yalnız mevcut smoke testi var. Hook pipeline'ı ile birlikte Faz 3'te eklenecek.
