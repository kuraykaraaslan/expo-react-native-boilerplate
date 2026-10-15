import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/dashboard/dictionaries/de.json";
import en from "@/modules/dashboard/dictionaries/en.json";
import es from "@/modules/dashboard/dictionaries/es.json";
import fr from "@/modules/dashboard/dictionaries/fr.json";
import it from "@/modules/dashboard/dictionaries/it.json";
import tr from "@/modules/dashboard/dictionaries/tr.json";

/** Bundled `dashboard` texts per language — the offline fallback for the server's `dashboard` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
