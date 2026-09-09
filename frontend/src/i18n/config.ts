import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import modulesEn from './locales/en/modules.json';
import commonEs from './locales/es/common.json';
import modulesEs from './locales/es/modules.json';
import commonZh from './locales/zh/common.json';
import modulesZh from './locales/zh/modules.json';

const resources = {
  en: {
    common: commonEn,
    modules: modulesEn,
  },
  es: {
    common: commonEs,
    modules: modulesEs,
  },
  zh: {
    common: commonZh,
    modules: modulesZh,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: 'common',
    ns: ['common', 'modules'],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
