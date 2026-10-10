const KEYS = ["EXPO_PUBLIC_ASSOCIATED_DOMAIN", "EXPO_PUBLIC_APP_SCHEME", "EXPO_PUBLIC_PASSKEY_RP_ID"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// app.config.ts reads the environment when it is loaded, so load a fresh copy per case.
function build() {
  let config!: ReturnType<typeof import("../app.config").default>;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = (require("../app.config") as typeof import("../app.config")).default({ config: {} } as never);
  });
  return config;
}

describe("app.config deep links", () => {
  it("writes no associated domain or intent filter without EXPO_PUBLIC_ASSOCIATED_DOMAIN", () => {
    const config = build();
    expect(config.scheme).toBe("expoboilerplate");
    expect(config.ios?.associatedDomains).toBeUndefined();
    expect(config.android?.intentFilters).toBeUndefined();
  });

  it("adds applinks (next to webcredentials) and a verified Android intent filter from the env", () => {
    process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN = "app.example.com, https://bad.example.com/x ,second.example.com";
    process.env.EXPO_PUBLIC_PASSKEY_RP_ID = "example.com";
    const config = build();
    expect(config.ios?.associatedDomains).toEqual(["webcredentials:example.com", "applinks:app.example.com", "applinks:second.example.com"]);
    const filter = config.android?.intentFilters?.[0];
    expect(filter?.autoVerify).toBe(true);
    expect(filter?.category).toEqual(["BROWSABLE", "DEFAULT"]);
    const data = [filter?.data ?? []].flat();
    expect(data.every((d) => d.scheme === "https")).toBe(true);
    expect(data.map((d) => d.host)).toEqual(expect.arrayContaining(["app.example.com", "second.example.com"]));
    expect(data.map((d) => d.host)).not.toContain("bad.example.com");
    expect(data.filter((d) => d.host === "app.example.com").map((d) => d.pathPrefix ?? d.pathPattern)).toEqual([
      "/auth/invitation",
      "/t/.*/auth/invitation/.*",
      "/tenant/.*/auth/invitation/.*",
    ]);
  });

  it("takes the scheme from EXPO_PUBLIC_APP_SCHEME only when it is a valid URL scheme", () => {
    process.env.EXPO_PUBLIC_APP_SCHEME = "MyApp";
    expect(build().scheme).toBe("myapp");
    process.env.EXPO_PUBLIC_APP_SCHEME = "not a scheme";
    expect(build().scheme).toBe("expoboilerplate");
  });
});
