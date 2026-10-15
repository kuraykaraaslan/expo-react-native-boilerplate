import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/user_security/dictionaries/de.json";
import en from "@/modules/user_security/dictionaries/en.json";
import es from "@/modules/user_security/dictionaries/es.json";
import fr from "@/modules/user_security/dictionaries/fr.json";
import it from "@/modules/user_security/dictionaries/it.json";
import tr from "@/modules/user_security/dictionaries/tr.json";

/** Bundled `user_security` texts per language — the offline fallback for the server's `user_security` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
