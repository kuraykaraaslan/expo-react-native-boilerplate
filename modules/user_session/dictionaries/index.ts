import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/user_session/dictionaries/de.json";
import en from "@/modules/user_session/dictionaries/en.json";
import es from "@/modules/user_session/dictionaries/es.json";
import fr from "@/modules/user_session/dictionaries/fr.json";
import it from "@/modules/user_session/dictionaries/it.json";
import tr from "@/modules/user_session/dictionaries/tr.json";

/** Bundled `user_session` texts per language — the offline fallback for the server's `user_session` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
