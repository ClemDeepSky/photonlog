import { createContext, useContext, useEffect, useState } from "react";

export type AppVersion = "v1" | "v2";

const STORAGE_KEY = "photonlog-version";

interface Ctx {
  version: AppVersion;
  setVersion: (v: AppVersion) => void;
}

const AppVersionContext = createContext<Ctx>({ version: "v1", setVersion: () => {} });

export const AppVersionProvider = ({ children }: { children: React.ReactNode }) => {
  const [version, setVersionState] = useState<AppVersion>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "v2" ? "v2" : "v1";
    } catch {
      return "v1";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      /* stockage indisponible : la version reste celle de la session */
    }
  }, [version]);

  return (
    <AppVersionContext.Provider value={{ version, setVersion: setVersionState }}>
      {children}
    </AppVersionContext.Provider>
  );
};

export const useAppVersion = () => useContext(AppVersionContext);
