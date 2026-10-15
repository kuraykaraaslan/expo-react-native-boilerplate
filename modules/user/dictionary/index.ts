import type { TranslationTree } from "@/modules/localization/translation.dto";
import de from "@/modules/user/dictionary/de.json";
import en from "@/modules/user/dictionary/en.json";
import es from "@/modules/user/dictionary/es.json";
import fr from "@/modules/user/dictionary/fr.json";
import it from "@/modules/user/dictionary/it.json";
import tr from "@/modules/user/dictionary/tr.json";

/** Bundled `user` texts per language — the offline fallback for the server's `user` dictionary. */
const dictionary: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

export default dictionary;
