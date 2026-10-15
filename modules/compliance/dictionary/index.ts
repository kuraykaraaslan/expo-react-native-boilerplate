import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/compliance/dictionary/de.json";
import en from "@/modules/compliance/dictionary/en.json";
import es from "@/modules/compliance/dictionary/es.json";
import fr from "@/modules/compliance/dictionary/fr.json";
import it from "@/modules/compliance/dictionary/it.json";
import tr from "@/modules/compliance/dictionary/tr.json";

/** Bundled `compliance` texts per language — the offline fallback for the server's `compliance` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
