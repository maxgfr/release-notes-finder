import { expect, Page, test } from "@playwright/test";
const fixture = (name = "example") => ({
  name,
  description: "A package for testing release notes.",
  author: { name: "Example author" },
  license: { type: "MIT" },
  keywords: ["testing"],
  repository: {
    url: "git+https://github.com/example/repo.git",
    directory: "packages/example",
  },
  "dist-tags": { latest: "1.3.0" },
  versions: {
    "1.0.0": {},
    "1.1.0": {},
    "1.2.0": {},
    "1.3.0": {},
    "2.0.0-rc.1": {},
  },
});
async function mockApis(page: Page) {
  const requests: { url: string; auth?: string }[] = [];
  await page.route("https://registry.npmjs.org/**", async (route) => {
    requests.push({
      url: route.request().url(),
      auth: route.request().headers().authorization,
    });
    await route.fulfill({
      json: route.request().url().includes("/-/v1/search")
        ? {
            objects: [
              { package: { name: "example", description: "Example package" } },
            ],
          }
        : fixture(
            decodeURIComponent(
              new URL(route.request().url()).pathname.slice(1),
            ),
          ),
    });
  });
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    requests.push({ url, auth: route.request().headers().authorization });
    if (url.includes("/contents/")) {
      await route.fulfill({
        json: {
          encoding: "base64",
          content: Buffer.from(
            "# Café — 日本語 🎉\n\n[Guide](docs/guide.md)",
          ).toString("base64"),
        },
      });
      return;
    }
    const tag = decodeURIComponent(url.split("/").pop() || "");
    await route.fulfill({
      json: {
        tag_name: tag,
        body:
          tag === "v1.1.0"
            ? ""
            : `# Changes in ${tag}\n\nA useful fix.\n\n[Guide](docs/guide.md)\n\n<table><tr><td>Table content</td></tr></table><script>window.injected = true</script><iframe src="https://evil.invalid"></iframe><img src="javascript:alert(1)" onerror="window.injected = true">\n\n[Unsafe](javascript:alert(1))`,
      },
    });
  });
  return requests;
}
test("keyboard search, filters, stable tabs, history and source links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests = await mockApis(page);
  await page.goto("/");
  await page.getByRole("combobox", { name: "npm package" }).fill("ex");
  await expect(page.getByRole("option", { name: /example/ })).toBeVisible();
  await page.getByRole("combobox", { name: "npm package" }).press("ArrowDown");
  await page.getByRole("combobox", { name: "npm package" }).press("Enter");
  await expect(
    page.getByRole("tab", { name: "Versions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open notes for 2.0.0-rc.1" }),
  ).toHaveCount(0);
  await page.getByText("Include prereleases", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open notes for 2.0.0-rc.1" }),
  ).toBeVisible();
  await page.getByLabel("Find a version").fill("1.2");
  await expect(
    page.getByRole("button", { name: /^Open notes for/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Open notes for 1.2.0" }).click();
  await expect(
    page.getByRole("tab", { name: "Versions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "1.2.0", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.2.0" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Guide" })).toHaveAttribute(
    "href",
    "https://github.com/example/repo/blob/HEAD/packages/example/docs/guide.md",
  );
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("tab", { name: "Info", exact: true }).click();
  await expect(page.getByText("Example author")).toBeVisible();
  await page.getByRole("button", { name: "Close notes for 1.2.0" }).click();
  await expect(
    page.getByRole("tab", { name: "Info", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Changelog", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Café — 日本語 🎉" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Versions", exact: true }).click();
  await expect(page.getByLabel("Find a version")).toHaveValue("1.2");
  await page.getByText("Include prereleases", { exact: true }).click();
  await expect(page.getByLabel("Find a version")).toHaveValue("1.2");
  expect(requests.filter((r) => r.url.includes("/releases/"))).toHaveLength(1);
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Remove example from history" })
    .click();
  await expect(page.getByText("Recent searches")).toHaveCount(0);
});
test("loads comparison links, both views, empty notes and browser navigation", async ({
  page,
}) => {
  await mockApis(page);
  await page.goto(
    "/release-notes-finder/?q=example&from=1.0.0&to=1.3.0&view=range",
  );
  await expect(
    page.getByRole("heading", { name: "Compare versions" }),
  ).toBeVisible();
  await expect(
    page.getByText("This release has no written release notes."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.3.0" }),
  ).toBeVisible();
  await expect(page.getByText(/not a complete change history/)).toBeVisible();
  await page.getByLabel("View", { exact: true }).selectOption("side-by-side");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.0.0" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.3.0" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/view=side-by-side/);
  await page.goBack();
  await expect(page.getByLabel("View", { exact: true })).toHaveValue("range");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/comparison-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("restores version links and back to package-only links", async ({
  page,
}) => {
  await mockApis(page);
  await page.goto("/?q=example");
  await page.getByRole("button", { name: "Open notes for 1.2.0" }).click();
  await page.getByRole("tab", { name: "1.2.0", exact: true }).click();
  await expect(page).toHaveURL(/version=1.2.0/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.2.0" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Versions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("token is optional, stays out of storage and npm, and refreshes notes after replacement", async ({
  page,
}) => {
  const requests = await mockApis(page);
  await page.goto("/?q=example&version=1.2.0");
  await expect(
    page.getByRole("heading", { name: "Changes in v1.2.0" }),
  ).toBeVisible();
  await page.getByText("GitHub access (optional)", { exact: true }).click();
  await page
    .getByLabel("GitHub token", { exact: true })
    .fill("test-only-placeholder");
  await page.getByRole("button", { name: "Use token" }).click();
  await expect
    .poll(() => requests.some((r) => r.auth === "Bearer test-only-placeholder"))
    .toBe(true);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: localStorage,
        session: sessionStorage,
        url: location.href,
      }),
    ),
  ).not.toContain("test-only-placeholder");
  expect(
    requests
      .filter((r) => r.url.includes("registry.npmjs.org"))
      .every((r) => !r.auth),
  ).toBe(true);
  await page.getByRole("button", { name: "Remove token" }).click();
  await expect(page.getByText("Using public GitHub access.")).toBeVisible();
  await page.reload();
  await page.getByText("GitHub access (optional)", { exact: true }).click();
  await expect(page.getByLabel("GitHub token", { exact: true })).toHaveValue(
    "",
  );
});
test("bounds rendering of 10,000 versions and lazy loads markdown", async ({
  page,
}) => {
  await mockApis(page);
  await page.route("https://registry.npmjs.org/large", (route) =>
    route.fulfill({
      json: {
        ...fixture("large"),
        versions: Object.fromEntries(
          Array.from({ length: 10000 }, (_, i) => [`1.${i}.0`, {}]),
        ),
      },
    }),
  );
  const start = Date.now();
  await page.goto("/?q=large");
  await expect(
    page.getByRole("button", { name: /^Open notes for/ }),
  ).toHaveCount(50);
  const duration = Date.now() - start;
  test.info().annotations.push({
    type: "performance",
    description: `10,000 versions usable in ${duration}ms; 50 rendered version buttons`,
  });
  await expect(page.getByText("10,000 versions found")).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 200")).toBeVisible();
  await page.getByLabel("Find a version").fill("1.9999");
  await expect(
    page.getByRole("button", { name: /^Open notes for/ }),
  ).toHaveCount(1);
});
test("retries only failed comparison entries", async ({ page }) => {
  const requests = await mockApis(page);
  let fail = true;
  await page.route("**/releases/tags/v1.2.0", async (route) => {
    requests.push({ url: route.request().url() });
    if (fail) await route.fulfill({ status: 500, json: {} });
    else
      await route.fulfill({
        json: { tag_name: "v1.2.0", body: "# Recovered notes" },
      });
  });
  await page.goto("/?q=example&from=1.0.0&to=1.3.0&view=range");
  await expect(page.getByText(/HTTP 500/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Changes in v1.3.0" }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Resume / retry unfinished" }).click();
  await expect(
    page.getByRole("heading", { name: "Recovered notes" }),
  ).toBeVisible();
  expect(
    requests.filter((r) => r.url.endsWith("/releases/tags/v1.3.0")),
  ).toHaveLength(1);
});
test("stops loading and resumes the whole interval without duplicates", async ({
  page,
}) => {
  await mockApis(page);
  await page.route("https://registry.npmjs.org/batched", (route) =>
    route.fulfill({
      json: {
        ...fixture("batched"),
        versions: Object.fromEntries(
          Array.from({ length: 8 }, (_, i) => [`1.${i}.0`, {}]),
        ),
      },
    }),
  );
  let firstRoute: any;
  const calls: string[] = [];
  await page.route("https://api.github.com/**", async (route) => {
    const tag = route.request().url().split("/").pop()!;
    calls.push(tag);
    if (tag === "v1.1.0" && calls.length === 1) {
      firstRoute = route;
      return;
    }
    await route.fulfill({ json: { tag_name: tag, body: `# Batch ${tag}` } });
  });
  await page.goto("/?q=batched&from=1.0.0&to=1.7.0&view=range");
  await expect.poll(() => !!firstRoute).toBe(true);
  await page.getByRole("button", { name: "Stop loading" }).click();
  await firstRoute.fulfill({
    json: { tag_name: "v1.1.0", body: "# First notes" },
  });
  await expect(
    page.getByRole("heading", { name: "First notes" }),
  ).toBeVisible();
  expect(calls).toHaveLength(1);
  await page.getByRole("button", { name: "Resume / retry unfinished" }).click();
  await expect(
    page.getByText("All selected release notes have been loaded."),
  ).toBeVisible();
  expect(calls).toHaveLength(7);
});
test("recovers from a GitHub quota error with an optional token", async ({
  page,
}) => {
  await mockApis(page);
  let unauthenticated = 0;
  await page.route("https://api.github.com/**", async (route) => {
    if (!route.request().headers().authorization) {
      unauthenticated++;
      await route.fulfill({
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "retry-after": "60" },
        json: { message: "API rate limit exceeded" },
      });
    } else
      await route.fulfill({
        json: { tag_name: "v1.2.0", body: "# Authenticated recovery" },
      });
  });
  await page.goto("/?q=example&version=1.2.0");
  await expect(page.getByText(/GitHub request limit reached/)).toBeVisible();
  await page.getByRole("button", { name: "Retry release notes" }).click();
  expect(unauthenticated).toBe(1);
  await page.getByText("GitHub access (optional)", { exact: true }).click();
  await page
    .getByLabel("GitHub token", { exact: true })
    .fill("test-only-placeholder");
  await page.getByRole("button", { name: "Use token" }).click();
  await expect(
    page.getByRole("heading", { name: "Authenticated recovery" }),
  ).toBeVisible();
});
test("handles malformed local history, empty version lists and invalid shared versions", async ({
  page,
}) => {
  await mockApis(page);
  await page.addInitScript(() =>
    localStorage.setItem("release-notes-finder-history", "{}"),
  );
  await page.route("https://registry.npmjs.org/empty", (route) =>
    route.fulfill({
      json: { name: "empty", description: "No releases yet", versions: {} },
    }),
  );
  await page.goto("/?q=empty&version=invalid");
  await expect(
    page.getByText(/version in this link does not exist/),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Info", exact: true }).click();
  await expect(page.getByText("No releases yet")).toBeVisible();
});
test("supports dark mode, clipboard sharing and keyboard tab navigation", async ({
  page,
  context,
}) => {
  await mockApis(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?q=example&version=1.2.0");
  await expect(
    page.getByRole("heading", { name: "Changes in v1.2.0" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "q=example&version=1.2.0",
  );
  await page.getByRole("button", { name: /^Color theme: Auto/ }).click();
  await expect(
    page.getByRole("button", { name: /^Color theme: Dark/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Versions", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Compare", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: `test-results/dark-${test.info().project.name}.png`,
    fullPage: true,
  });
});
