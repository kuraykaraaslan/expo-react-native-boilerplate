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

# Faz 1A — Expo SDK 57 yükseltmesi

**Hedef:** Boilerplate'i kui-native ile **aynı** Expo SDK'ya (57 / RN 0.86 / React 19.2.3) taşı. Böylece kui-native git bağımlılığı olarak kurulduğunda `react`, `react-native`, `expo`, `nativewind`, `reanimated` **tek kopya** kalır.

> **Sahibin kararı (sabit, 2026-09-24):** Boilerplate SDK 57'ye yükseltilir. Önceki "SDK yükseltmesi yok" kararı, vendor yaklaşımıyla birlikte **kaldırıldı**.

## 1A.1 Çekirdek yükseltme

- [ ] `npx expo install expo@^57.0.0` → ardından `npx expo install --fix` (tüm `expo-*` ve RN paketleri SDK 57'nin `bundledNativeModules` sürümlerine hizalanır).
- [ ] `*` ile yazılmış sürümler sabitlenir: `expo-font`, `expo-image`, `expo-modules-autolinking`, `jest-expo`. `*` sürüm, SDK uyumunu garanti etmez.
- [ ] Hedef sürümler **kui-native'in `package.json`'ıyla aynı** olmalı: `react` / `react-dom` `19.2.3`, `react-native` `0.86.x`, `react-native-reanimated` `4.5.x`, `react-native-gesture-handler` `~2.32`, `react-native-safe-area-context` `~5.7`, `react-native-screens` `~4.26`, `react-native-svg` `15.15.x`.

## 1A.2 Kui-native ile ortak bağımlılık hizalaması

- [ ] FontAwesome 6 → 7: `@fortawesome/{fontawesome-svg-core,free-solid-svg-icons,free-brands-svg-icons}` `^7.3.1`, `@fortawesome/react-native-fontawesome` `^1.0.0`. kui-native bileşenleri FA 7 ikon nesneleriyle derlenir; iki major aynı ağaçta kalmaz.
- [ ] `react-native-svg` `dependencies`'e **açıkça** eklenir (bugün yalnız transitif; kui-native peer olarak ister).
- [x] ~~`@types/react` 19, `@types/react-test-renderer` ve `@testing-library/jest-native` kaldırma~~ → Faz 0'da yapıldı (`d045908`).
- [ ] `react-test-renderer` `19.2.0` → `19.2.3` (react ile birebir). `@testing-library/react-native` `^13` → `^14` (kui-native testleri v14 API'siyle yazıldı).
- [ ] `@expo/vector-icons` bağımlılığı: `git grep "@expo/vector-icons"` → kullanım yoksa kaldırılır (AGENTS.md §6 Kural 10).

## 1A.3 Kırılma taraması

- [ ] Expo SDK 56 ve 57 changelog'larındaki breaking change'ler tek tek kontrol edilir: `expo-router` (layout API, `Stack.Screen` / `Drawer` prop'ları), `expo-secure-store`, `expo-splash-screen`, `expo-web-browser`, `expo-system-ui`.
- [ ] `react-native-mmkv` v3 → RN 0.86 / New Architecture uyumu doğrulanır. Uyumsuzsa MMKV sürümü yükseltilir, `libs/mmkv.ts` API'si değişirse `libs/zustandStorage.ts` birlikte güncellenir.
- [ ] `sonner-native`, `react-native-webview`, `@react-native-picker/picker`, `@react-native-community/netinfo` → `npx expo install` ile SDK 57 sürümlerine çekilir.
- [ ] `npx expo-doctor` sıfır uyarı.

## 1A.4 Doğrulama

- [ ] `npm install` temiz (`--legacy-peer-deps` **gerekmemeli**; gerekiyorsa sebebi bulunup giderilir).
- [ ] `npm run typecheck` sıfır hata.
- [ ] `npm run test:ci` geçer.
- [ ] `npx expo start --android` → Faz 0'ın kabul kriterleri (drawer + üç yol) SDK 57'de de sağlanır.
- [ ] `npm ls react react-native expo nativewind` → her biri **tek** sürüm.

## Dokunulan / oluşturulan dosyalar

- Değişen: `package.json`, `package-lock.json`; kırılma taramasında gerekirse `app/**/_layout.tsx`, `libs/mmkv.ts`, `libs/zustandStorage.ts`, FontAwesome ikon import eden dosyalar.

## Yeniden kullan

- `KUInative/package.json` — hedef sürümlerin tek referansı. Sürüm seçiminde tahmin yapılmaz, oradan okunur.
- `KUInative/README.md` §Run — SDK 57 kurulumunda karşılaşılan `ERESOLVE` notu.

## Kabul kriterleri

- `package.json`'da `expo` `^57`, `react-native` `0.86.x`, `react` `19.2.3`.
- `npx expo-doctor` temiz, `npm ls react` tek sürüm.
- typecheck, test ve emülatör doğrulaması Faz 0 seviyesinde yeşil.
- Katalogda ekran / bileşen değişmediği için snapshot zorunlu değildir; yine de `npm run registry:snapshot` çalıştırılır ve **diff çıkmadığı** doğrulanır.

## Riskler

- **İki major birden (55 → 57):** SDK 56'nın breaking change'leri atlanabilir. Changelog'lar 56 ve 57 için **ayrı ayrı** okunmalı.
- **MMKV / New Architecture:** persist edilen store'lar okunamazsa oturum ve tercih kaybolur. Yükseltmeden önce ve sonra emülatörde aynı hesapla test edilmeli.
- **FontAwesome 7 ikon adları:** bazı ikonlar FA 7'de yeniden adlandırıldı. `typecheck` import hatasını yakalar; eksik kalan ikonlar tek tek değiştirilir.
- **Faz 0 ile karışma:** yükseltme, Faz 0 commit'lendikten **sonra** ayrı commit(ler) olarak yapılır. Böylece bir regresyon SDK yükseltmesine mi Faz 0'a mı ait, ayrılabilir.

---

## ✅ KODLANDI — 2026-09-24

Commit'ler: `365b597` (SDK 57 + hizalama) · `87d7adb` (katalog: yalnız zaman damgası ve shell import yolu)

Doğrulama: `npx expo install --check` → up to date · `npx expo-doctor` 21/21 · `npm run typecheck` 0 hata · `npm run test:ci` 2/2 · `npx expo export --platform web` başarılı · `npm ls` → react 19.2.3 / react-native 0.86.3 / expo 57.0.25 / nativewind 4.2.7 tek kopya.

**Bilinçli sapmalar:**
- **`@react-navigation/drawer` ve `@react-navigation/native` kaldırıldı.** expo-router 57 drawer'ı ve tiplerini kendisi export ediyor (`expo-router/drawer`). Ayrı paketin tipleri onunkiyle çakışıyordu (TS2322). Shell bileşenleri artık `expo-router/drawer`'dan import ediyor.
- **`react-i18next` 15 → 17.** v15 TypeScript 6'yı peer olarak kabul etmiyordu.
- **TypeScript 6** (SDK 57'nin beklediği `~6.0.3`): `@types` artık otomatik yüklenmiyor → `tsconfig.json`'a `"types": ["jest"]` eklendi (kui-native'deki gibi).
- **`app.config.ts` üst düzey `splash` alanı kaldırıldı.** SDK 57'nin `ExpoConfig` tipinde bu alan yok. Splash'i `expo-splash-screen` plugin'i yönetiyor.
- **Kalan tek peer uyarısı:** RNTL 14 → `test-renderer` → `react-reconciler@0.34`, `react@^19.3` istiyor. kui-native'de de aynı uyarı var ve testler geçiyor; `--legacy-peer-deps` gerekmiyor.
- **Emülatör doğrulaması ve MMKV'nin cihazda persist testi yapılmadı** (sahibe kaldı). SDK 56/57 changelog'ları satır satır okunmadı; kırılmalar typecheck, export ve expo-doctor ile yakalandı.
