import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/tenant_setting/dictionaries/de.json";
import en from "@/modules/tenant_setting/dictionaries/en.json";
import es from "@/modules/tenant_setting/dictionaries/es.json";
import fr from "@/modules/tenant_setting/dictionaries/fr.json";
import it from "@/modules/tenant_setting/dictionaries/it.json";
import tr from "@/modules/tenant_setting/dictionaries/tr.json";

/** Bundled `tenant_setting` texts per language — the offline fallback for the server's `tenant_setting` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
