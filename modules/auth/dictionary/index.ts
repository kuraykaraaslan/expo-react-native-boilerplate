import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/auth/dictionary/de.json";
import en from "@/modules/auth/dictionary/en.json";
import es from "@/modules/auth/dictionary/es.json";
import fr from "@/modules/auth/dictionary/fr.json";
import it from "@/modules/auth/dictionary/it.json";
import tr from "@/modules/auth/dictionary/tr.json";

/** Bundled `auth` texts per language — the offline fallback for the server's `auth` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
