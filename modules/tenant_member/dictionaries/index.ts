import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/tenant_member/dictionaries/de.json";
import en from "@/modules/tenant_member/dictionaries/en.json";
import es from "@/modules/tenant_member/dictionaries/es.json";
import fr from "@/modules/tenant_member/dictionaries/fr.json";
import it from "@/modules/tenant_member/dictionaries/it.json";
import tr from "@/modules/tenant_member/dictionaries/tr.json";

/** Bundled `tenant_member` texts per language — the offline fallback for the server's `tenant_member` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
