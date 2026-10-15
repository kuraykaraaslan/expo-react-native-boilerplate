import { toast } from "sonner-native";
import i18n, { applyLanguageTexts } from "@/libs/i18n";
import { changeLanguage, pullPreferences } from "@/libs/preferences";
import {
  ensureLanguage,
  getAvailableLocales,
  getPendingLanguage,
  resetTranslationSyncForTests,
  selectLanguage,
  syncTranslations,
} from "@/libs/translations";
import { useAppStore } from "@/stores/appStore";
import { useTranslationStore } from "@/stores/translationStore";
import { fail, mockRoute, type Seen } from "./_helpers";
import { preferencesJson } from "./fixtures";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

type Tree = Record<string, string>;

// Bulgarian is not bundled: the server offers it in two modules.
const BG_ACCOUNT = { "account.settingsHub.title": "Настройки" };
const BG_AUTH = { "auth.ui.signIn": "Вход" };
const BG = { code: "bg", name: "Български", flag: "🇧🇬", versions: { account: "v1", auth: "v1" } };
const EN = { code: "en", name: "English", flag: "🇬🇧", versions: { account: "v1" } };

const bundle = (code: string, module: string, version: string, messages: Tree) => ({ code, version, platform: "ios", module, messages });

/**
 * Answers POST /localization/languages/{code} per module from `dictionaries`
 * (module → [version, messages] or a status code to fail with).
 */
function serveLanguage(code: string, dictionaries: Record<string, [string, Tree] | number>): Seen[] {
  const seen: Seen[] = [];
  const requests = mockRoute("post", `/localization/languages/${code}`, (n: number) => {
    const { module } = requests[n - 1].body as { module: string };
    seen.push(requests[n - 1]);
    const answer = dictionaries[module];
    if (answer === undefined) return fail(404, { message: "unknown module" });
    if (typeof answer === "number") return fail(answer, { message: "boom" });
    return { body: bundle(code, module, answer[0], answer[1]) };
  });
  return seen;
}

const cache = (bundles: Record<string, Record<string, { version: string; messages: Tree }>>) => {
  useTranslationStore.setState({ bundles: bundles as never });
  for (const code of Object.keys(bundles)) applyLanguageTexts(code);
};

beforeEach(async () => {
  jest.clearAllMocks();
  resetTranslationSyncForTests();
  useTranslationStore.setState({ languages: [], bundles: {} });
  useAppStore.setState({ locale: "en" });
  for (const code of ["bg", "en"]) applyLanguageTexts(code);
  await i18n.changeLanguage("en");
});

describe("bundled dictionaries", () => {
  it("merges every module into one namespace", () => {
    expect(i18n.t("user.preferences.languageLabel")).toBe("Language"); // user module
    expect(i18n.t("account.settingsHub.title")).toBe("Settings"); // account module
    expect(i18n.t("auth.login.forgotPassword")).toBe("Forgot your password?"); // auth module, a key shared with the web
  });
});

describe("syncTranslations", () => {
  it("caches the server's language list without a token (a guest route)", async () => {
    const seen = mockRoute("get", "/localization/languages", { languages: [EN, BG] });
    serveLanguage("en", { account: ["v1", {}] });
    await syncTranslations();
    expect(seen[0].headers.authorization).toBeUndefined();
    expect(useTranslationStore.getState().languages.map((l) => l.code)).toEqual(["en", "bg"]);
  });

  it("re-downloads only the module whose version changed, and shows the new text", async () => {
    cache({ bg: { account: { version: "v1", messages: BG_ACCOUNT }, auth: { version: "v1", messages: BG_AUTH } } });
    mockRoute("get", "/localization/languages", { languages: [{ ...BG, versions: { account: "v2", auth: "v1" } }] });
    const downloads = serveLanguage("bg", { account: ["v2", { "account.settingsHub.title": "Настройки v2" }] });
    await syncTranslations();
    expect(downloads.map((d) => d.body)).toEqual([{ platform: "ios", module: "account" }]); // jest-expo runs as iOS
    expect(useTranslationStore.getState().bundles.bg.account.version).toBe("v2");
    expect(i18n.t("account.settingsHub.title", { lng: "bg" })).toBe("Настройки v2");
    expect(i18n.t("auth.ui.signIn", { lng: "bg" })).toBe("Вход"); // the other module is kept
  });

  it("does not download modules whose version is unchanged", async () => {
    cache({ bg: { account: { version: "v1", messages: BG_ACCOUNT }, auth: { version: "v1", messages: BG_AUTH } } });
    mockRoute("get", "/localization/languages", { languages: [BG] });
    const downloads = serveLanguage("bg", {});
    await syncTranslations();
    expect(downloads).toHaveLength(0);
  });

  it("drops a module the server no longer offers", async () => {
    cache({ bg: { account: { version: "v1", messages: BG_ACCOUNT }, auth: { version: "v1", messages: BG_AUTH } } });
    mockRoute("get", "/localization/languages", { languages: [{ ...BG, versions: { account: "v1" } }] });
    await syncTranslations();
    expect(Object.keys(useTranslationStore.getState().bundles.bg)).toEqual(["account"]);
  });

  it("keeps every cached text when the server cannot be reached", async () => {
    useTranslationStore.setState({ languages: [BG] });
    cache({ bg: { account: { version: "v1", messages: BG_ACCOUNT } } });
    mockRoute("get", "/localization/languages", () => fail(503, { message: "down" }));
    await expect(syncTranslations()).resolves.toBeUndefined();
    expect(useTranslationStore.getState().bundles.bg.account.version).toBe("v1");
    expect(useTranslationStore.getState().languages).toEqual([BG]);
  });

  it("does not hit the server again on a quick resume", async () => {
    const seen = mockRoute("get", "/localization/languages", { languages: [EN] });
    serveLanguage("en", { account: ["v1", {}] }); // the language on screen is kept current
    await syncTranslations();
    await syncTranslations();
    expect(seen).toHaveLength(1);
  });
});

