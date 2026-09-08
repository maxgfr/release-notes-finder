import { useState, useRef, useCallback, useEffect } from "react";
import { ApiClient, isAbort } from "../services/client";
import { record, text } from "../domain/package";
export interface NpmSuggestion {
  name: string;
  description?: string;
}
export function useNpmSearch() {
  const [npmSuggestions, setNpmSuggestions] = useState<NpmSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const client = useRef(new ApiClient());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const controller = useRef<AbortController>();
  const sequence = useRef(0);
  const cancel = useCallback(() => {
    sequence.current++;
    clearTimeout(timer.current);
    controller.current?.abort();
  }, []);
  const clearSuggestions = useCallback(() => {
    cancel();
    setNpmSuggestions([]);
    setIsSearching(false);
    setError("");
  }, [cancel]);
  useEffect(() => cancel, [cancel]);
  const debouncedSearch = useCallback(
    (value: string) => {
      clearSuggestions();
      const query = value.trim();
      if (query.length < 2) return;
      const id = sequence.current;
      timer.current = setTimeout(async () => {
        const abort = new AbortController();
        controller.current = abort;
        setIsSearching(true);
        try {
          const data = record(
            await client.current.get(
              `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`,
              abort.signal,
            ),
          );
          if (!Array.isArray(data.objects))
            throw new Error("Invalid search response");
          const suggestions = data.objects
            .map((value: unknown) => {
              const pkg = record(record(value).package);
              return {
                name: text(pkg.name),
                description: text(pkg.description),
              };
            })
            .filter((v: NpmSuggestion) => v.name);
          if (id === sequence.current) setNpmSuggestions(suggestions);
        } catch (error) {
          if (id === sequence.current && !isAbort(error))
            setError(
              "Suggestions are unavailable. You can still search by package name.",
            );
        } finally {
          if (id === sequence.current) setIsSearching(false);
        }
      }, 300);
    },
    [clearSuggestions],
  );
  return {
    npmSuggestions,
    isSearching,
    error,
    debouncedSearch,
    clearSuggestions,
  };
}
