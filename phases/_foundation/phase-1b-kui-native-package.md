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

# Faz 1B — kui-native'i git paketi olarak tüketilebilir yap

**Hedef:** `kui-native` reposunu (`C:/Users/kuray/Documents/Projects/KUInative`, `git@github.com:kuraykaraaslan/kui-native.git`), başka bir Expo uygulamasının `package.json`'ına git bağımlılığı olarak yazılıp **hiçbir alias hilesi olmadan** import edilebilir hale getir. Ardından ilk sürümü tag'le.

> **Bu fazın işi KUInative reposunda yapılır ve orada commit edilir.** Boilerplate'te bu fazda yalnız bu dosya güncellenir.
> **Sahibin kararı (sabit, 2026-09-24):** kui-native git paketi olarak kurulur. Paketleştirme için KUInative'de değişiklik yapılabilir. Showcase uygulaması (`app/`, `modules/showcase/`) çalışmaya devam etmeli.

## Bugünkü engeller (tespit)

- `modules/ui` ve `libs` içinde **131 adet `@/` import'u** var (`@/libs/theme` ×50, `@/libs/utils/cn` ×79, `@/libs/utils/typography` ×2). Tüketici uygulamada `@/` **tüketicinin** köküne çözülür. Boilerplate'in babel `module-resolver`'ı `@/libs/theme`'yi sessizce boilerplate'in kendi `libs/theme/` klasörüne bağlar → yanlış modül, hata bile vermeden.
- Tüm runtime paketleri (`expo`, `react`, `react-native`, `nativewind`, `reanimated`, …) `dependencies`'te. Git bağımlılığı kurulunca npm bunları iç içe kurmaya çalışır → **iki React kopyası** ("Invalid hook call") riski.
- `libs/theme.ts` token'ları sabit (`primary: #3b82f6`). Tüketicinin marka rengini (boilerplate: `#f4511e`) vermesinin yolu yok. `useThemeTokens()` hep mavi döner.
- `modules/ui/index.ts` barrel'ı **her şeyi** export ediyor: `MapView` (`react-native-maps`, `leaflet`), `VideoPlayer` (`expo-video`), `FileInput` (`expo-document-picker`). Barrel'dan tek bir `Button` import etmek bile Metro'da bu modüllerin hepsini çözer.
- Repoda hiç tag yok. Tüketicinin sabitleyeceği bir sürüm yok.

## 1B.1 Göreli import'lar

- [ ] `modules/ui/**` ve `libs/**` içindeki tüm `@/…` import'ları **göreli yola** çevrilir (`@/libs/utils/cn` → `../../libs/utils/cn` vb.). Test dosyaları dahil.
- [ ] `app/` ve `modules/showcase/` (showcase host) `@/` kullanmaya devam edebilir, çünkü paketle dağıtılmaz.
- [ ] `eslint.config.js` → `modules/ui/**` ve `libs/**` için `no-restricted-imports` kuralı eklenir: `@/*` yasak. Regresyonu CI yakalar.

## 1B.2 Bağımlılık düzeni