describe("selectLanguage", () => {
  it("downloads every module of a language the app does not ship, then switches to it", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    serveLanguage("bg", { account: ["v1", BG_ACCOUNT], auth: ["v1", BG_AUTH] });
    await expect(selectLanguage("bg")).resolves.toBe(true);
    expect(i18n.language).toBe("bg");
    expect(useAppStore.getState().locale).toBe("bg");
    expect(i18n.t("account.settingsHub.title")).toBe("Настройки");
    expect(i18n.t("auth.ui.signIn")).toBe("Вход");
  });

  it("falls back to English for a key the language does not have", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    serveLanguage("bg", { account: ["v1", BG_ACCOUNT], auth: ["v1", BG_AUTH] });
    await selectLanguage("bg");
    expect(i18n.t("user.preferences.languageLabel")).toBe("Language");
  });

  it("does not switch to a half-downloaded language", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    serveLanguage("bg", { account: ["v1", BG_ACCOUNT], auth: 500 });
    await expect(selectLanguage("bg")).resolves.toBe(false);
    expect(i18n.language).toBe("en");
    expect(useAppStore.getState().locale).toBe("en");
  });

  it("switches offline to a language downloaded earlier, even if a newer version exists", async () => {
    useTranslationStore.setState({ languages: [EN, { ...BG, versions: { account: "v2", auth: "v2" } }] });
    cache({ bg: { account: { version: "v1", messages: BG_ACCOUNT }, auth: { version: "v1", messages: BG_AUTH } } });
    serveLanguage("bg", { account: 500, auth: 500 });
    await expect(selectLanguage("bg")).resolves.toBe(true);
    expect(i18n.t("account.settingsHub.title")).toBe("Настройки");
  });

  it("server texts override the bundled ones of the same language, key by key", async () => {
    useTranslationStore.setState({ languages: [EN] });
    serveLanguage("en", { account: ["v1", { "account.settingsHub.title": "Settings (edited)" }] });
    await ensureLanguage("en");
    expect(i18n.t("account.settingsHub.title")).toBe("Settings (edited)");
    expect(i18n.t("user.preferences.languageLabel")).toBe("Language"); // untouched key keeps the bundled text
  });

  it("a bundled language switches even when the server cannot be reached", async () => {
    useTranslationStore.setState({ languages: [EN, { code: "tr", name: "Türkçe", versions: { account: "v9" } }] });
    serveLanguage("tr", { account: 500 });
    await expect(selectLanguage("tr")).resolves.toBe(true);
    expect(i18n.t("user.preferences.languageLabel")).toBe("Dil");
  });
});

describe("switching state", () => {
  it("is set while a language downloads and cleared afterwards, even on failure", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    let during: string | null = null;
    mockRoute("post", "/localization/languages/bg", () => {
      during = useTranslationStore.getState().switchingTo;
      return fail(500, { message: "boom" });
    });
    await selectLanguage("bg");
    expect(during).toBe("bg");
    expect(useTranslationStore.getState().switchingTo).toBeNull();
  });
});

describe("profile language that cannot be downloaded yet", () => {
  const profileAsks = (language: string) => mockRoute("get", "/auth/me/preferences", { userPreferences: { ...preferencesJson, language } });

  it("stays in the current language, tells the user, and switches on a later sync", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    profileAsks("bg");
    serveLanguage("bg", { account: 500, auth: 500 });
    await pullPreferences();
    expect(i18n.language).toBe("en");
    expect(getPendingLanguage()).toBe("bg");
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("Български"));

    // Connection back: the next sync (even a quick resume) completes the download and switches.
    mockRoute("get", "/localization/languages", { languages: [EN, BG] });
    serveLanguage("en", { account: ["v1", {}] });
    serveLanguage("bg", { account: ["v1", BG_ACCOUNT], auth: ["v1", BG_AUTH] });
    await syncTranslations();
    expect(i18n.language).toBe("bg");
    expect(useAppStore.getState().locale).toBe("bg");
    expect(getPendingLanguage()).toBeNull();
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("does not repeat the notice when the same language is still pending", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    profileAsks("bg");
    serveLanguage("bg", { account: 500, auth: 500 });
    await pullPreferences();
    await pullPreferences();
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("is dropped once the user picks a language themselves", async () => {
    useTranslationStore.setState({ languages: [EN, BG, { code: "tr", name: "Türkçe", versions: {} }] });
    profileAsks("bg");
    serveLanguage("bg", { account: 500, auth: 500 });
    await pullPreferences();
    const pushed = mockRoute("put", "/auth/me/preferences", {});
    await changeLanguage("tr");
    for (let i = 0; i < 50 && pushed.length === 0; i++) await new Promise((r) => setTimeout(r, 10)); // the push is fire-and-forget
    expect(pushed[0].body).toEqual({ userPreferences: { language: "tr" } });
    expect(getPendingLanguage()).toBeNull();
    expect(i18n.language).toBe("tr");
  });

  it("is ignored silently when neither the app nor the server offers it", async () => {
    useTranslationStore.setState({ languages: [EN, BG] });
    profileAsks("ja");
    await pullPreferences();
    expect(i18n.language).toBe("en");
    expect(getPendingLanguage()).toBeNull();
    expect(toast.info).not.toHaveBeenCalled();
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
