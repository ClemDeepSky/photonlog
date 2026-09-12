import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  preferences: boolean;
};

const STORAGE_KEY = "photonlog_cookie_consent";

type ConsentContextValue = {
  preferences: CookiePreferences | null;
  isOpen: boolean;
  save: (prefs: Omit<CookiePreferences, "necessary">) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  reopen: () => void;
  close: () => void;
};

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

const readStored = (): CookiePreferences | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      preferences: Boolean(parsed.preferences),
    };
  } catch {
    return null;
  }
};

export const CookieConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setPreferences(stored);
    if (!stored) setIsOpen(true);
  }, []);

  const persist = useCallback((prefs: CookiePreferences) => {
    setPreferences(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, date: new Date().toISOString() }));
    } catch {
      /* stockage indisponible */
    }
    setIsOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      preferences,
      isOpen,
      save: (prefs) => persist({ necessary: true, ...prefs }),
      acceptAll: () => persist({ necessary: true, analytics: true, preferences: true }),
      rejectAll: () => persist({ necessary: true, analytics: false, preferences: false }),
      reopen: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [preferences, isOpen, persist]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};

export const useCookieConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useCookieConsent doit être utilisé dans CookieConsentProvider");
  return ctx;
};
