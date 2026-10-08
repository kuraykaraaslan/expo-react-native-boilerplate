import { contrast, deriveBrandTokens, normalizeHex } from "@/libs/theme/brandColor";

describe("normalizeHex", () => {
  it("accepts 3 and 6 digit hex, with or without #, any case", () => {
    expect(normalizeHex("#2563EB")).toBe("#2563eb");
    expect(normalizeHex("2563eb")).toBe("#2563eb");
    expect(normalizeHex("#f40")).toBe("#ff4400");
    expect(normalizeHex("  #abc  ")).toBe("#aabbcc");
  });

  it("rejects everything else", () => {
    for (const bad of ["", "red", "#12", "#12345", "#1234567", "rgb(0,0,0)", "#ggg", null, undefined, 42]) {
      expect(normalizeHex(bad)).toBeNull();
    }
  });
});

describe("deriveBrandTokens", () => {
  it("derives light and dark primary tokens from a good brand color", () => {
    const t = deriveBrandTokens("#7c3aed");
    expect(t).not.toBeNull();
    expect(t!.light.primary).toBe("#7c3aed");
    expect(t!.light["primary-fg"]).toBe("#ffffff"); // white reads on this purple
    for (const k of Object.keys(t!.light)) expect(t!.light[k as keyof NonNullable<typeof t>["light"]]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rejects a too-light green and accepts a mid teal", () => {
    expect(deriveBrandTokens("#22c55e")).toBeNull(); // green: ~2.3:1 on white, rejected
    const t = deriveBrandTokens("#0d9488"); // teal, > 3:1 on white
    expect(t).not.toBeNull();
  });

  it("lightens a dark brand color for the dark surface but leaves an already readable one alone", () => {
    expect(deriveBrandTokens("#7c3aed")!.dark.primary).toBe("#7c3aed");
    const navy = deriveBrandTokens("#1e3a8a")!;
    expect(navy.dark.primary).not.toBe(navy.light.primary);
  });

  it("returns null for a color too light for a white surface (the default palette stays)", () => {
    expect(deriveBrandTokens("#ffff00")).toBeNull();
    expect(deriveBrandTokens("#ffffff")).toBeNull();
  });

  it("returns null for junk", () => {
    expect(deriveBrandTokens("not-a-color")).toBeNull();
    expect(deriveBrandTokens(undefined)).toBeNull();
  });

  it("keeps the dark primary readable on the dark surface and the button text readable on both", () => {
    const t = deriveBrandTokens("#1e3a8a")!; // very dark blue: must be lightened a lot in dark mode
    const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
    expect(contrast(hex(t.dark.primary!), [15, 23, 42])).toBeGreaterThanOrEqual(3);
    expect(contrast(hex(t.light["primary-fg"]!), hex(t.light.primary!))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(t.dark["primary-fg"]!), hex(t.dark.primary!))).toBeGreaterThanOrEqual(4.5);
  });
});
