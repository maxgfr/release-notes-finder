import { useState } from "react";

const SEARCH_HISTORY_KEY = "release-notes-finder-history";
const MAX_HISTORY_ITEMS = 10;

const getSearchHistory = (): string[] => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

const saveSearchHistory = (history: string[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    console.error("Failed to save search history");
  }
};

export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory());

  const addToHistory = (packageName: string) => {
    const newHistory = [
      packageName,
      ...searchHistory.filter(h => h !== packageName),
    ].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  const removeFromHistory = (packageName: string) => {
    const newHistory = searchHistory.filter(h => h !== packageName);
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
  };
};
