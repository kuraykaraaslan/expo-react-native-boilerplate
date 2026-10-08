import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import itLocale from "@/locales/it.json";
import tr from "@/locales/tr.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    if (typeof value === "string") out[`${prefix}${key}`] = value;
    else Object.assign(out, flatten(value, `${prefix}${key}.`));
    return out;
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));

const source = flatten(en as Tree);
const others = { tr, de, es, fr, it: itLocale } as const;

// A key missing from one language shows the raw key (or English) to those users;
// a placeholder that differs from English renders "{{count}}" literally or drops a value.
describe.each(Object.entries(others))("locale %s", (code, tree) => {
  const flat = flatten(tree as Tree);

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
    void code;
  });
});
