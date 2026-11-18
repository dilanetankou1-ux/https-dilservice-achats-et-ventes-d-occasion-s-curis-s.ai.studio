import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getLanguageMeta,
  getUiStrings,
  type UiTranslations,
  type WorldLanguage,
} from '../lib/i18n';

interface LanguageContextValue {
  languageCode: string;
  languageMeta: WorldLanguage;
  t: UiTranslations;
  setLanguageCode: (code: string) => void;
}

const STORAGE_KEY = 'dilservice_world_lang';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [languageCode, setLanguageCodeState] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // ignore storage errors
    }
    return 'fr';
  });

  const setLanguageCode = (code: string) => {
    const clean = code.trim() || 'fr';
    setLanguageCodeState(clean);
    try {
      window.localStorage.setItem(STORAGE_KEY, clean);
    } catch {
      // ignore storage errors
    }
  };

  const languageMeta = getLanguageMeta(languageCode);
  const t = getUiStrings(languageCode);

  useEffect(() => {
    document.documentElement.lang = languageCode;
    document.documentElement.dir = languageMeta.rtl ? 'rtl' : 'ltr';
  }, [languageCode, languageMeta.rtl]);

  return (
    <LanguageContext.Provider
      value={{ languageCode, languageMeta, t, setLanguageCode }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage doit être utilisé dans un LanguageProvider.');
  }
  return ctx;
}
