import { ApiClient } from "./client";
const ok = (value: unknown) =>
  ({ ok: true, json: async () => value }) as Response;
const failure = (
  status: number,
  headers: Record<string, string> = {},
  body = {},
) =>
  ({
    ok: false,
    status,
    headers: { get: (name: string) => headers[name] || null },
    json: async () => body,
  }) as unknown as Response;
afterEach(() => jest.restoreAllMocks());
it("caches and deduplicates requests, then expires them after five minutes", async () => {
  let now = 0;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  global.fetch = jest.fn(async () => ok({ value: 1 }));
  const client = new ApiClient();
  const url = "https://api.github.com/repos/a/b";
  await Promise.all([client.get(url), client.get(url)]);
  await client.get(url);
  expect(fetch).toHaveBeenCalledTimes(1);
  now = 300001;
  await client.get(url);
  expect(fetch).toHaveBeenCalledTimes(2);
  client.clear();
  await client.get(url);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("serializes GitHub requests", async () => {
  let release: (response: Response) => void = () => undefined;
  global.fetch = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    )
    .mockResolvedValue(ok({}));
  const client = new ApiClient();
  const a = client.get("https://api.github.com/a");
  const b = client.get("https://api.github.com/b");
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(1);
  release(ok({}));
  await Promise.all([a, b]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("only sends credentials to the exact GitHub API origin and purges cache on token changes", async () => {
  global.fetch = jest.fn(async () => ok({}));
  const client = new ApiClient();
  client.setToken("test-only-placeholder");
  await client.get("https://registry.npmjs.org/react");
  await client.get("https://api.github.com/repos/a/b");
  expect(
    (fetch as jest.Mock).mock.calls[0][1].headers.Authorization,
  ).toBeUndefined();
  expect((fetch as jest.Mock).mock.calls[1][1].headers.Authorization).toBe(
    "Bearer test-only-placeholder",
  );
  client.setToken("");
  await client.get("https://api.github.com/repos/a/b");
  expect(
    (fetch as jest.Mock).mock.calls[2][1].headers.Authorization,
  ).toBeUndefined();
  expect(JSON.stringify(localStorage)).not.toContain("test-only-placeholder");
});
it.each([
  [404, "missing"],
  [401, "auth"],
  [403, "forbidden"],
  [500, "network"],
])("classifies HTTP %s", async (status, kind) => {
  global.fetch = jest.fn(async () => failure(status as number));
  await expect(
    new ApiClient().get("https://api.github.com/a"),
  ).rejects.toMatchObject({ kind });
});
it("pauses the queue on quota errors and permits retry when the quota returns", async () => {
  let now = 100000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(failure(429, { "retry-after": "10" }))
    .mockResolvedValue(ok({}));
  const client = new ApiClient();
  await expect(client.get("https://api.github.com/a")).rejects.toMatchObject({
    kind: "rate-limit",
    retryAt: 110000,
  });
  await expect(client.get("https://api.github.com/b")).rejects.toMatchObject({
    kind: "rate-limit",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  now = 110001;
  await client.get("https://api.github.com/b");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("classifies a malformed response and network failure", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError();
      },
    })
    .mockRejectedValue(new TypeError("Failed to fetch"));
  const client = new ApiClient();
  await expect(
    client.get("https://registry.npmjs.org/a"),
  ).rejects.toMatchObject({ kind: "invalid" });
  await expect(
    client.get("https://registry.npmjs.org/a"),
  ).rejects.toMatchObject({ kind: "network" });
});
it("does not issue already-cancelled requests", async () => {
  global.fetch = jest.fn();
  const controller = new AbortController();
  controller.abort();
  await expect(
    new ApiClient().get("https://registry.npmjs.org/a", controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(fetch).not.toHaveBeenCalled();
});
