import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyPackage,
  isPackageName,
  normalizeName,
  normalizePackage,
  PackageData,
} from "../domain/package";
import { ApiClient, errorMessage, isAbort } from "../services/client";
import { Changelog, ReleaseNotes, ReleaseService } from "../services/releases";
import { ComparisonService, CompareLoader } from "../services/comparison";
export type Resource<T> = {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: string;
};
export function usePackageSearch() {
  const [client] = useState(() => new ApiClient());
  const [service] = useState(() => new ReleaseService(client));
  const [comparisons] = useState(() => new ComparisonService(client, service));
  const [packageData, setPackageData] = useState<PackageData>(emptyPackage);
  const [packageStatus, setPackageStatus] = useState<Resource<PackageData>>({
    status: "idle",
  });
  const [notes, setNotes] = useState<Record<string, Resource<ReleaseNotes>>>(
    {},
  );
  const [openVersions, setOpenVersions] = useState<string[]>([]);
  const [changelog, setChangelog] = useState<Resource<Changelog | null>>({
    status: "idle",
  });
  const pkgRef = useRef(emptyPackage);
  const notesRef = useRef(notes);
  const changelogRef = useRef(changelog);
  const changelogTime = useRef(0);
  const pending = useRef(new Map<string, Promise<ReleaseNotes>>());
  const noteTimes = useRef(new Map<string, number>());
  const lifetime = useRef(new AbortController());
  const sequence = useRef(0);
  const invalidate = useCallback(() => {
    sequence.current++;
    lifetime.current.abort();
    lifetime.current = new AbortController();
    pending.current.clear();
  }, []);
  useEffect(
    () => () => {
      invalidate();
      client.dispose();
    },
    [client, invalidate],
  );
  const updateNotes = useCallback(
    (version: string, state: Resource<ReleaseNotes>) => {
      notesRef.current = { ...notesRef.current, [version]: state };
      setNotes(notesRef.current);
    },
    [],
  );
  const clearResources = useCallback(() => {
    notesRef.current = {};
    noteTimes.current.clear();
    setNotes({});
    changelogRef.current = { status: "idle" };
    setChangelog(changelogRef.current);
  }, []);
  const searchPackage = useCallback(
    async (value: string, refresh = false): Promise<void> => {
      invalidate();
      const id = sequence.current;
      clearResources();
      setOpenVersions([]);
      pkgRef.current = emptyPackage;
      setPackageData(emptyPackage);
      const name = normalizeName(value);
      if (!name) {
        setPackageStatus({ status: "idle" });
        return;
      }
      if (!isPackageName(name)) {
        setPackageStatus({
          status: "error",
          error:
            "Enter a valid npm package name, such as react or @babel/core.",
        });
        return;
      }
      setPackageStatus({ status: "loading" });
      try {
        if (refresh) client.clear();
        const data = await client.get(
          `https://registry.npmjs.org/${encodeURIComponent(name)}`,
          lifetime.current.signal,
        );
        const pkg = normalizePackage(data, name);
        if (id !== sequence.current) return;
        pkgRef.current = pkg;
        setPackageData(pkg);
        setPackageStatus({ status: "success", data: pkg });
      } catch (error) {
        if (id === sequence.current && !isAbort(error))
          setPackageStatus({ status: "error", error: errorMessage(error) });
      }
    },
    [client, invalidate, clearResources],
  );
  const loadRelease = useCallback(
    (version: string, retry = false): Promise<ReleaseNotes> => {
      const pkg = pkgRef.current;
      const saved = notesRef.current[version];
      if (
        !retry &&
        saved?.status === "success" &&
        saved.data &&
        Date.now() - (noteTimes.current.get(version) || 0) < 300000
      )
        return Promise.resolve(saved.data);
      const existing = pending.current.get(version);
      if (existing) return existing;
      if (!pkg.versions.includes(version))
        return Promise.reject(
          new Error("This version does not exist in the selected package."),
        );
      const id = sequence.current;
      updateNotes(version, { status: "loading" });
      const promise = service
        .release(pkg, version, lifetime.current.signal)
        .then((data) => {
          if (id === sequence.current) {
            noteTimes.current.set(version, Date.now());
            updateNotes(version, { status: "success", data });
          }
          return data;
        })
        .catch((error) => {
          if (id === sequence.current && !isAbort(error))
            updateNotes(version, {
              status: "error",
              error: errorMessage(error),
            });
          throw error;
        })
        .finally(() => {
          if (pending.current.get(version) === promise)
            pending.current.delete(version);
        });
      pending.current.set(version, promise);
      return promise;
    },
    [service, updateNotes],
  );
  const fetchVersionReleaseNotes = useCallback(
    async (version: string) => {
      if (!pkgRef.current.versions.includes(version)) return;
      setOpenVersions((prev) =>
        prev.includes(version) ? prev : [...prev, version],
      );
      try {
        await loadRelease(version);
      } catch {
        /* The version panel owns the error. */
      }
    },
    [loadRelease],
  );
  const closeVersionTab = useCallback(
    (version: string) =>
      setOpenVersions((prev) => prev.filter((v) => v !== version)),
    [],
  );
  const loadChangelog = useCallback(
    async (retry = false) => {
      if (
        !retry &&
        (changelogRef.current.status === "loading" ||
          (changelogRef.current.status === "success" &&
            Date.now() - changelogTime.current < 300000))
      )
        return;
      const id = sequence.current;
      changelogRef.current = { status: "loading" };
      setChangelog(changelogRef.current);
      try {
        const data = await service.changelog(
          pkgRef.current,
          lifetime.current.signal,
        );
        if (id === sequence.current) {
          changelogTime.current = Date.now();
          changelogRef.current = { status: "success", data };
          setChangelog(changelogRef.current);
        }
      } catch (error) {
        if (id === sequence.current && !isAbort(error)) {
          changelogRef.current = {
            status: "error",
            error: errorMessage(error),
          };
          setChangelog(changelogRef.current);
        }
      }
    },
    [service],
  );
  const compareVersions: CompareLoader = useCallback(
    (from, to, signal, page, refs) => {
      return comparisons.compare(pkgRef.current, from, to, signal, page, refs);
    },
    [comparisons],
  );
  const setGithubToken = useCallback(
    (token: string) => {
      invalidate();
      client.setToken(token);
      clearResources();
    },
    [invalidate, client, clearResources],
  );
  return {
    packageData,
    packageStatus,
    notes,
    openVersions,
    changelog,
    searchPackage,
    loadRelease,
    compareVersions,
    fetchVersionReleaseNotes,
    closeVersionTab,
    loadChangelog,
    setGithubToken,
  };
}
