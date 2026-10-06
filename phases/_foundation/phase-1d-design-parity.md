<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. internal-ai-rules: UI_Interface_Rules_ReactNative (appshell-compliance.md BLOCKING) → UI_Interface_Rules_Common → Code_Structure_Rules_ReactNative
  3. next-boilerplate UI — READ-ONLY visual reference
  4. phases/README.md (§Locked decisions)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision beats this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 1D — next-boilerplate visual parity

**Goal:** The mobile app should look like the **same product** as next-boilerplate: same colors, same font, same page pattern, same component language. To get there, all screens are rebuilt with kui-native components and comply with the `internal-ai-rules` rules.

> **Owner decision (2026-09-24):** The primary color returns to the same blue as next-boilerplate (`#2563eb`). The earlier "keep the orange brand color" decision is **cancelled**. This phase is done **before** Phase 2.

## Why (findings)

The owner said the mobile UI is "very disconnected" from next-boilerplate. What the comparison turned up:

- **Color:** mobile was orange, next is blue.
- **Font:** mobile uses the system font, next uses Inter.
- **Page pattern:** screens were written with hand-made `TextInput` + `TouchableOpacity` + raw Tailwind gray/orange classes. They lacked next's PageHeader, titled Card and badge language.
- **Scope of Phase 1C:** it had moved only the shell and the spinner; `internal-ai-rules` had never been read.

## Reference (from next-boilerplate)

### Tokens

Tokens differ from the kui-native defaults only at these points:

- **Light theme:**
  - `primary #2563eb`, `primary-hover #1d4ed8`, `primary-active #1e40af`
  - `text-secondary #4b5563`, `text-disabled #6b7280`
- **Dark theme:** `text-disabled #8a99b0`
- **Font:** Inter.

### Component patterns

- **PageHeader:** `text-2xl` bold title, optional badge, `text-sm` secondary subtitle, actions on the right, `pb-5 border-b` below.
- **Card:** `rounded-xl border` + `shadow-sm`.
  - Header: `px-6 py-4`, `text-sm` semibold title, `text-xs` description.
  - Footer: `px-6 py-3`, `bg-surface-base` background.
- **Badge colors:**
  - Role: OWNER=primary, ADMIN=warning, USER=neutral.
  - Invitation: Pending=warning, Accepted=success, Declined=error, Expired/Revoked=neutral.
- **Avatar:** initials, `bg-primary-subtle text-primary`.
- **Auth screens:**
  - Centered `max-w-md` card: `rounded-2xl border bg-surface-raised shadow-sm p-8`.
  - Above the card: BrandLogo (48px), H1 and subtitle.
  - The secondary link goes **below** the card.
  - Order: SSO buttons first, then the "veya e-posta ile devam edin" divider, then the form.
- **Shell:**
  - Brand row: 28px `bg-primary` shield logo + title.
  - Menu groups are separated by small uppercase labels.
  - Active item: `bg-primary-subtle text-primary font-medium`.
  - Top bar right group: flag + language code → theme → bell → avatar.
  - User menu: name and email header, "Profilim", "Çıkış yap".
- **Copy:** identical, word for word, to the strings in next's `modules/*/dictionaries/{en,tr}.json` files.

## Tasks

### 1D.1 Color + font

- [x] `libs/theme/brand.ts` → next token overrides. The `global.css` light theme fallbacks were updated accordingly.
- [x] kui-native `configureFonts()`: v0.3.0 (overlay theme fix in v0.3.1).
- [x] Inter font: `@expo-google-fonts/inter`, `useFonts`, `configureFonts`.

### 1D.2 Shell

- [x] **DrawerContent:**
  - Brand row: BrandLogo + organization name.
  - Groups: GENEL (Panel, Bildirimler), HESAP (Profilim, Oturumlar), ORGANİZASYON (Üyeler, Davetler, Ayarlar).
  - Bottom: language + theme.
  - **Width stays 256pt.** A blocking rule; next's mobile drawer is 288px but the rule comes first.
- [x] **AppHeader:** hamburger on the left; on the right LangSwitcher (flag + code), ThemeToggle, notification bell (unread count; goes to the notifications screen) and UserMenu.
- [x] **UserMenu:** DropdownMenu. Name and email in the header; items: Profilim, Çıkış yap (red, `libs/logout.ts`).
- [x] **LangSwitcher:**
  - Trigger: flag (emoji) + code.
  - Menu: flag + native language name.
  - The list comes from `SUPPORTED_LOCALES`.

