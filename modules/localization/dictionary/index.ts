import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/localization/dictionary/de.json";
import en from "@/modules/localization/dictionary/en.json";
import es from "@/modules/localization/dictionary/es.json";
import fr from "@/modules/localization/dictionary/fr.json";
import it from "@/modules/localization/dictionary/it.json";
import tr from "@/modules/localization/dictionary/tr.json";

/** Bundled `localization` texts per language — the offline fallback for the server's `localization` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