- [ ] `peerDependencies` (tüketici sağlar): `react`, `react-native`, `expo`, `expo-image`, `expo-router`, `nativewind`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-svg`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/react-native-fontawesome`, `clsx`, `tailwind-merge`, `zustand`. Aralıklar SDK 57'nin sürümleriyle yazılır.
- [ ] `peerDependenciesMeta` → **optional**: `expo-video`, `expo-document-picker`, `expo-clipboard`, `react-native-maps`, `leaflet`, `react-leaflet`, `countries-list`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/free-regular-svg-icons`. Yalnız ilgili bileşeni kullanan tüketici kurar.
- [ ] Aynı paketler `devDependencies`'te **kalır** (showcase ve testler için). `dependencies` alanı boşalır veya yalnız saf JS, peer olması gerekmeyen paketlere kalır.
- [ ] Showcase'e özgü paketler (`react-dom`, `react-native-web`, `expo-status-bar`, `expo-linking`, `expo-constants`) yalnız `devDependencies`'te.
- [ ] `package.json`'da `prepare` / `postinstall` script'i **olmamalı**. Olursa npm git bağımlılığını kurarken devDependencies'i de kurar ve kurulum dakikalar sürer.

## 1B.3 Paket yüzeyi

- [ ] `package.json` → `files`: `["modules/ui", "libs/theme.ts", "libs/utils", "global.css", "nativewind-env.d.ts", "!**/*.test.ts", "!**/*.test.tsx"]`. Showcase, `brand/`, `docs/`, `dist/` pakete girmez.
- [ ] `main` showcase için `expo-router/entry` olarak **kalır**. Tüketici derin yol kullanır. `exports` alanı **eklenmez**, çünkü eklenirse derin import'ları kapatır.
- [ ] README'ye **"Tüketici olarak kullanım"** bölümü eklenir. Desteklenen giriş noktaları:
  - `kui-native/modules/ui/<Bileşen>` — bileşen başına derin import (**önerilen**, opsiyonel peer'leri çekmez)
  - `kui-native/modules/ui` — tam barrel (tüm opsiyonel peer'ler kurulu olmalı)
  - `kui-native/libs/theme` — tema API'si
  - `kui-native/libs/utils/cn`, `kui-native/libs/utils/tailwind-tokens`
- [ ] README'de tüketici kurulumu adım adım yazılır: tailwind `content`, `theme.extend.colors`, jest `transformIgnorePatterns`, kökte tema `vars()` uygulaması.

## 1B.4 Tema override API'si

- [ ] `libs/theme.ts` → `configureTheme({ light?: Partial<TokenMap>, dark?: Partial<TokenMap> })` eklenir. Varsayılan token'ların üstüne birleştirir ve `themes` (vars) ile `tokenMaps`'i **birlikte** yeniden üretir. Böylece className ile `useThemeTokens()` aynı rengi döner.
- [ ] Uygulama başlangıcında, ilk render'dan önce **bir kez** çağrılacak şekilde belgelenir. Çağrılmazsa bugünkü davranış aynen korunur (geriye uyumlu).
- [ ] `useThemeMode` bugün persist edilmiyor. Paket persist **eklemez**: tüketici kendi deposundan (boilerplate: MMKV) `setMode` ile besler. Bu, README'de açıkça yazılır.
- [ ] `TokenMap` ve token anahtar tipleri export edilir. Tüketici override'ı tip güvenli yazar.

## 1B.5 Sürümleme

- [ ] `version` `0.1.0` → `0.2.0` (paket yüzeyi değişti).
- [ ] `CHANGELOG.md` açılır. İlk kayıt: göreli import'lar, peer düzeni, `configureTheme`.
- [ ] Commit'lendikten sonra `v0.2.0` tag'i oluşturulur ve `origin`'e push edilir (`git push origin v0.2.0`). **Push, sahibin onayıyla yapılır.**

## 1B.6 Doğrulama (KUInative içinde)

- [ ] `npm install && npm run typecheck && npm test` → showcase ve testler yeşil (göreli import'lar kırmadı).
- [ ] `npm run web` → showcase açılıyor.
- [ ] `git grep -n "from \"@/" -- modules/ui libs` → **sıfır** sonuç.
- [ ] `npm pack --dry-run` → çıktıda yalnız `files` listesindekiler var; `app/`, `modules/showcase/`, test dosyaları yok.

## Dokunulan / oluşturulan dosyalar (KUInative reposunda)

- Değişen: `modules/ui/**` (import yolları), `libs/theme.ts` (+`configureTheme`, tip export'ları), `package.json` (peer / dev / files / version), `eslint.config.js`, `README.md`
- Yeni: `CHANGELOG.md`
- Boilerplate'te: yalnız bu dosyanın `KODLANDI` damgası

## Yeniden kullan

- `libs/theme.ts` içindeki `toVars()`: `configureTheme` bunu yeniden kullanır, ikinci bir vars üreticisi yazılmaz.
- `libs/utils/tailwind-tokens.js`: değişmez. Token **adları** sabit kaldıkça tüketici bunu doğrudan `require` eder.

## Kabul kriterleri

- KUInative'de `@/` import'u yalnız `app/` ve `modules/showcase/` içinde kalır.
- `npm pack --dry-run` temiz. `dependencies` içinde React / RN / Expo **yok**.
- `configureTheme({ light: { primary: "#f4511e" } })` sonrası hem `bg-primary` hem `useThemeTokens().primary` turuncu döner (birim test ile kanıtlanır).
- `v0.2.0` tag'i origin'de mevcut.

## Riskler

- **Göreli import dönüşümünde kaçak:** tek bir `@/` kalırsa tüketicide yanlış dosyaya çözülür ve hata vermez. Azaltma: ESLint kuralı ile `git grep` kontrolü birlikte kullanılır.
- **Repo erişimi:** repo **public** (sahip teyidi, 2026-09-24). CI ve EAS kimlik bilgisi olmadan https ile klonlar. Repo ileride private yapılırsa Faz 1C'ye deploy key adımı eklenmelidir.
- **Showcase'in kırılması:** peer'lere taşınan paketler devDependencies'te kalmazsa showcase kurulumu bozulur. Her taşımada `npm install` + `npm run web` tekrarlanır.
- **Barrel ağırlığı:** tüketici barrel'dan import ederse opsiyonel peer'ler eksikse Metro "Unable to resolve react-native-maps" hatası verir. README ve boilerplate kuralı derin import'u zorunlu tutar.

---

## 🟡 KOD TAMAM — 2026-09-24 · tag ve push sahip onayını bekliyor

KUInative branch `feat/consumable-package` (base `main` 72705f0): `d9f71ea` (göreli import'lar + lint kuralı) · `ddc0ea8` (peer / files) · `e576edc` (`configureTheme`) · `887ad72` (README, CHANGELOG, 0.2.0)

Doğrulama: typecheck 0 hata · jest 65 suite / 714 test geçti (baseline 64 / 709) · lint temiz · `npm pack --dry-run` 137 dosya içeriyor; `app/`, `modules/showcase/` ve test dosyaları yok · web export başarılı.

**Kalan:** `main`'e merge → `v0.2.0` tag'i → `git push origin main v0.2.0` (sahip onayıyla).

**Bilinçli sapmalar:**
- `tokenMaps` / `useThemeTokens()` dönüş tipi `TokenMap & Record<string, string>`. Hesaplanmış string ile token okuyan 7 mevcut çağrı yeri kırılmasın diye. `configureTheme` override'ları sıkı tiplidir.
- `themes` artık getter'lı bir nesne. Native'de `vars()` boş bir nesne döner ve değerler WeakMap'te tutulur, bu yüzden yerinde güncellemek mümkün değil. Kullanım şekli değişmedi.
- `modules/showcase/data/showcase.generated.ts` yeniden senkronlandı. Yalnız saklanan kaynak kopyalarındaki import satırları değişti.
- `countries-list` ve `@fortawesome/free-brands-svg-icons` opsiyonel peer'lerini hiçbir paket bileşeni kullanmıyor (yalnız showcase kullanıyor). İleride çıkarılabilirler.
