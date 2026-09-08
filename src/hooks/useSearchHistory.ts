import { useCallback, useEffect, useState } from "react";
import { isPackageName, normalizeName } from "../domain/package";
const KEY = "release-notes-finder-history";
const read = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? Array.from(
          new Set(
            value
              .filter((v): v is string => typeof v === "string")
              .map(normalizeName)
              .filter(isPackageName),
          ),
        ).slice(0, 10)
      : [];
  } catch {
    return [];
  }
};
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(searchHistory));
    } catch {
      /* History stays usable in memory. */
    }
  }, [searchHistory]);
  const addToHistory = useCallback((name: string) => {
    const normalized = normalizeName(name);
    if (isPackageName(normalized))
      setSearchHistory((prev) =>
        [normalized, ...prev.filter((v) => v !== normalized)].slice(0, 10),
      );
  }, []);
  const removeFromHistory = useCallback(
    (name: string) =>
      setSearchHistory((prev) => prev.filter((v) => v !== name)),
    [],
  );
  return { searchHistory, addToHistory, removeFromHistory };
}
