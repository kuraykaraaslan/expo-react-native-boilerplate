import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";

//import store from '@/libs/redux/store';

const compatibilityJSON = 'v3';
const fallbackLng = 'en';
const languages = ['en', 'tr', 'de','es', 'fr', 'it'];

const resources = {
  en: {
    translation: en
  }
  ,
  tr: {
    translation: tr
  },
  de: {
    translation: de
  },
  es: {
    translation: es
  },
  fr: {
    translation: fr
  },
  it: {
    translation: it
  }
};

const interpolation = {
  escapeValue: false, // not needed for react as it escapes by default
};


// @ts-ignore
i18n
  // load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
  // learn more: https://github.com/i18next/i18next-http-backend
  // want your translations to be loaded from a professional CDN? => https://github.com/locize/react-tutorial#step-2---use-the-locize-cdn
  //.use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  //.use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    compatibilityJSON,
    fallbackLng,
    debug : false,
    resources,
    interpolation
  });




export default i18n;