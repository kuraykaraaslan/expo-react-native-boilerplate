import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/tenant/dictionary/de.json";
import en from "@/modules/tenant/dictionary/en.json";
import es from "@/modules/tenant/dictionary/es.json";
import fr from "@/modules/tenant/dictionary/fr.json";
import it from "@/modules/tenant/dictionary/it.json";
import tr from "@/modules/tenant/dictionary/tr.json";

/** Bundled `tenant` texts per language — the offline fallback for the server's `tenant` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
