import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { useColorMode } from "@chakra-ui/react";
import {
  readThemePreference,
  resolveTheme,
  THEME_KEY,
  ThemePreference,
} from "./preference";
const Context = createContext<{
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
} | null>(null);
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readThemePreference);
  const { setColorMode } = useColorMode();
  useLayoutEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      /* The current tab still works without storage. */
    }
    const apply = () => setColorMode(resolveTheme(preference));
    apply();
    if (preference !== "auto" || typeof window.matchMedia !== "function")
      return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference, setColorMode]);
  return (
    <Context.Provider value={{ preference, setPreference }}>
      {children}
    </Context.Provider>
  );
}
export function useThemePreference() {
  const context = useContext(Context);
  if (!context) throw new Error("ThemePreferenceProvider is required");
  return context;
}
