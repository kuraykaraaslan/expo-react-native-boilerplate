import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/tenant_invitation/dictionaries/de.json";
import en from "@/modules/tenant_invitation/dictionaries/en.json";
import es from "@/modules/tenant_invitation/dictionaries/es.json";
import fr from "@/modules/tenant_invitation/dictionaries/fr.json";
import it from "@/modules/tenant_invitation/dictionaries/it.json";
import tr from "@/modules/tenant_invitation/dictionaries/tr.json";

/** Bundled `tenant_invitation` texts per language — the offline fallback for the server's `tenant_invitation` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
