import { changedSettings, pickSettings, TENANT_SETTING_DEFAULTS } from "@/utils/tenantSettings";

describe("pickSettings", () => {
  it("takes only allowlisted keys and falls back to the server defaults", () => {
    expect(pickSettings({})).toEqual(TENANT_SETTING_DEFAULTS);
    expect(pickSettings({ defaultMemberRole: "ADMIN", smtpPassword: "***SET***", unrelated: "x" })).toEqual({
      ...TENANT_SETTING_DEFAULTS,
      defaultMemberRole: "ADMIN",
    });
  });

  it("treats an empty string as not set", () => {
    expect(pickSettings({ defaultLanguage: "" }).defaultLanguage).toBe("en");
  });
});

describe("changedSettings", () => {
  it("returns only the keys that differ", () => {
    const saved = pickSettings({});
    expect(changedSettings(saved, saved)).toEqual({});
    expect(changedSettings(saved, { ...saved, defaultLanguage: "tr", tenantMemberDualControl: "true" })).toEqual({
      defaultLanguage: "tr",
      tenantMemberDualControl: "true",
    });
  });
});
