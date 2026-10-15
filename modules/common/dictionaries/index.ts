import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/common/dictionaries/de.json";
import en from "@/modules/common/dictionaries/en.json";
import es from "@/modules/common/dictionaries/es.json";
import fr from "@/modules/common/dictionaries/fr.json";
import it from "@/modules/common/dictionaries/it.json";
import tr from "@/modules/common/dictionaries/tr.json";

/** Bundled `common` texts per language — the offline fallback for the server's `common` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
