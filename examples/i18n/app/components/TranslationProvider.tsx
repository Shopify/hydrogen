import React, {useMemo} from 'react';
import i18next from 'i18next';
import {I18nextProvider, initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type {I18nLocale} from '../../@types/i18next';

i18next.use(LanguageDetector).use(initReactI18next);

export function TranslationProvider({
  children,
  i18n,
}: {
  children: React.ReactNode;
  i18n: I18nLocale;
}) {
  const i18nInstance = useMemo(() => {
    const i18nOptions = {
      debug: false,
      defaultNS: 'translation',
      fallbackLng: i18n.language,
      interpolation: {
        escapeValue: false,
      },
      ns: ['translation'],
      returnNull: false,
      resources: {
        [i18n.language]: {translation: i18n.translation},
      },
    };

    return i18next.createInstance(i18nOptions, () => {});
  }, [i18n]);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
