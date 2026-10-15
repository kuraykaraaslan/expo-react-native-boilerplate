import type { Messages } from "@/modules/localization/translation.dto";
import de from "@/modules/app_shell/dictionaries/de.json";
import en from "@/modules/app_shell/dictionaries/en.json";
import es from "@/modules/app_shell/dictionaries/es.json";
import fr from "@/modules/app_shell/dictionaries/fr.json";
import it from "@/modules/app_shell/dictionaries/it.json";
import tr from "@/modules/app_shell/dictionaries/tr.json";

/** Bundled `app_shell` texts per language — the offline fallback for the server's `app_shell` dictionary. */
export const dictionaries: Record<string, Messages> = { en, tr, de, es, fr, it };
