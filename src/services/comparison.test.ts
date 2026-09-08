import { normalizePackage } from "../domain/package";
import { ApiClient } from "./client";
import { ReleaseService } from "./releases";
import { ComparisonService } from "./comparison";
const base = "a".repeat(40),
  head = "b".repeat(40);
const pkg = normalizePackage(
  {
    versions: { "1.0.0": { gitHead: base }, "2.0.0": { gitHead: head } },
    repository: "github:owner/repo",
  },
  "example",
);
const ok = (value: unknown) =>
  ({ ok: true, json: async () => value }) as Response;
const result = {
  status: "ahead",
  total_commits: 1,
  commits: [
    {
      sha: head,
      commit: {
        message: "Fix the parser\n\nDetails",
        author: { name: "Author" },
      },
    },
  ],
  files: [
    {
      filename: "src/parser.ts",
      status: "modified",
      additions: 2,
      deletions: 1,
    },
  ],
};
function service() {
  const client = new ApiClient();
  return new ComparisonService(client, new ReleaseService(client));
}
afterEach(() => jest.restoreAllMocks());
it("compares published gitHeads directly rather than endpoint release notes", async () => {
  global.fetch = jest.fn(async () => ok(result));
  const data = await service().compare(pkg, "1.0.0", "2.0.0");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect((fetch as jest.Mock).mock.calls[0][0]).toContain(
    `/compare/${base}...${head}?per_page=100&page=1`,
  );
  expect(data.commits[0].title).toBe("Fix the parser");
  expect(data.files[0].additions).toBe(2);
});
it("falls back to resolved scoped release tags when gitHeads are unavailable", async () => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) =>
    String(url).includes("/compare/")
      ? ok(result)
      : ok({
          tag_name:
            "@scope/pkg@" + (String(url).includes("1.0.0") ? "1.0.0" : "2.0.0"),
          body: "",
        }),
  );
  const data = await service().compare(
    { ...pkg, gitHeads: {} },
    "1.0.0",
    "2.0.0",
  );
  expect(data.url).toContain("%40scope%2Fpkg%401.0.0...%40scope%2Fpkg%402.0.0");
});
it("reports pagination and the GitHub file-list cap without claiming completeness", async () => {
  global.fetch = jest.fn(async () =>
    ok({
      ...result,
      total_commits: 101,
      files: Array.from({ length: 300 }, (_, i) => ({
        filename: `file-${i}`,
        status: "added",
      })),
    }),
  );
  const data = await service().compare(pkg, "1.0.0", "2.0.0");
  expect(data.nextPage).toBe(2);
  expect(data.filesMayBeTruncated).toBe(true);
  await service().compare(pkg, "1.0.0", "2.0.0", undefined, 2, data);
  expect((fetch as jest.Mock).mock.calls[1][0]).toContain("page=2");
});
it.each(["identical", "behind", "diverged"])(
  "preserves %s ancestry status",
  async (status) => {
    global.fetch = jest.fn(async () => ok({ ...result, status }));
    expect((await service().compare(pkg, "1.0.0", "2.0.0")).status).toBe(
      status,
    );
  },
);
it("reports unavailable references and malformed API data as errors", async () => {
  global.fetch = jest.fn(async () => ok({}));
  await expect(
    service().compare({ ...pkg, repository: undefined }, "1.0.0", "2.0.0"),
  ).rejects.toMatchObject({ kind: "missing" });
  await expect(service().compare(pkg, "1.0.0", "2.0.0")).rejects.toMatchObject({
    kind: "invalid",
  });
});
