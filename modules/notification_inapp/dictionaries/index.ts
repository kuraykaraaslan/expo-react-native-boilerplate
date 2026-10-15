import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/notification_inapp/dictionaries/de.json";
import en from "@/modules/notification_inapp/dictionaries/en.json";
import es from "@/modules/notification_inapp/dictionaries/es.json";
import fr from "@/modules/notification_inapp/dictionaries/fr.json";
import it from "@/modules/notification_inapp/dictionaries/it.json";
import tr from "@/modules/notification_inapp/dictionaries/tr.json";

/** Bundled `notification_inapp` texts per language — the offline fallback for the server's `notification_inapp` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
