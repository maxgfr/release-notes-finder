import { valid, rcompare, prerelease, gt, lte, parse } from "semver";

export interface Repository {
  owner: string;
  name: string;
  url: string;
  directory: string;
}
export interface PackageData {
  packageName: string;
  versions: string[];
  latestVersion: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  keywords: string[];
  repository?: Repository;
  githubUrl: string;
}
export const emptyPackage: PackageData = {
  packageName: "",
  versions: [],
  latestVersion: "",
  description: "",
  author: "",
  license: "",
  homepage: "",
  keywords: [],
  githubUrl: "",
};
export const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
export const record = (value: unknown): Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
export const safeUrl = (value: unknown): string => {
  try {
    const url = new URL(text(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
export function parseRepository(
  value: unknown,
  directory = "",
): Repository | undefined {
  let source = text(value)
    .trim()
    .replace(/^git\+/, "");
  if (source.startsWith("github:"))
    source = `https://github.com/${source.slice(7)}`;
  if (/^[\w.-]+\/[\w.-]+$/.test(source))
    source = `https://github.com/${source}`;
  source = source.replace(/^git@github\.com:/, "https://github.com/");
  try {
    const url = new URL(source);
    if (
      url.hostname !== "github.com" ||
      !["https:", "http:", "git:", "ssh:"].includes(url.protocol)
    )
      return;
    const [owner, rawName] = url.pathname.split("/").filter(Boolean);
    const name = rawName?.replace(/\.git$/, "");
    if (!owner || !name || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name))
      return;
    const cleanDirectory = directory
      .split("/")
      .filter((part) => part && part !== ".");
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
      directory: cleanDirectory.includes("..") ? "" : cleanDirectory.join("/"),
    };
  } catch {
    return;
  }
}
export const normalizeName = (name: string) => name.trim().toLowerCase();
export const isPackageName = (name: string) =>
  /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/.test(name) && name.length <= 214;
export function normalizePackage(
  value: unknown,
  requestedName: string,
): PackageData {
  const data = record(value);
  if (
    !data.versions ||
    typeof data.versions !== "object" ||
    Array.isArray(data.versions)
  )
    throw new Error(
      "The npm registry returned invalid package data. Try again.",
    );
  const versions = Object.keys(data.versions)
    .filter((version) => !!valid(version))
    .sort(rcompare);
  const latestVersion =
    text(record(data["dist-tags"]).latest) ||
    versions.find((v) => !prerelease(v)) ||
    versions[0] ||
    "";
  const latest = record(data.versions[latestVersion]);
  const repositoryValue = data.repository || latest.repository;
  const repositoryObject = record(repositoryValue);
  const directory = text(repositoryObject.directory);
  const repository =
    parseRepository(
      typeof repositoryValue === "string"
        ? repositoryValue
        : repositoryObject.url,
      directory,
    ) ||
    parseRepository(record(data.bugs || latest.bugs).url) ||
    parseRepository(data.homepage || latest.homepage);
  const author = data.author || latest.author;
  const license = data.license || latest.license;
  const keywords = data.keywords || latest.keywords;
  return {
    packageName: text(data.name) || requestedName,
    versions,
    latestVersion,
    repository,
    githubUrl: repository?.url || "",
    description: text(data.description || latest.description),
    author: text(author) || text(record(author).name),
    license: text(license) || text(record(license).type),
    homepage: safeUrl(data.homepage || latest.homepage),
    keywords: Array.isArray(keywords)
      ? Array.from(
          new Set(keywords.filter((v): v is string => typeof v === "string")),
        )
      : [],
  };
}
export type FilterType = "all" | "major" | "minor" | "patch" | "latest";
export interface VersionFilters {
  query: string;
  type: FilterType;
  major: string;
  prereleases: boolean;
}
export function filterVersions(
  versions: string[],
  filters: VersionFilters,
): string[] {
  const seen = new Set<number>();
  return versions.filter((version) => {
    const v = parse(version);
    if (!v || (!filters.prereleases && v.prerelease.length > 0)) return false;
    if (filters.type === "major" && (v.minor !== 0 || v.patch !== 0))
      return false;
    if (filters.type === "minor" && v.patch !== 0) return false;
    if (filters.type === "patch" && v.patch === 0) return false;
    if (filters.type === "latest") {
      if (seen.has(v.major)) return false;
      seen.add(v.major);
    }
    return (
      (!filters.major || String(v.major) === filters.major) &&
      version.includes(filters.query.trim())
    );
  });
}
export function versionRange(
  versions: string[],
  from: string,
  to: string,
  includePrereleases: boolean,
): string[] {
  if (!valid(from) || !valid(to) || !gt(to, from)) return [];
  return versions
    .filter(
      (v) =>
        gt(v, from) &&
        lte(v, to) &&
        (includePrereleases || !prerelease(v) || v === to),
    )
    .reverse();
}
export const tagFormats = (name: string, version: string) =>
  Array.from(
    new Set([
      `v${version}`,
      version,
      `${name}@${version}`,
      ...(name.startsWith("@") ? [`${name.split("/")[1]}@${version}`] : []),
    ]),
  );
