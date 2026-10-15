import { BUNDLED_DICTIONARIES, BUNDLED_LOCALES } from "@/libs/i18n";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    if (typeof value === "string") out[`${prefix}${key}`] = value;
    else Object.assign(out, flatten(value, `${prefix}${key}.`));
    return out;
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));

const cases = Object.entries(BUNDLED_DICTIONARIES).flatMap(([module, byLanguage]) =>
  BUNDLED_LOCALES.filter((code) => code !== "en").map((code) => [module, code, byLanguage] as const),
);

// A key missing from one language shows the raw key (or English) to those users;
// a placeholder that differs from English renders "{{count}}" literally or drops a value.
describe.each(cases)("%s/dictionary/%s.json", (module, code, byLanguage) => {
  const source = flatten((byLanguage.en ?? {}) as Tree);
  const flat = flatten((byLanguage[code] ?? {}) as Tree);

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

// All modules share one i18next namespace: two modules with the same top-level
// section would silently overwrite each other's texts.
it("no two modules share a top-level section", () => {
  const owner = new Map<string, string>();
  const clashes: string[] = [];
  for (const [module, byLanguage] of Object.entries(BUNDLED_DICTIONARIES)) {
    for (const section of Object.keys(byLanguage.en ?? {})) {
      const first = owner.get(section);
      if (first) clashes.push(`${section}: ${first} + ${module}`);
      else owner.set(section, module);
    }
  }
  expect(clashes).toEqual([]);
});
