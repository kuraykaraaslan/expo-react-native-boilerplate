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

# Faz 0 — Derlemeyi ayağa kaldır

**Hedef:** `npm install && npm run typecheck && npx expo start` temiz çalışsın; emülatörde drawer gezilebilsin. Sonraki hiçbir faz bu doğrulanmadan açılmaz.

## 0.1 Eksik bağımlılık

- [ ] `package.json` → `@react-navigation/drawer` eklenir.
  - `app/(drawer)/_layout.tsx` `expo-router/drawer` kullanıyor; `components/shell/DrawerContent.tsx` `DrawerContentScrollView` + `DrawerContentComponentProps`, `components/shell/AppHeader.tsx` `DrawerNavigationProp` import ediyor. Paket yok — **derleme burada kırılıyor.**
  - `package-lock.json`'daki tek iz expo-router'ın optional peer kaydı; gerçek kurulum yok. `react-native-drawer-layout` de yok.
  - `react-native-gesture-handler` ve `react-native-reanimated` zaten var, ek kurulum gerekmez.
- [ ] Mevcut SDK 55 ile uyumlu sürüm seçilir (`npx expo install @react-navigation/drawer`). Faz 1A'da SDK 57'ye yükseltilirken `npx expo install --fix` bunu da hizalar.

## 0.2 Çakışan route grubu

- [ ] Çalışma ağacındaki `app/(tabs)/**` silmeleri (12 dosya) **commit edilir**.
  - HEAD'de `(tabs)` ve `(drawer)` **birlikte** duruyor; ikisi de `/`, `/notifications`, `/settings` yollarını talep ediyor → expo-router duplicate-route çakışması.
  - `(drawer)` ekranları `(tabs)`'in kopyası değil, yeniden yazımı (theme token'ları + shell bileşenleri). Hiçbir ekran kaybolmuyor — birebir karşılıkları var.
  - `git grep '(tabs)'` → `app/(tabs)/` dışında **sıfır** referans; silme kimseyi kırmıyor.
- [ ] Silinen dosyalar gerekirse `git show HEAD:'app/(tabs)/<dosya>'` ile geri okunabilir; bu faz sonrası geri alınmaz.

## 0.3 Config tekilleştirme

