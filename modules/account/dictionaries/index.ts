import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/account/dictionaries/de.json";
import en from "@/modules/account/dictionaries/en.json";
import es from "@/modules/account/dictionaries/es.json";
import fr from "@/modules/account/dictionaries/fr.json";
import it from "@/modules/account/dictionaries/it.json";
import tr from "@/modules/account/dictionaries/tr.json";

/** Bundled `account` texts per language — the offline fallback for the server's `account` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
