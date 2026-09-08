export type ThemePreference = "auto" | "light" | "dark";
export const THEME_KEY = "release-notes-finder-theme";
export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "auto" || saved === "light" || saved === "dark") return saved;
    const legacy = localStorage.getItem("chakra-ui-color-mode");
    return legacy === "light" || legacy === "dark" ? legacy : "auto";
  } catch {
    return "auto";
  }
}
export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "auto"
    ? typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : preference;
}
// Chakra stores resolved colors, whereas we persist the user's three-way preference.
export const themeStorageManager = {
  type: "localStorage" as const,
  get: () => resolveTheme(readThemePreference()),
  set: () => {},
};
export function initializeTheme() {
  const mode = resolveTheme(readThemePreference());
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  document.body.classList.remove("chakra-ui-light", "chakra-ui-dark");
  document.body.classList.add(`chakra-ui-${mode}`);
}
