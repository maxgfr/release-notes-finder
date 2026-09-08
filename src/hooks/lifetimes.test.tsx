import { act, cleanup, renderHook } from "@testing-library/react";
import { useNpmSearch } from "./useNpmSearch";
import { usePackageSearch } from "./usePackageSearch";
import { useSearchHistory } from "./useSearchHistory";
const ok = (value: unknown) =>
  ({ ok: true, json: async () => value }) as Response;
const pkg = (name: string) => ({
  name,
  versions: { "1.0.0": {}, "1.1.0": {} },
  repository: "github:owner/repo",
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it("ignores autocomplete responses after dismissal and unmount", async () => {
  jest.useFakeTimers();
  let resolve: (value: Response) => void = () => undefined;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  const { result, unmount } = renderHook(useNpmSearch);
  act(() => result.current.debouncedSearch("react"));
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  act(() => result.current.clearSuggestions());
  await act(async () => {
    resolve(ok({ objects: [{ package: { name: "react" } }] }));
  });
  expect(result.current.npmSuggestions).toEqual([]);
  expect(result.current.isSearching).toBe(false);
  act(() => result.current.debouncedSearch("next"));
  unmount();
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("preserves multiple history updates in the same event and tolerates unavailable storage", () => {
  const { result } = renderHook(useSearchHistory);
  act(() => {
    result.current.addToHistory(" REACT ");
    result.current.addToHistory("next");
  });
  expect(result.current.searchHistory).toEqual(["next", "react"]);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  act(() => result.current.addToHistory("@babel/core"));
  expect(result.current.searchHistory[0]).toBe("@babel/core");
});
it("deduplicates release requests and does not reopen closed tabs when results arrive", async () => {
  let resolve: (value: Response) => void = () => undefined;
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(ok(pkg("foo")))
    .mockImplementation(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
  const { result } = renderHook(usePackageSearch);
  await act(async () => result.current.searchPackage("foo"));
  let one: Promise<void>, two: Promise<void>;
  await act(async () => {
    one = result.current.fetchVersionReleaseNotes("1.0.0");
    two = result.current.fetchVersionReleaseNotes("1.0.0");
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  act(() => result.current.closeVersionTab("1.0.0"));
  await act(async () => {
    resolve(ok({ tag_name: "v1.0.0", body: "notes" }));
    await Promise.all([one, two]);
  });
  expect(result.current.openVersions).toEqual([]);
  expect(result.current.notes["1.0.0"].status).toBe("success");
});
it("does not mix notes from the previous package with the current one", async () => {
  let resolve: (value: Response) => void = () => undefined;
  global.fetch = jest.fn(async (url: RequestInfo | URL) =>
    String(url).includes("registry.npmjs.org")
      ? ok(pkg(String(url).split("/").pop()!))
      : new Promise<Response>((r) => {
          resolve = r;
        }),
  );
  const { result } = renderHook(usePackageSearch);
  await act(async () => result.current.searchPackage("first"));
  let notes: Promise<void>;
  await act(async () => {
    notes = result.current.fetchVersionReleaseNotes("1.0.0");
  });
  await act(async () => result.current.searchPackage("second"));
  await act(async () => {
    resolve(ok({ tag_name: "v1.0.0", body: "old notes" }));
    await notes;
  });
  expect(result.current.packageData.packageName).toBe("second");
  expect(result.current.notes).toEqual({});
  expect(result.current.openVersions).toEqual([]);
});
