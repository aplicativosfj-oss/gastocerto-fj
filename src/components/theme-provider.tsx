import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type Contrast = "normal" | "high";

const STORAGE_KEY = "gastocerto-theme";
const CONTRAST_KEY = "gastocerto-contrast";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  contrast: Contrast;
  highContrast: boolean;
  toggleContrast: () => void;
  setContrast: (contrast: Contrast) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  contrast: "normal",
  highContrast: false,
  toggleContrast: () => {},
  setContrast: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [contrast, setContrastState] = useState<Contrast>("normal");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeState(stored ?? (prefersDark ? "dark" : "light"));

    const storedContrast = window.localStorage.getItem(CONTRAST_KEY) as Contrast | null;
    const prefersMoreContrast = window.matchMedia("(prefers-contrast: more)").matches;
    setContrastState(storedContrast ?? (prefersMoreContrast ? "high" : "normal"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("hc", contrast === "high");
  }, [contrast]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setContrast = useCallback((next: Contrast) => {
    setContrastState(next);
    window.localStorage.setItem(CONTRAST_KEY, next);
  }, []);

  const toggleContrast = useCallback(() => {
    setContrastState((current) => {
      const next = current === "high" ? "normal" : "high";
      window.localStorage.setItem(CONTRAST_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        contrast,
        highContrast: contrast === "high",
        toggleContrast,
        setContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
