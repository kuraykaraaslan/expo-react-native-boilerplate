import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/auth/dictionaries/de.json";
import en from "@/modules/auth/dictionaries/en.json";
import es from "@/modules/auth/dictionaries/es.json";
import fr from "@/modules/auth/dictionaries/fr.json";
import it from "@/modules/auth/dictionaries/it.json";
import tr from "@/modules/auth/dictionaries/tr.json";

/** Bundled `auth` texts per language — the offline fallback for the server's `auth` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
