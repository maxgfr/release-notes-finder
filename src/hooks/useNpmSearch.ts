import { useState, useRef, useCallback } from "react";

interface NpmSearchResult {
  name: string;
  description?: string;
}

export const useNpmSearch = () => {
  const [npmSuggestions, setNpmSuggestions] = useState<NpmSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const searchNpmPackages = useCallback(async (query: string) => {
    if (query.length < 2) {
      setNpmSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
      );
      const data = await response.json();
      const suggestions: NpmSearchResult[] = data.objects?.map(
        (obj: { package: { name: string; description?: string } }) => ({
          name: obj.package.name,
          description: obj.package.description,
        })
      ) || [];
      setNpmSuggestions(suggestions);
    } catch {
      setNpmSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        searchNpmPackages(query);
      }, 300);
    },
    [searchNpmPackages]
  );

  const clearSuggestions = useCallback(() => {
    setNpmSuggestions([]);
  }, []);

  return {
    npmSuggestions,
    isSearching,
    debouncedSearch,
    clearSuggestions,
  };
};
