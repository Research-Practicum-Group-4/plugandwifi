import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

export type Lang = 'en' | 'zh' | 'es' | 'fr' | 'ja' | 'ko';

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LANG_KEY = '@plugandwifi/lang';
const VALID_LANGS: Lang[] = ['en', 'zh', 'es', 'fr', 'ja', 'ko'];
const C = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: () => '' });

function getValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (typeof cur !== 'object' || cur == null) return path;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === 'string' ? cur : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(v => {
      if (VALID_LANGS.includes(v as Lang)) setLang(v as Lang);
    });
  }, []);

  const updateLang = useCallback((l: Lang) => {
    setLang(l);
    AsyncStorage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback(
    (key: string) => getValue(translations[lang] as Record<string, unknown>, key),
    [lang],
  );

  return <C.Provider value={{ lang, setLang: updateLang, t }}>{children}</C.Provider>;
}

export function useT() { return useContext(C); }
