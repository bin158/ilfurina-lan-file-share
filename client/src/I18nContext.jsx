import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, DAISY_THEMES } from './i18n';

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lan_share_lang') || 'zh');
  const [theme, setThemeState] = useState(() => localStorage.getItem('lan_share_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lan_share_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    localStorage.setItem('lan_share_lang', lang);
  }, [lang]);

  const setLang = (newLang) => {
    setLangState(newLang);
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const t = (key, params = {}) => {
    const dict = translations[lang] || translations.zh;
    let val = dict[key] || translations.zh[key] || key;
    Object.keys(params).forEach(p => {
      val = val.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
    });
    return val;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, theme, setTheme, t, DAISY_THEMES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
