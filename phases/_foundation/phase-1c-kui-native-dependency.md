<!--
OTORİTE SIRASI (çakışmada üstteki kazanır):
  1. AGENTS.md (§6 Hard rules · §5 dosya adlandırma · §0 katalog senkronu)
  2. next-boilerplate sözleşmesi — SALT OKUNUR referans
  3. phases/README.md (§Kilitli kararlar)
  4. phases/_foundation/README.md
  5. BU DOSYA
TEK İSTİSNA: "Sahibin kararları (sabit)" — kayıtlı sahip kararı bu dosyanın önerisini yener.
NEREDE KALDIK: phases/README.md §Sıra
-->

# Faz 1C — kui-native git bağımlılığı + tek tasarım dili

**Hedef:** kui-native'i `package.json`'a **git bağımlılığı** olarak ekle. İki rakip stil sistemini (`components/ui/*` className ile `components/shell/*` inline `style={{}}`) kui-native token sistemine indir. Uygulama kodu kui-native bileşenlerini yalnız `@/components/ui` barrel'ından alsın.

> **Sahibin kararı (sabit, 2026-09-24):** kui-native **git paketi olarak kurulur**, kaynak kod repoya **kopyalanmaz**. Önceki "vendor et, bağımlılık yapma" kararı iptal edildi.
> Önkoşul: Faz 1A (SDK 57) ve Faz 1B (`v0.2.0` tag'i) tamamlanmış olmalı.

## 1C.1 Bağımlılık

- [x] `package.json` → `"kui-native": "git+https://github.com/kuraykaraaslan/kui-native.git#v0.2.0"`. Sürüm **her zaman bir tag'e** sabitlenir, branch'e (`#main`) asla sabitlenmez. `package-lock.json` çözülen commit SHA'sını kaydeder.
- [ ] Repo **public**: `github:` kısaltması https üzerinden kimlik bilgisi olmadan çözülür. CI ve EAS için ek ayar gerekmez. `package-lock.json`'da URL'nin `git+ssh` değil `git+https` olarak kaydedildiği doğrulanır; ssh kalırsa SSH anahtarı olmayan CI ortamı klonlayamaz.
- [ ] Opsiyonel peer'ler (`expo-video`, `react-native-maps`, `leaflet`, …) **kurulmaz**. Boilerplate bu bileşenleri kullanmaz.
- [ ] Güncelleme prosedürü `README.md`'ye yazılır: kui-native'de yeni tag → `package.json`'da tag değişir → `npm install` → typecheck + test → ayrı commit (`chore(deps): kui-native vX.Y.Z`).

## 1C.2 Build entegrasyonu

- [ ] `tailwind.config.js` → `content`'e `"./node_modules/kui-native/modules/ui/**/*.{ts,tsx}"` eklenir. Eklenmezse kui-native bileşenlerinin sınıfları üretilmez ve bileşenler **stilsiz** render olur.
- [ ] `tailwind.config.js` → `theme.extend.colors = require("kui-native/libs/utils/tailwind-tokens").colors`, `darkMode: "class"`.
- [ ] `jest.config.js` → `transformIgnorePatterns` negatif grubuna `kui-native` eklenir (paket derlenmemiş TS kaynağı olarak gelir).
- [ ] `babel.config.js` değişmez: `babel-preset-expo` node_modules'taki TS'yi zaten derler. Faz 1B'den sonra kui-native'de `@/` kalmadığı için `module-resolver` alias'ı pakete dokunmaz.
- [ ] `global.css` → `:root` altına kui-native'in token fallback bloğu eklenir, `--color-primary*` değerleri **turuncu** olarak yazılır. Web'de ilk boyamada mavi yanıp sönmeyi önler. Native'de kökteki `vars()` geçerlidir.
- [ ] `metro.config.js` değişmez. Doğrulama: `npx expo start --clear` ile kui-native bileşeni render edilir.

## 1C.3 Token / tema katmanı

- [ ] `libs/theme/brand.ts` (yeni): boilerplate'in marka override'ı. `configureTheme({ light: {...}, dark: {...} })` ile `primary` = `#f4511e`, `-hover` / `-active` / `-subtle` / `border-focus` turuncuya göre hesaplanmış değerler. kui-native'in mavisi **kullanılmaz**.
- [ ] `configureTheme`, `app/_layout.tsx`'in import zincirinde, ilk render'dan önce **bir kez** çağrılır (`import "@/libs/theme/brand"`).
- [ ] `libs/theme/ThemeContext.tsx`: kökte `themes[useResolvedScheme()]` (kui-native) `style` olarak uygulanır. Kullanıcının tema tercihi MMKV'de (`zustandStorage`) tutulur ve açılışta `useThemeMode.getState().setMode(...)` ile kui-native'e beslenir.
- [ ] `libs/theme/tokens.ts` **silinir**. Tüm `surfaceBase` gibi camelCase token kullanımları className'e (`bg-surface-base`) veya ham hex gereken yerde `useThemeTokens()["surface-base"]`'e çevrilir.
- [ ] `useThemeTokens` boilerplate'te yeniden yazılmaz, `kui-native/libs/theme`'den kullanılır.

## 1C.4 UI bileşenleri: `@/components/ui` barrel'ı

- [ ] `components/ui/index.ts` (yeni): kui-native'den **derin import** ile açık named re-export. Uygulama kodu kui-native'i **doğrudan import etmez**, hep buradan alır.
  ```ts
  export { Button } from "kui-native/modules/ui/Button";
  export type { ButtonProps } from "kui-native/modules/ui/Button";
  ```
  `export *` ve `kui-native/modules/ui` tam barrel'ı **kullanılmaz** (opsiyonel peer'leri çeker).
