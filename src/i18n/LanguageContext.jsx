import { createContext, useState, useContext, useEffect } from 'react';
import { translations, defaultLanguage } from './translations';

// Erstellen des Kontexts
export const LanguageContext = createContext();

// Schlüssel für den localStorage
const LANG_KEY = 'trackwerk_language';

// Provider-Komponente für den Sprachkontext
export function LanguageProvider({ children }) {
  // Lade gespeicherte Sprache oder verwende die Standardsprache
  const [language, setLanguage] = useState(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      return savedLang || defaultLanguage;
    } catch (error) {
      console.error('Fehler beim Laden der Spracheinstellung:', error);
      return defaultLanguage;
    }
  });

  // Übersetze einen Schlüssel in die aktuelle Sprache
  const t = (key) => {
    try {
      // Finde die Übersetzung für den Schlüssel in der aktuellen Sprache
      const langTranslations = translations[language] || translations[defaultLanguage];
      return langTranslations[key] || key; // Falls keine Übersetzung gefunden, gib den Schlüssel zurück
    } catch (error) {
      console.error(`Übersetzungsfehler für Schlüssel "${key}":`, error);
      return key;
    }
  };

  // Funktion zum Ändern der Sprache
  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      try {
        localStorage.setItem(LANG_KEY, newLanguage);
      } catch (error) {
        console.error('Fehler beim Speichern der Spracheinstellung:', error);
      }
    }
  };

  // Werte für den Kontext
  const contextValue = {
    language,
    changeLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook für einfachen Zugriff auf den Sprachkontext
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage muss innerhalb eines LanguageProvider verwendet werden');
  }
  return context;
} 