### 1D.3 Auth

- [x] `components/auth/AuthShell.tsx`: next's auth card. LangSwitcher + ThemeToggle at the top right (an exception to the rule). `KeyboardAvoidingView` + `ScrollView`.
- [x] **login:** SSO → divider → E-posta (envelope icon) → Parola (lock icon + show/hide) → Beni hatırla → Giriş yap → "Parolanızı mı unuttunuz?". Below the card, "Hesabınız yok mu? Kayıt ol".
  - The prefilled `admin@admin.com` is removed.
- [x] **register:** E-posta, Parola ("En az 8 karakter"), Parolayı doğrula. Inline Zod errors under the fields.
- [x] **forgot-password:** the form and the "Gelen kutunuzu kontrol edin" success state.
- [x] **2fa:** no counterpart in next. 6-digit code entry inside the same AuthShell.
- [x] **select-tenant:** organization rows (initials box, name, description, role, right arrow) and "Yeni organizasyon oluştur".
- [x] **create-tenant:** Organizasyon adı (building icon) + description.

### 1D.4 App screens

- [x] **Panel:**
  - PageHeader "Panel".
  - StatCards: unread notifications, active sessions, number of organizations.
  - Link tiles under the "Bu çalışma alanında" heading.
- [x] **Bildirimler:** PageHeader + "Tümünü okundu işaretle". Rows have a dot, title, description and time; unread ones get a lightly tinted background. EmptyState.
- [x] **Ayarlar (hub):** next's "Organizasyon ayarları" tile grid. Sections: Hesap, Organizasyon. Per the hub rule, it contains no settings fields.
- [x] **Profilim:** PageHeader + role badge + TabGroup:
  - **Profil:** inside a Card: avatar, display name, biography, "Profili kaydet".
  - **Güvenlik:** the "Hesap güvenliği" card and the "Etkin oturumlar" card.
  - **Tercihler:** theme and language.
- [x] **Oturumlar / Dil / E-posta değiştir:** the same cards, as separate screens for direct access from the hub.
- [x] **Üyeler:**
  - PageHeader and the "Üye davet et" button.
  - SearchBar.
  - Rows inside a Card: avatar, name/email, role badge, join date, kebab menu (Düzenle / Kaldır).
  - Invitation Modal: E-posta + Rol.
- [x] **Davetler:** PageHeader + "Yeni davet". The "Bekleyen davetler" card; rows have email, role, status badge, expiry, kebab menu (İptal et).

### 1D.5 Shared rules (internal-ai-rules)