- [ ] Re-export edilen set: `Button`, `Input`, `TextInput`, `Label`, `Text`, `Card`, `Separator`, `PageHeader`, `ScrollArea`, `Spinner`, `Skeleton`, `SkeletonCard`, `Progress`, `Modal`, `DropdownMenu`, `AlertBanner`, `EmptyState`, `Badge`, `Avatar`, `Select`, `Checkbox`. Sonraki fazlarda gereken bileşen, yalnız bu dosyaya bir satır eklenerek açılır.
- [ ] Yerel `components/ui/{Button,TextInput,LoadingSpinner,SkeletonCard}.tsx` **silinir**. Tüm çağrı yerleri (auth ekranları, drawer ekranları, shell bileşenleri) `@/components/ui`'ya geçer. Prop farkları çağrı yerinde düzeltilir. `LoadingSpinner` yerine `Spinner` kullanılır.
- [ ] kui-native'de eksik ya da boilerplate'e uymayan bir davranış çıkarsa boilerplate'te **yama yapılmaz**. Düzeltme kui-native'de yapılır, yeni tag çıkarılır ve bu fazın altına `**Bilinçli sapmalar:**` olarak not düşülür.
- [ ] `KUInative/docs/audits/kui-react-parity/04-api-differences.md` ve `06-behavior-differences.md` okunur. Kullanılan bileşenlerin bilinen farkları not edilir.

## 1C.5 Shell bileşenlerinin dönüşümü

