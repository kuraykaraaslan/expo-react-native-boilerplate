import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/common/dictionary/de.json";
import en from "@/modules/common/dictionary/en.json";
import es from "@/modules/common/dictionary/es.json";
import fr from "@/modules/common/dictionary/fr.json";
import it from "@/modules/common/dictionary/it.json";
import tr from "@/modules/common/dictionary/tr.json";

/** Bundled `common` texts per language — the offline fallback for the server's `common` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
