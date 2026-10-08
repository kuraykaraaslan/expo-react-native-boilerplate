// ============================================================================
// Tenant brand color → theme tokens (pure, no React / no kui-native).
// A tenant admin types any hex on the web; the app must never let an unreadable
// or unusable color through, so every derived token is checked and a color that
// cannot be made accessible returns null (the default palette stays).
// ============================================================================

type RGB = [number, number, number];

const LIGHT_SURFACE: RGB = [255, 255, 255]; // surface-base, light
const DARK_SURFACE: RGB = [15, 23, 42]; // #0f172a, surface-base dark
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

/** Minimum contrast of the brand color against the surface (WCAG 1.4.11, non-text UI). */
const MIN_UI_CONTRAST = 3;

export type BrandTokens = Partial<
  Record<"primary" | "primary-hover" | "primary-active" | "primary-subtle" | "primary-fg" | "border-focus", string>
>;
export type BrandOverrides = { light: BrandTokens; dark: BrandTokens };

/** "#abc" / "#aabbcc" (with or without #) → "#aabbcc"; anything else → null. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return `#${h.toLowerCase()}`;
}

const parse = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text color for a filled button: whichever of white / black reads better (always ≥ 4.5:1). */
const pickForeground = (bg: RGB): string => (contrast(WHITE, bg) >= contrast(BLACK, bg) ? "#ffffff" : "#000000");

/**
 * Derives both schemes' primary tokens from a brand hex, or null when it is not a
 * valid hex or is too light to be used on a white surface (contrast < 3:1).
 * Dark scheme: the brand color is lightened until it reads on the dark surface.
 */
export function deriveBrandTokens(hex: unknown): BrandOverrides | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const base = parse(norm);
  if (contrast(base, LIGHT_SURFACE) < MIN_UI_CONTRAST) return null;

  // Measure the color as it will actually be stored (rounded to a hex byte), not the float in between.
  const rounded = (c: RGB): RGB => parse(toHex(c));
  let dark = base;
  for (let step = 1; contrast(dark, DARK_SURFACE) < MIN_UI_CONTRAST && step <= 20; step++) dark = rounded(mix(base, WHITE, step * 0.05));
  if (contrast(dark, DARK_SURFACE) < MIN_UI_CONTRAST) return null;

  return {
    light: {
      primary: norm,
      "primary-hover": toHex(mix(base, BLACK, 0.12)),
      "primary-active": toHex(mix(base, BLACK, 0.24)),
      "primary-subtle": toHex(mix(base, WHITE, 0.92)),
      "primary-fg": pickForeground(base),
      "border-focus": norm,
    },
    dark: {
      primary: toHex(dark),
      "primary-hover": toHex(mix(dark, WHITE, 0.15)),
      "primary-active": toHex(mix(base, BLACK, 0.2)),
      "primary-subtle": toHex(mix(dark, DARK_SURFACE, 0.85)),
      "primary-fg": pickForeground(dark),
      "border-focus": toHex(dark),
    },
  };
}