- Screen root: SafeArea (bottom inset on drawer screens). `KeyboardAvoidingView` on form screens. `FlatList` if there is a list. Screen side margin `px-4`.
- Every `catch` → `handleApiError`. Success → `toast.success`. Destructive actions ask for confirmation: title is verb + object, danger button.
- Loading: spinner (next's dominant pattern). Empty list: EmptyState.
- All text via `t()`. TR and EN keys match next's strings; other languages fall back to EN.
- No raw hex. Exceptions: `useThemeTokens()` for FontAwesome `color`, and SSO brand icons.
- `accessibilityRole`/`Label` and `testID` (`[module]-[component]-[context]`) on every interactive element.
- Data calls: services stay as they are. Moving to the hook pipeline belongs to Phase 3.

### 1D.6 Verification

- [x] typecheck, test and web export are green.
- [x] Screenshots go under `.junk/screenshots/after/{light,dark}/`; the previous ones are in `before/`.
- [x] The catalog snapshot is refreshed. AGENTS.md and README are updated if needed.

## Rule conflicts (for owner review; the choice applied in this phase)

| # | Conflict | In this phase |
|---|---|---|
| 1 | The rules say to "copy/adapt" kui-native. The owner decision is a git dependency. | Git dependency. `internal-ai-rules` must be updated. |
| 2 | The token API in the rules is camelCase (`t.surfaceBase` / `useTheme`). kui-native uses kebab (`useThemeTokens()`). | kui-native kebab. |
| 3 | `appshell-compliance` suggests raw `bg-gray-50 dark:bg-gray-950`. `color-tokens` forbids this. | Token classes. |
| 4 | `LoadingSpinner` / `ActivityIndicator`, or kui `Spinner`? | kui `Spinner`. |
| 5 | The rules have LangSwitcher as TR\|EN only. next and the app support more languages. | Dropdown menu, `SUPPORTED_LOCALES`. |
| 6 | "Errors are always a toast" (appshell) contradicts "inline error / AlertBanner" (Common, next). | API error → toast. Form field → inline. |
| 7 | Confirmation: `Alert.alert` (appshell) or a styled dialog (Common overlays)? | Styled confirmation with kui `Modal`. |
| 8 | Body text: `text-sm` (RN examples) or "at least `text-base` on mobile" (Common)? | Same as next (`text-sm`). Recorded as a deviation from the Common rule. |
| 9 | Drawer 256 (blocking) differs from next's mobile drawer 288. | 256. |

## Risks

- **Font loading:** `configureFonts` cannot be fully applied until the kui-native tag arrives. If the tag is delayed, the font step is left to a separate commit.
- **Web screenshots:** SecureStore does not exist on web. The session mock is applied only in the scratchpad build copy; repo code is not touched.
- **Scope:** service and DTO mismatches (`/api/api/…`, `/api/system/*`) are **not fixed** in this phase; they belong to Phase 2/3. Screenshots are taken with mock data.

---

## ✅ CODED — 2026-09-24 (branch `feat/design-parity` → `main`)

Commits: `f683be8` (palette) · `df888c8` (shared components + TR/EN copy) · `9c8efa6` (shell) · `093335b` (auth) · `b0d6af5` (app screens) · `5ea333e` (catalog)

Verification: typecheck 0 errors · test:ci 2/2 · web export succeeded · 19 screenshots × light/dark (TR) in `.junk/screenshots/after/{light,dark}/`. No page errors, and every route opens at its own address (including the open states of the drawer and the user menu). The previous state is under `before/`.

**Font + later fixes:**

- **kui-native v0.3.0:** `configureFonts` added.
- **kui-native v0.3.1:** overlays rendered inside an RN `Modal` (Modal, Drawer, the DropdownMenu/Select panel) now reapply the active theme's variables to their own content. Previously the user menu opened white in the dark theme (reported by the owner).
- **Commits:** `dcfccd6` (Inter + v0.3.1), `717be69` (all text via kui `Text`; the 2FA method selector card became a RadioGroup, as the owner found it too narrow), `d4dae5d` (catalog).
- **Inter loading:** `@expo-google-fonts/inter` is loaded with `useFonts` in the root layout. `configureFonts` is called in `libs/theme/brand.ts`; if the font fails to load, it falls back to the system font.
- **Text component:** screens and components use kui-native `Text` instead of RN `Text`. This way the weight family (Inter_600SemiBold etc.) is also picked correctly on Android.

**Deliberate deviations / findings:**
- **1C bug fixed:** DropdownMenu injects `onPress` into the trigger element. Because of this, the LangSwitcher from 1C with a `View` trigger **never opened**. All triggers are now `Pressable`.
- **Flags are emoji:** because Windows Chrome cannot draw flag emoji, the screenshots show "TR" letters. Flags show up on iOS and Android.
- **Dark theme contrast:** the primary button (white text on `#60a5fa`, ~2.5:1) does not meet the 4.5:1 rule. next-boilerplate has the same values; parity was kept. The fix must be made in both projects together.
- **Text size:** body text is `text-sm` (same as next). The Common rule asks for at least `text-base` on mobile, so this is recorded as a deviation.
- **Error display:** API errors via toast, form errors inline under the field.
- **Confirmation dialogs:** a styled `ConfirmDialog` (kui `Modal`) was used instead of `Alert.alert`.
- **2FA screen:** no counterpart in next; designed with the same auth card pattern.
- **Preferences:** theme + language selection applies immediately, with no save button. next's notification preferences, time zone and date format are not in this phase (no server contract).
- **Sessions:** no "Mevcut oturum" badge. The server does not return which session belongs to this device.
- **Open flow bug (to Phase 4/5):** `select-tenant` is in the `(auth)` group. Because the group layout redirects a signed-in user to `/`, the organization selection screen is skipped after login.
- **Open transport bug (to Phase 2):** `baseURL` ends with `…/api/` and the service paths also start with `/api/…`. As a result, requests go to `/api/api/…`. The screenshot mock was written to accept this path.
- **Tests:** no RNTL tests were written for the new screens; only the existing smoke test exists. They will be added in Phase 3 together with the hook pipeline.
