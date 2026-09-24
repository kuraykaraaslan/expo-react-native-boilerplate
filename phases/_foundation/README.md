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

# _foundation — derleme, tasarım dili ve transport (Faz Planı index)

> **Bu bir modül seti değildir.** Fazların hepsi çapraz kesendir: repoyu derlenir hale getirir,
> SDK'yı kui-native ile hizalar, kui-native'i git paketi olarak bağlayıp iki rakip stil sistemini
> tek tasarım diline indirir ve tüm ağ katmanını device-bearer sözleşmesine geçirir. `auth`, `tenant` ve `auth_sso` setlerinin **tamamı** bu setin üstüne oturur.

## Neden (bağlam)

- Repo bugün **derlenmiyor**: `app/(drawer)/_layout.tsx` ve `components/shell/{AppHeader,DrawerContent}.tsx` `@react-navigation/drawer` import ediyor ama paket `package.json`'da yok.
- HEAD'de hem `app/(tabs)/**` hem `app/(drawer)/**` duruyor — expo-router için `/`, `/notifications`, `/settings` yollarında çakışan route grubu. Çalışma ağacındaki silmeler bu temizliğin ta kendisi, henüz commit edilmemiş.
- `components/ui/*` NativeWind `className` + `cn()`, `components/shell/*` inline `style={{}}` + `libs/theme/tokens.ts` kullanıyor. Aynı repoda iki tasarım sistemi.
- `libs/axios.ts` cookie tabanlı bir web akışı taklit ediyor; sunucunun device yüzeyiyle hiçbir ilgisi yok.

## Sıra

| Faz | Dosya | Konu | Öncelik |
|-----|-------|------|---------|
| 0 | [phase-0-build-fix.md](phase-0-build-fix.md) | Derlemeyi ayağa kaldır | ✅ `97a185e` |
| 1A | [phase-1a-expo-sdk-57.md](phase-1a-expo-sdk-57.md) | Expo SDK 55 → 57 | ✅ `365b597` |
| 1B | [phase-1b-kui-native-package.md](phase-1b-kui-native-package.md) | kui-native paketleştirme (**KUInative reposunda**) + `v0.2.0` tag | ✅ KUInative `887ad72` · `v0.2.0` |
| 1C | [phase-1c-kui-native-dependency.md](phase-1c-kui-native-dependency.md) | kui-native git bağımlılığı + tek tasarım dili | ✅ `ff2e1e1` |
| 2 | [phase-2-transport.md](phase-2-transport.md) | Transport katmanı (device bearer) | ⬜ Bekliyor |

## Kilitli kararlar

- **Faz 0 önce.** Derlenmeyen repoda ne stil birleştirmesi ne transport testi doğrulanabilir.
- **kui-native git paketi olarak kurulur, kopyalanmaz** (sahip kararı, 2026-09-24; önceki vendor kararının yerine geçer). Sürüm bir **tag**'e sabitlenir.
- **Expo SDK 57'ye yükseltilir** (Faz 1A). kui-native SDK 57 / RN 0.86 üzerinde; react / RN / expo tek kopya kalmalı.
- **Paketleştirme upstream'de yapılır** (Faz 1B, KUInative reposu). `@/` import'ları göreli olur, runtime paketleri peerDependencies'e taşınır, `configureTheme` ile marka override'ı eklenir. Boilerplate'te alias hilesi veya `node_modules` yaması yapılmaz.
- **Tek stil sistemi NativeWind'dir.** Inline `style={{}}` yalnızca className kabul etmeyen RN prop'ları için kalır (`placeholderTextColor`, `trackColor`, FontAwesome `color`, modal backdrop).
- **Cookie mantığı tamamen silinir** — yarısı bırakılmaz. Bearer ile cookie karışımı, sunucuda audience seçimini (`cookieAccessToken ? 'web' : 'device'`) yanlış tarafa çevirir.

## Bağımlılık grafiği (özet)

- Faz 1A, Faz 0'ın derlenir reposuna dayanır. Yükseltme, Faz 0 commit'inden **sonra** ayrı commit olarak yapılır.
- Faz 1B başka hiçbir faza dayanmaz (KUInative reposu). Faz 0 ile paralel başlayabilir.
- Faz 1C; Faz 1A'ya (aynı SDK), Faz 1B'nin tag'ine ve Faz 0'ın `tailwind.config.js` temizliğine dayanır (daisyui kaldırılmadan token'lar çakışır).
- Faz 2, Faz 1A'ya dayanır. Faz 1B/1C'den bağımsızdır, paralel yürütülebilir.
- `auth` seti (Faz 3–4) Faz 2'nin interceptor önekine, `tenant` seti (Faz 5) Faz 2'nin tenant başına SecureStore anahtarlarına dayanır.

## Her faz dosyasının formatı

`Hedef` · `Görevler (checkbox)` · `Dokunulan / oluşturulan dosyalar` · `Yeniden kullan` · `Kabul kriterleri` · `Riskler`.
