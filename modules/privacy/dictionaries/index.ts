import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/privacy/dictionaries/de.json";
import en from "@/modules/privacy/dictionaries/en.json";
import es from "@/modules/privacy/dictionaries/es.json";
import fr from "@/modules/privacy/dictionaries/fr.json";
import it from "@/modules/privacy/dictionaries/it.json";
import tr from "@/modules/privacy/dictionaries/tr.json";

/** Bundled `privacy` texts per language — the offline fallback for the server's `privacy` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