- [ ] `app.json` silinir — `app.config.ts` tek kaynaktır (AGENTS.md §6 Kural 1: "Don't add `react-navigation` files outside expo-router integration" ve §3 discovery map `app.json`'ı legacy olarak işaretliyor).
- [ ] `app.config.ts` → `./assets/images/splash-icon.png` referansı **iki yerde** `./assets/images/splash.png` olur (diskteki gerçek dosya adı).
- [ ] `app/(auth)/_layout.tsx` → `create-tenant` ekranı `Stack.Screen` listesine eklenir; dosya var ama layout'ta tanımlı değil.

## 0.4 Stil config temizliği

- [ ] `tailwind.config.js` → `plugins: [require("daisyui")]` ve `daisyui: { themes: [...] }` bloğu **kaldırılır**.
  - daisyui bir **web** (DOM + CSS) plugin'idir; NativeWind derlemesinde hiçbir sınıf üretmez. Bugün ölü konfigürasyon, Faz 1C'nin kui-native token'larıyla da çakışacak.
- [ ] `libs/logger.ts` → kullanılmayan `import { env }` kaldırılır (ölü import; dosya zaten `process.env.NODE_ENV` okuyor).

## 0.5 Doğrulama

- [ ] `npm install` temiz.
- [ ] `npm run typecheck` sıfır hata.
- [ ] `npm run test:ci` mevcut testler geçiyor.
- [ ] `npx expo start --android` → uygulama açılıyor, drawer açılıyor, üç sekme (`/`, `/notifications`, `/settings`) geziliyor.

## Dokunulan / oluşturulan dosyalar

- Değişen: `package.json` (+`@react-navigation/drawer`), `package-lock.json`, `app.config.ts` (splash yolu), `app/(auth)/_layout.tsx` (+`create-tenant`), `tailwind.config.js` (−daisyui), `libs/logger.ts` (−ölü import)
- Silinen: `app.json`, `app/(tabs)/**` (12 dosya)

## Yeniden kullan

- `app/(drawer)/**` — tabs→drawer geçişi zaten tamamlanmış ve commit edilmiş (`b70a1ba`); yeniden yazılmaz.
- `components/shell/*` — altı bileşen diskte mevcut ve tracked; Faz 1C'ye kadar olduğu gibi kalır.
- `scripts/auto-snapshot.sh` — bayatlık korumalı `registry:snapshot` sarmalayıcısı; katalog senkronu için kullanılır.

## Kabul kriterleri

- `npm run typecheck` **sıfır** hata döner.
- Emülatörde uygulama açılır ve drawer'daki üç yol da çalışır (bugün paket eksikliğinden açılmıyor).
- Repoda `app.json` ve `app/(tabs)/` **kalmaz**; `git status` temiz.
- `tailwind.config.js` içinde daisyui'ye referans kalmaz.
- `npm run registry:snapshot` çalıştırılır; `public/registry/*.json` ve `public/components/*.md` commit edilir (AGENTS.md §0 zorunluluğu — silinen tabs ekranları katalogdan düşmeli).

## Riskler

- **`@react-navigation/drawer` sürüm uyumsuzluğu:** SDK 55 / RN 0.83 ile eşleşmeyen bir major, Reanimated ile çakışabilir. `npx expo install` ile seçilmeli, elle sürüm yazılmamalı. SDK 57'ye geçiş bu fazda **yapılmaz** (Faz 1A); önce SDK 55 üzerinde temiz bir taban elde edilir.
- **`app.json` silinmesi:** içinde `app.config.ts`'te olmayan bir alan varsa (ikon, plugin, scheme) sessizce kaybolur → silmeden **önce** iki dosya alan alan karşılaştırılmalı.
- **Tabs silmesinin geri alınamazlığı:** commit sonrası geri dönüş `git revert` ile olur; bu yüzden silme **tek başına** bir commit olmalı, başka değişiklikle karışmamalı.
- **Katalog bayatlaması:** snapshot çalıştırılmazsa `public/registry/screens.json` hâlâ silinmiş tabs ekranlarını gösterir ve her AI ajanını yanıltır.

---

## ✅ KODLANDI — 2026-09-24 (branch `feat/foundation`)

Commit'ler: `b8ba06c` (tabs silme, tek başına) · `46c5a4d` (root layout) · `d045908` (bağımlılıklar + lock) · `b9e1be6` (config) · `3c9ca1c` (jest) · `c935547` (tenant DTO) · `0e833a9` (AGENTS.md) · `97a185e` (katalog)

Doğrulama: `npm install` temiz (`--legacy-peer-deps` yok) · `npx expo install --check` → "up to date" · `npm run typecheck` 0 hata · `npm run test:ci` 2/2 · `npx expo export --platform web` tüm drawer + auth route'larını üretiyor.

**Bilinçli sapmalar:**
- **Emülatör doğrulaması yapılmadı.** Onun yerine web export ile tüm route'ların derlendiği doğrulandı. Android'de drawer'ın açılması sahibin elle kontrolüne kaldı.
- **Test yığını React 19'a Faz 1A'dan öne çekildi** (RNTL 13, react-test-renderer 19.2.0, `@types/react` 19). `@testing-library/jest-native` ve `@types/react-test-renderer` kaldırıldı. Sebep: React 19.2 ile RNTL 12 / react-test-renderer 18 çakıştığı için `npm install` hiç çalışmıyordu.
- **`package-lock.json` sıfırdan üretildi.** Eski lock, expo-router ile uyumsuz `@expo/log-box` sürümünü kilitliyordu.
- **Eksik bağımlılıklar açıkça eklendi:** `babel-preset-expo` (~55.0.25), `babel-plugin-module-resolver`, `react-native-worklets` (0.7.4). Bunlar önceden yalnız hoist edilmiş transitive paketlerdi. `expo-modules-autolinking` doğrudan bağımlılık olmaktan çıkarıldı.
- **Jest harness'ı hiç çalışmıyordu, düzeltildi:** iki ayrı config vardı, `setupFilesAfterFramework` yazım hatası yapılmıştı ve `testPathPattern` geçersiz bir anahtardı. Ayrıca msw için Node export koşulları ve ESM transform ayarı eklendi, msw `~2.14.6`'ya sabitlendi. Repoda test olmadığı için `__tests__/cn.test.ts` smoke testi eklendi.
- **`CreateTenantRequest` → `z.input`:** typecheck'teki gerçek bir hata. Varsayılan değeri olan `region` alanını çağıran taraf göndermek zorundaydı.
- **AGENTS.md** `(tabs)` yerine `(drawer)` olarak güncellendi (silinen grup tarif ediliyordu).
- `app.json` silinmesi `fix(config)` commit'i yerine `d045908` (`fix(deps)`) içine düştü.
