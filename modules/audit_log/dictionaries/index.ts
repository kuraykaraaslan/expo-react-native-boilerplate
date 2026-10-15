import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/audit_log/dictionaries/de.json";
import en from "@/modules/audit_log/dictionaries/en.json";
import es from "@/modules/audit_log/dictionaries/es.json";
import fr from "@/modules/audit_log/dictionaries/fr.json";
import it from "@/modules/audit_log/dictionaries/it.json";
import tr from "@/modules/audit_log/dictionaries/tr.json";

/** Bundled `audit_log` texts per language — the offline fallback for the server's `audit_log` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
