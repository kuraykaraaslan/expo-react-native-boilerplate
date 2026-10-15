import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/user/dictionaries/de.json";
import en from "@/modules/user/dictionaries/en.json";
import es from "@/modules/user/dictionaries/es.json";
import fr from "@/modules/user/dictionaries/fr.json";
import it from "@/modules/user/dictionaries/it.json";
import tr from "@/modules/user/dictionaries/tr.json";

/** Bundled `user` texts per language — the offline fallback for the server's `user` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
