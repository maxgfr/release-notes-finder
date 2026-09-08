import { expect, Page, test } from "@playwright/test";
async function setup(page: Page) {
  const calls: string[] = [];
  await page.route("https://registry.npmjs.org/**", (route) =>
    route.fulfill({
      json: {
        name: "example",
        repository: { url: "github:owner/repo", directory: "packages/example" },
        versions: Object.fromEntries(
          Array.from({ length: 8 }, (_, i) => [
            `1.${i}.0`,
            { gitHead: String(i + 1).repeat(40) },
          ]),
        ),
        "dist-tags": { latest: "1.7.0" },
      },
    }),
  );
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    calls.push(url);
    if (url.includes("/compare/")) {
      await route.fulfill({
        json: {
          status: "ahead",
          total_commits: 2,
          commits: [
            {
              sha: "a".repeat(40),
              commit: {
                message: "Fix memory leak in parser",
                author: { name: "A developer" },
              },
            },
            {
              sha: "b".repeat(40),
              commit: {
                message: "Add streaming support",
                author: { name: "Another developer" },
              },
            },
          ],
          files: [
            {
              filename: "packages/example/parser.ts",
              status: "modified",
              additions: 12,
              deletions: 4,
            },
            {
              filename: "packages/other/tool.ts",
              status: "added",
              additions: 7,
              deletions: 0,
            },
          ],
        },
      });
    } else {
      const tag = decodeURIComponent(url.split("/").pop()!);
      await route.fulfill({
        json: {
          tag_name: tag,
          body: `# Notes ${tag}\n\nFix introduced in ${tag}`,
        },
      });
    }
  });
  return calls;
}
test("automatically loads the entire interval instead of stopping after five releases", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/?q=example&from=1.0.0&to=1.7.0&view=range");
  await expect
    .poll(() => calls.filter((url) => url.includes("/releases/tags/")).length)
    .toBe(7);
  expect(calls.some((url) => url.endsWith("/releases/tags/v1.0.0"))).toBe(
    false,
  );
  await expect(
    page.getByText("All selected release notes have been loaded."),
  ).toBeVisible();
});
test("default comparison shows what changed between endpoints, plus all intermediate notes", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/?q=example&from=1.0.0&to=1.7.0");
  await expect(
    page.getByRole("heading", { name: "Repository changes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Fix memory leak in parser" }),
  ).toBeVisible();
  await page.getByText("Changed files (2)", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "packages/example/parser.ts", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/may include other packages/)).toBeVisible();
  await expect
    .poll(() => calls.filter((url) => url.includes("/releases/tags/")).length)
    .toBe(7);
  expect(calls.filter((url) => url.includes("/compare/"))).toHaveLength(1);
  expect(calls.find((url) => url.includes("/compare/"))).toContain(
    `${"1".repeat(40)}...${"8".repeat(40)}`,
  );
  await page.screenshot({
    path: `test-results/new-comparison-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("a new version selection can replace an interval that is still loading", async ({
  page,
}) => {
  await setup(page);
  let pending: any;
  await page.route("**/releases/tags/v1.1.0", (route) => {
    pending = route;
  });
  await page.goto("/?q=example&from=1.0.0&to=1.7.0&view=range");
  await expect.poll(() => !!pending).toBe(true);
  await page.getByLabel("From version").fill("1.2.0");
  await page.getByLabel("To version").fill("1.3.0");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await pending.fulfill({
    json: { tag_name: "v1.1.0", body: "# Superseded notes" },
  });
  await expect(
    page.getByRole("heading", { name: "Notes v1.3.0" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Superseded notes" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "1.2.0 → 1.3.0" }),
  ).toBeVisible();
});
