import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

/**
 * The key is duplicated by the inline script in index.html, which applies the
 * theme before first paint. Keep the two in sync.
 */
const STORAGE_KEY = 'dhun.theme';

type ThemeValue = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Theme is one attribute on <html>; every token in tokens.css follows it.
 * No screen needs to know which theme is active beyond picking the icon.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage can be unavailable; the theme still applies this session */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
