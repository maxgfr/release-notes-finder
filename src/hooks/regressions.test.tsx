import { act, renderHook, cleanup } from "@testing-library/react";
import { useSearchHistory } from "./useSearchHistory";
import { useNpmSearch } from "./useNpmSearch";
import { usePackageSearch } from "./usePackageSearch";

const response = (name: string) =>
  ({
    ok: true,
    json: async () => ({ name, versions: { "1.0.0": {} } }),
  }) as Response;
afterEach(() => {
  cleanup();
  localStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it("rejects malformed history data", () => {
  localStorage.setItem("release-notes-finder-history", "{}");
  const { result } = renderHook(useSearchHistory);
  expect(result.current.searchHistory).toEqual([]);
});
it("cancels scheduled suggestions when cleared", async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
  const { result } = renderHook(useNpmSearch);
  act(() => {
    result.current.debouncedSearch("react");
    result.current.clearSuggestions();
  });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(fetch).not.toHaveBeenCalled();
});
it("keeps the newest package when requests finish out of order", async () => {
  const pending: ((value: Response) => void)[] = [];
  global.fetch = jest.fn(
    () => new Promise<Response>((resolve) => pending.push(resolve)),
  );
  const { result } = renderHook(usePackageSearch);
  let first: Promise<void>, second: Promise<void>;
  act(() => {
    first = result.current.searchPackage("old-package");
    second = result.current.searchPackage("new-package");
  });
  await act(async () => {
    pending[1](response("new-package"));
    await second;
  });
  await act(async () => {
    pending[0](response("old-package"));
    await first;
  });
  expect(result.current.packageData.packageName).toBe("new-package");
});