- [ ] `components/shell/{AppHeader,DrawerContent,DrawerNavLink,LangSwitcher,ThemeToggle,UserMenu}.tsx`: inline `style={{}}` yerine `className` + `cn()`, token sınıfları (`bg-surface-raised`, `text-text-primary`, `border-border`).
- [ ] `ThemeToggle`, kui-native'in `useThemeMode` store'unu (1C.3'teki MMKV köprüsü üzerinden) kullanır. İkinci bir tema store'u açılmaz.
- [ ] `LangSwitcher` bugün yalnız `['tr','en']` sunuyor, oysa `libs/i18n.ts` altı dil kaydediyor (`de,en,es,fr,it,tr`). Liste `i18n` kaynağından türetilir.

## 1C.6 Katalog ve kurallar

- [ ] `scripts/build-registry-snapshot.mjs`: `components/ui/index.ts` içindeki kui-native re-export'larını okuyup `components.json`'a `source: "kui-native"` ve `category: "ui"` olarak yazar. Silinen yerel `ui-*.md` dosyaları katalogdan düşer. AI ajanları hangi bileşenin var olduğunu katalogdan görmeye devam eder.
- [ ] `AGENTS.md` güncellenir:
  - §1: `UI kit: kui-native (git dependency, tag-pinned)`.
  - §2 / §3: `components/ui/` = kui-native re-export barrel'ı.
  - §6'ya yeni kural: *"UI primitives come from kui-native via `@/components/ui`. Never copy kui-native source into this repo, never import `kui-native/*` directly from app code. Fix bugs upstream and bump the tag."*
  - §10'a: *"Don't pin kui-native to a branch."*
- [ ] Editör kural aynaları aynı değişiklikle güncellenir: `.cursor/rules/expo-react-native.mdc`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `.clinerules`.
- [ ] `npm run registry:snapshot` çalıştırılır, üretilen dosyalar commit edilir.

## Dokunulan / oluşturulan dosyalar

- Yeni: `components/ui/index.ts`, `libs/theme/brand.ts`
- Değişen: `package.json`, `package-lock.json`, `tailwind.config.js`, `jest.config.js`, `global.css`, `libs/theme/ThemeContext.tsx`, `components/shell/*` (6 dosya), `components/auth/{AuthLayout,SSOButtons}.tsx`, çağrı yapan tüm `app/**` ekranları, `scripts/build-registry-snapshot.mjs`, `AGENTS.md` + 5 kural aynası, `README.md`
- Silinen: `components/ui/{Button,TextInput,LoadingSpinner,SkeletonCard}.tsx`, `libs/theme/tokens.ts`, `public/components/ui-*.md` (snapshot üretir)

## Yeniden kullan

- `kui-native/libs/theme`: `themes`, `useResolvedScheme`, `useThemeMode`, `useThemeTokens`, `configureTheme`. Boilerplate'te karşılığı yazılmaz.
- `kui-native/libs/utils/tailwind-tokens`: tailwind renk map'inin tek kaynağı.
- `utils/cn.ts`: kui-native'in `cn`'i ile birebir aynı. Boilerplate kendi `cn`'ini kullanmaya devam eder (AGENTS.md §6 Kural 3).
- `libs/zustandStorage.ts`: tema tercihinin persist'i.
- `libs/i18n.ts`: desteklenen dil listesinin tek kaynağı.

## Kabul kriterleri

- `package.json`'da `kui-native` bir **tag**'e sabitli; repoda kui-native kaynak kodunun kopyası **yok**.
- `git grep -n "kui-native/" -- app components/shell components/auth` → **sıfır** (uygulama yalnız `@/components/ui` kullanır).
- `git grep LoadingSpinner` ve `git grep "libs/theme/tokens"` → sıfır.
- `components/` altında className kabul eden hiçbir yerde ham hex veya `style={{}}` renk kalmaz. İstisnalar yalnız `placeholderTextColor`, `trackColor`, FontAwesome `color` ve modal backdrop.
- Açık ve koyu tema drawer, auth ve settings ekranlarının **tamamında** doğru render olur. Tema değiştirince anında yansır, uygulama yeniden açılınca tercih korunur. `primary` turuncudur.
- `npm run typecheck` ve `npm run test:ci` yeşil. `LangSwitcher` altı dili listeler.
- `npm run registry:snapshot` sonrası MCP `list_components`, kui-native bileşenlerini `source: "kui-native"` ile döner.

## Riskler

- **Tailwind `content` eksikliği:** en sessiz hata. Bileşen render olur ama sınıfsızdır. İlk entegrasyonda `Button` gözle doğrulanır.
- **Çift React:** Faz 1B'de peer düzeni eksik kaldıysa `Invalid hook call` alınır. `npm ls react` tek sürüm göstermeli.
- **Tag dışı düzeltme baskısı:** acil bir hata için `node_modules/kui-native` içinde elle değişiklik yapmak veya `patch-package` kullanmak **yasak**. Düzeltme kui-native'de yapılır ve patch tag'i (`v0.2.1`) çıkarılır.
- **Marka rengi kayması:** `configureTheme` çağrısı ilk render'dan sonra olursa ilk kare mavi görünür. `brand.ts` import'u `app/_layout.tsx`'in **en üstünde** olmalı.
- **Lock dosyasında ssh URL'si:** yerel git ayarı (`url.<ssh>.insteadOf`) yüzünden lock'a `git+ssh://` yazılırsa CI/EAS klonlayamaz. Lock commit'lenmeden önce kontrol edilir.
- **Çağrı yeri kaçırma:** yerel bileşenler silindikten sonra typecheck her eksik import'u yakalar. Prop **anlam** farkları (ör. `variant` adları) ise ancak ekranlar gezilerek bulunur.

---

## ✅ KODLANDI — 2026-09-24

Commit'ler: `c854767` (bağımlılık + build entegrasyonu) · `ff2e1e1` (tema + bileşenler + shell) · `d0c18bc` (katalog) · `893158c` (AGENTS.md, 5 kural aynası, README)

Doğrulama: `npm run typecheck` 0 hata (kui-native kaynakları boilerplate'in strict ayarlarıyla birlikte derleniyor) · `npm run test:ci` 2/2 · `npx expo export --platform web` başarılı. Üretilen HTML'in kökünde `--color-primary:#f4511e` var; yalnız kui-native'in kullandığı sınıflar (`min-w-[10rem]`, `border-error`, `shadow-lg`) CSS'e girmiş, yani tailwind `content` yolu çalışıyor. SSH kapalıyken ve temiz cache ile `npm ci`, kui-native'i sorunsuz kuruyor. `git grep "kui-native/" -- app components` yalnız `components/ui/index.ts`'i gösteriyor. MCP kataloğunda 20 bileşen `source: "kui-native"` ile listeleniyor.

**Bilinçli sapmalar:**
- **Bağımlılık yazımı `git+https://github.com/kuraykaraaslan/kui-native.git#v0.2.0`** (`github:` kısaltması yerine; açık https). npm lock'a her iki yazımda da `git+ssh://…#887ad72` yazıyor. Bu engel değil: public repo için npm https tarball'a düşüyor (SSH kapalı `npm ci` ile doğrulandı).
- **`useThemeTokens`** `@/libs/theme/ThemeContext`'ten re-export ediliyor. Kural gereği uygulama kodu `kui-native/*` import etmiyor; yalnız `components/ui/index.ts` ve `libs/theme/*` edebiliyor.
- **Tema tercihi köprüsü modül seviyesinde,** effect'te değil. MMKV senkron hydrate olduğu için ilk karede doğru şema geliyor.
- **`useTheme()` artık `tokens` döndürmüyor;** yalnız `isDark`, `colorScheme` ve `setColorScheme` döndürüyor. Ham renk için `useThemeTokens()` kullanılıyor.
- **`LangSwitcher`** altı dili inline listelemek yerine kui-native `DropdownMenu` ile gösteriyor (başlıkta yer yok). Liste `SUPPORTED_LOCALES`'ten (`libs/i18n.ts`) türetiliyor.
- **Yerel `Button` ve `TextInput` hiçbir yerde kullanılmıyordu,** çağrı yeri düzeltmesi gerekmeden silindi. `LoadingSpinner` 6 ekranda `Spinner size="lg"` ile değiştirildi.
- **`app/**` ekranları hâlâ ham Tailwind renk sınıfları** (`bg-white dark:bg-gray-900`, `text-orange-500`) ve FontAwesome `color` için hex kullanıyor. Kabul kriteri `components/` için sağlandı. Ekranların token'lara taşınması, ekranları zaten yeniden yazan Faz 4 (auth) ve Faz 5 (tenancy) ile yapılacak; drawer ana sayfası, bildirimler ve ayarlar ekranları için de bu iş açık kalıyor.
- **Emülatör doğrulaması yapılmadı;** yerine web export kullanıldı. Açık/koyu geçişi ve tercihin yeniden açılışta korunması cihazda elle kontrol edilmeli.
