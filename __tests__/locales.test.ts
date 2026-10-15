import { BUNDLED_DICTIONARIES, BUNDLED_LOCALES } from "@/libs/i18n";


const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));

const cases = Object.entries(BUNDLED_DICTIONARIES).flatMap(([module, byLanguage]) =>
  BUNDLED_LOCALES.filter((code) => code !== "en").map((code) => [module, code, byLanguage] as const),
);

// A key missing from one language shows the raw key (or English) to those users;
// a placeholder that differs from English renders "{{count}}" literally or drops a value.
describe.each(cases)("%s/dictionaries/%s.json", (module, code, byLanguage) => {
  const source = byLanguage.en ?? {};
  const flat = byLanguage[code] ?? {};

  it("exists", () => {
    expect(byLanguage[code]).toBeDefined();
  });

  it("has exactly the keys English has", () => {
    expect(Object.keys(source).filter((k) => !(k in flat))).toEqual([]);
    expect(Object.keys(flat).filter((k) => !(k in source))).toEqual([]);
  });

  it("uses the same {{placeholders}} as English in every string", () => {
    const mismatched = Object.keys(source).filter((k) => k in flat && placeholders(flat[k]).join() !== placeholders(source[k]).join());
    expect(mismatched).toEqual([]);
  });

  it("has no empty strings", () => {
    expect(Object.keys(flat).filter((k) => flat[k].trim() === "")).toEqual([]);
    void module;
  });
});

// All modules share one i18next namespace; like next-boilerplate's extractor, every
// key must carry its module id ("<module>.<area>.<slug>") so modules never collide.
it("every key starts with its own module id", () => {
  const misplaced: string[] = [];
  for (const [module, byLanguage] of Object.entries(BUNDLED_DICTIONARIES)) {
    for (const key of Object.keys(byLanguage.en ?? {})) {
      if (!new RegExp(`^${module}\\.[A-Za-z0-9]+\\.[A-Za-z0-9_]+$`).test(key)) misplaced.push(`${module}: ${key}`);
    }
  }
  expect(misplaced).toEqual([]);
});
