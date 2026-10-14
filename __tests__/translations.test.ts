import i18n, { applyLanguageTexts } from "@/libs/i18n";
import {
  ensureLanguage,
  getAvailableLocales,
  resetTranslationSyncForTests,
  selectLanguage,
  syncTranslations,
} from "@/libs/translations";
import { useAppStore } from "@/stores/appStore";
import { useTranslationStore } from "@/stores/translationStore";
import { fail, mockRoute } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const BG = { code: "bg", name: "Български", flag: "🇧🇬", version: "v1" };
const EN = { code: "en", name: "English", flag: "🇬🇧", version: "v1" };
const bundle = (code: string, version = "v1", messages: object = {}) => ({ code, version, platform: "ios", module: "common", messages });
const bgBundle = (version = "v1", title = "Настройки") => ({ code: "bg", version, platform: "ios", module: "common", messages: { SETTINGS_HUB: { TITLE: title } } });

beforeEach(async () => {
  resetTranslationSyncForTests();
  useTranslationStore.setState({ languages: [], bundles: {} });
  useAppStore.setState({ locale: "en" });
  for (const code of ["bg", "en"]) applyLanguageTexts(code, null);
  await i18n.changeLanguage("en");
});

describe("syncTranslations", () => {
  it("caches the server's language list without a token (a guest route)", async () => {
    const seen = mockRoute("get", "/localization/languages", { languages: [EN, BG] });
    mockRoute("post", "/localization/languages/en", bundle("en"));
    await syncTranslations();
    expect(seen[0].headers.authorization).toBeUndefined();
    expect(useTranslationStore.getState().languages.map((l) => l.code)).toEqual(["en", "bg"]);
  });

  it("re-downloads a cached language only when its version changed, and shows the new text", async () => {
    useTranslationStore.setState({ bundles: { bg: { version: "v1", messages: bgBundle().messages } } });
    mockRoute("get", "/localization/languages", { languages: [{ ...BG, version: "v2" }] });
    const downloads = mockRoute("post", "/localization/languages/bg", bgBundle("v2", "Настройки v2"));
    await syncTranslations();
    expect(downloads).toHaveLength(1);
    expect(downloads[0].body).toEqual({ platform: "ios", module: "common" }); // jest-expo runs as iOS
    expect(useTranslationStore.getState().bundles.bg.version).toBe("v2");
    expect(i18n.t("SETTINGS_HUB.TITLE", { lng: "bg" })).toBe("Настройки v2");
  });

  it("does not download a language whose version is unchanged", async () => {
    useTranslationStore.setState({ bundles: { bg: { version: "v1", messages: bgBundle().messages } } });
    mockRoute("get", "/localization/languages", { languages: [BG] });
    const downloads = mockRoute("post", "/localization/languages/bg", bgBundle());
    await syncTranslations();
    expect(downloads).toHaveLength(0);
  });

  it("keeps every cached text when the server cannot be reached", async () => {
    useTranslationStore.setState({ languages: [BG], bundles: { bg: { version: "v1", messages: bgBundle().messages } } });
    mockRoute("get", "/localization/languages", () => fail(503, { message: "down" }));
    await expect(syncTranslations()).resolves.toBeUndefined();
    expect(useTranslationStore.getState().bundles.bg.version).toBe("v1");
    expect(useTranslationStore.getState().languages).toEqual([BG]);
  });

  it("does not hit the server again on a quick resume", async () => {
    const seen = mockRoute("get", "/localization/languages", { languages: [EN] });
    mockRoute("post", "/localization/languages/en", bundle("en")); // the language on screen is kept current
    await syncTranslations();
    await syncTranslations();
    expect(seen).toHaveLength(1);
  });
});

describe("selectLanguage", () => {
  it("downloads a language the app does not ship, then switches to it", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    mockRoute("post", "/localization/languages/bg", bgBundle());
    await expect(selectLanguage("bg")).resolves.toBe(true);
    expect(i18n.language).toBe("bg");
    expect(useAppStore.getState().locale).toBe("bg");
    expect(i18n.t("SETTINGS_HUB.TITLE")).toBe("Настройки");
  });

  it("falls back to English for a key the language does not have", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    mockRoute("post", "/localization/languages/bg", bgBundle());
    await selectLanguage("bg");
    expect(i18n.t("PREFERENCES.LANGUAGE")).toBe("Language");
  });

  it("changes nothing when the language cannot be downloaded and was never cached", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    mockRoute("post", "/localization/languages/bg", () => fail(500, { message: "boom" }));
    await expect(selectLanguage("bg")).resolves.toBe(false);
    expect(i18n.language).toBe("en");
    expect(useAppStore.getState().locale).toBe("en");
  });

  it("switches offline to a language downloaded earlier", async () => {
    useTranslationStore.setState({ languages: [EN, { ...BG, version: "v2" }], bundles: { bg: { version: "v1", messages: bgBundle().messages } } });
    applyLanguageTexts("bg", bgBundle().messages);
    mockRoute("post", "/localization/languages/bg", () => fail(500, { message: "offline" }));
    await expect(selectLanguage("bg")).resolves.toBe(true);
    expect(i18n.t("SETTINGS_HUB.TITLE")).toBe("Настройки");
  });

  it("server texts override the bundled ones of the same language, key by key", async () => {
    useTranslationStore.setState({ languages: [EN] });
    mockRoute("post", "/localization/languages/en", bundle("en", "v1", { SETTINGS_HUB: { TITLE: "Settings (edited)" } }));
    await ensureLanguage("en");
    expect(i18n.t("SETTINGS_HUB.TITLE")).toBe("Settings (edited)");
    expect(i18n.t("PREFERENCES.LANGUAGE")).toBe("Language"); // untouched key keeps the bundled text
  });
});

describe("getAvailableLocales", () => {
  it("offers the bundled languages until the server's list is known", () => {
    expect(getAvailableLocales([]).map((l) => l.code)).toEqual(["en", "tr", "de", "es", "fr", "it"]);
  });

  it("offers exactly the server's languages once known", () => {
    expect(getAvailableLocales([EN, BG])).toEqual([
      { code: "en", name: "English", flag: "🇬🇧" },
      { code: "bg", name: "Български", flag: "🇧🇬" },
    ]);
  });
});
