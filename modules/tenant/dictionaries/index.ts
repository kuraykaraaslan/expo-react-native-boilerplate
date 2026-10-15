import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/tenant/dictionaries/de.json";
import en from "@/modules/tenant/dictionaries/en.json";
import es from "@/modules/tenant/dictionaries/es.json";
import fr from "@/modules/tenant/dictionaries/fr.json";
import it from "@/modules/tenant/dictionaries/it.json";
import tr from "@/modules/tenant/dictionaries/tr.json";

/** Bundled `tenant` texts per language — the offline fallback for the server's `tenant` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
