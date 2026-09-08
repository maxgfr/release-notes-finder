import {
  filterVersions,
  normalizePackage,
  parseRepository,
  tagFormats,
  versionRange,
} from "./package";
import { navigationUrl, readNavigation } from "./navigation";
describe("npm metadata", () => {
  it.each([
    "git+https://github.com/vercel/next.js.git#canary",
    "git@github.com:vercel/next.js.git",
    "ssh://git@github.com/vercel/next.js.git",
    "github:vercel/next.js",
    "vercel/next.js",
    "https://github.com/vercel/next.js/issues",
  ])("normalizes repository %s", (value) => {
    expect(parseRepository(value, "packages/next")).toEqual({
      owner: "vercel",
      name: "next.js",
      url: "https://github.com/vercel/next.js",
      directory: "packages/next",
    });
  });
  it("rejects lookalike hosts and unsafe URLs", () => {
    expect(
      parseRepository("https://github.com.evil.test/owner/repo"),
    ).toBeUndefined();
    expect(
      parseRepository("https://evil.test/github.com/repo"),
    ).toBeUndefined();
    expect(
      normalizePackage({ versions: {}, homepage: "javascript:alert(1)" }, "foo")
        .homepage,
    ).toBe("");
  });
  it("handles optional legacy fields, prereleases and numeric SemVer sorting", () => {
    const pkg = normalizePackage(
      {
        versions: {
          "1.2.0": {},
          "1.10.0": {},
          "2.0.0-rc.2": {},
          "2.0.0-rc.10": {},
          bad: {},
        },
        author: { name: "Someone" },
        license: { type: "MIT" },
        keywords: "not-an-array",
      },
      "foo",
    );
    expect(pkg.versions).toEqual([
      "2.0.0-rc.10",
      "2.0.0-rc.2",
      "1.10.0",
      "1.2.0",
    ]);
    expect(pkg.latestVersion).toBe("1.10.0");
    expect(pkg.author).toBe("Someone");
    expect(pkg.license).toBe("MIT");
    expect(pkg.keywords).toEqual([]);
  });
  it("rejects malformed version data", () =>
    expect(() => normalizePackage({ versions: null }, "foo")).toThrow(
      "invalid package data",
    ));
});
describe("version selection", () => {
  const versions = [
    "2.1.1",
    "2.1.0",
    "2.0.0",
    "1.2.0",
    "1.1.1",
    "1.1.0",
    "1.1.0-rc.1",
    "1.0.0",
  ];
  it("preserves major/minor/patch filter meanings", () => {
    const base = { query: "", major: "", prereleases: false };
    expect(filterVersions(versions, { ...base, type: "major" })).toEqual([
      "2.0.0",
      "1.0.0",
    ]);
    expect(
      filterVersions(versions, { ...base, type: "minor", major: "1" }),
    ).toEqual(["1.2.0", "1.1.0", "1.0.0"]);
    expect(filterVersions(versions, { ...base, type: "patch" })).toEqual([
      "2.1.1",
      "1.1.1",
    ]);
    expect(filterVersions(versions, { ...base, type: "latest" })).toEqual([
      "2.1.1",
      "1.2.0",
    ]);
    expect(
      filterVersions(versions, {
        ...base,
        type: "all",
        prereleases: true,
        query: "rc",
      }),
    ).toEqual(["1.1.0-rc.1"]);
  });
  it("defines upgrade range as (A, B] and orders oldest first", () => {
    expect(versionRange(versions, "1.0.0", "1.2.0", false)).toEqual([
      "1.1.0",
      "1.1.1",
      "1.2.0",
    ]);
    expect(versionRange(versions, "1.0.0", "1.2.0", true)[0]).toBe(
      "1.1.0-rc.1",
    );
    expect(versionRange(versions, "2.0.0", "1.0.0", false)).toEqual([]);
  });
  it("supports scoped monorepo tags", () =>
    expect(tagFormats("@babel/core", "1.0.0")).toContain("@babel/core@1.0.0"));
});
it("roundtrips shared links without credentials and retains the deployed path", () => {
  const state = readNavigation(
    "?q=%40babel%2Fcore&from=1.0.0&to=2.0.0&view=side-by-side&prereleases=1",
  );
  expect(readNavigation(new URL(navigationUrl(state)).search)).toEqual(state);
  expect(readNavigation("?q=react&view=invalid").view).toBe("range");
  expect(readNavigation("?q=react&from=1.0.0&version=2.0.0").version).toBe("");
});
