import { TextDecoder } from "util";
import { normalizePackage } from "../domain/package";
import { ApiClient } from "./client";
import { ReleaseService } from "./releases";
const pkg = normalizePackage(
  {
    name: "@scope/pkg",
    versions: { "1.0.0": {}, "1.1.0": {} },
    repository: {
      url: "git+https://github.com/owner/repo.git",
      directory: "packages/pkg",
    },
  },
  "@scope/pkg",
);
const ok = (value: unknown) =>
  ({ ok: true, json: async () => value }) as Response;
const missing = { ok: false, status: 404, json: async () => ({}) } as Response;
it("accepts an empty release without looking for alternative tags", async () => {
  global.fetch = jest.fn(async () => ok({ tag_name: "v1.0.0", body: "" }));
  expect(
    (await new ReleaseService(new ApiClient()).release(pkg, "1.0.0")).status,
  ).toBe("empty");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("encodes scoped tags and remembers the successful convention", async () => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) =>
    String(url).includes("%40scope%2Fpkg%40")
      ? ok({ tag_name: "@scope/pkg@1.0.0", body: "# Notes" })
      : missing,
  );
  const service = new ReleaseService(new ApiClient());
  await service.release(pkg, "1.0.0");
  expect(fetch).toHaveBeenCalledTimes(3);
  await service.release(pkg, "1.1.0");
  expect(fetch).toHaveBeenCalledTimes(4);
});
it("distinguishes tags without releases from missing versions", async () => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) =>
    String(url).includes("/git/ref/tags/v1.0.0")
      ? ok({ object: { sha: "commit" } })
      : missing,
  );
  const service = new ReleaseService(new ApiClient());
  expect((await service.release(pkg, "1.0.0")).status).toBe("tag-only");
  expect((await service.release(pkg, "1.1.0")).status).toBe("missing");
});
it("decodes Unicode changelogs and searches the package directory first", async () => {
  Object.assign(global, { TextDecoder });
  global.fetch = jest.fn(async () =>
    ok({
      encoding: "base64",
      content: Buffer.from("# Café — 日本語 🎉").toString("base64"),
    }),
  );
  const changelog = await new ReleaseService(new ApiClient()).changelog(pkg);
  expect(changelog?.body).toBe("# Café — 日本語 🎉");
  expect((fetch as jest.Mock).mock.calls[0][0]).toContain(
    "/contents/packages/pkg/CHANGELOG.md",
  );
});
it("falls back to the root changelog and does not treat service errors as absent notes", async () => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) =>
    String(url).endsWith("/contents/CHANGELOG.md")
      ? ok({ encoding: "base64", content: "" })
      : missing,
  );
  const service = new ReleaseService(new ApiClient());
  expect((await service.changelog(pkg))?.url).toContain(
    "/blob/HEAD/CHANGELOG.md",
  );
  global.fetch = jest.fn(async () => ({ ok: false, status: 500 }) as Response);
  await expect(service.release(pkg, "1.0.0")).rejects.toMatchObject({
    kind: "network",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
