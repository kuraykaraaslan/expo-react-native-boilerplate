import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// ============================================================================
// i18n Singleton — initialized once, imported everywhere
// ============================================================================

import en from "@/locales/en.json";
import tr from "@/locales/tr.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";

const resources = {
  en: { common: en },
  tr: { common: tr },
  de: { common: de },
  es: { common: es },
  fr: { common: fr },
  it: { common: it },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
