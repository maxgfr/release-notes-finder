import { expect, Page, test } from "@playwright/test";

async function setup(page: Page) {
  await page.route("https://registry.npmjs.org/**", (route) =>
    route.fulfill({
      json: {
        name: "example",
        versions: Object.fromEntries(
          Array.from({ length: 10000 }, (_, i) => [`1.${i}.0`, {}]),
        ),
        "dist-tags": { latest: "1.9999.0" },
      },
    }),
  );
  await page.goto("/?q=example&from=1.0.0&to=1.1.0&view=range");
}

async function choose(page: Page, label: string, version: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole("combobox", { name: "Search versions" }).fill(version);
  await page.getByRole("option", { name: version, exact: true }).click();
}

test("all versions are searchable and browsable with bounded rendering", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: /^From version:/ }).click();
  await expect(
    page.getByText("1–50 of 10,000 versions", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listbox", { name: "From version options" })
      .getByRole("option"),
  ).toHaveCount(50);
  await page.getByRole("button", { name: "Next versions" }).click();
  await expect(
    page.getByRole("option", { name: "1.9949.0", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous versions" }).click();
  await expect(
    page.getByRole("option", { name: "1.9999.0", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Search versions" }).fill("1.42.0");
  await page.getByRole("option", { name: "1.42.0", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "From version: 1.42.0", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: /^From version:/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Search versions" }),
  ).toHaveValue("");
  await expect(
    page.getByText("1–50 of 10,000 versions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "From version" })).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/version-selector-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("keyboard navigation crosses pages, handles no matches, and Escape keeps the selection", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: /^To version:/ }).focus();
  await page.keyboard.press("Enter");
  const search = page.getByRole("combobox", { name: "Search versions" });
  await expect(search).toBeFocused();
  await search.fill("no-such-version");
  await expect(
    page.getByText("No versions found. Try another search."),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(search).toBeVisible();
  await search.fill("");
  await search.press("ArrowDown");
  for (let i = 0; i < 50; i++) await search.press("ArrowDown");
  await expect(
    page.getByText("51–100 of 10,000 versions", { exact: true }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(
    page.getByRole("button", { name: "To version: 1.9949.0", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await search.fill("1.200.0");
  await search.press("Escape");
  await expect(
    page.getByRole("button", { name: "To version: 1.9949.0", exact: true }),
  ).toBeFocused();
});

test("prerelease settings preserve pending endpoint and view choices", async ({
  page,
}) => {
  await setup(page);
  await choose(page, "From version", "1.2.0");
  await choose(page, "To version", "1.3.0");
  await page.getByLabel("View", { exact: true }).selectOption("side-by-side");
  await page.getByText("Include prereleases", { exact: true }).click();
  await expect(page).toHaveURL(/prereleases=1/);
  await expect(
    page.getByRole("button", { name: "From version: 1.2.0", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "To version: 1.3.0", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("View", { exact: true })).toHaveValue(
    "side-by-side",
  );
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1.2.0 → 1.3.0" }),
  ).toBeVisible();
});

test("changing packages clears old choices; browser back restores the linked endpoints", async ({
  page,
}) => {
  await setup(page);
  await page.route("https://registry.npmjs.org/another", (route) =>
    route.fulfill({
      json: {
        name: "another",
        versions: { "2.0.0": {}, "2.1.0": {} },
        "dist-tags": { latest: "2.1.0" },
      },
    }),
  );
  await choose(page, "From version", "1.42.0");
  await page
    .getByRole("combobox", { name: "npm package", exact: true })
    .fill("another");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await page
    .getByRole("button", {
      name: "From version: Select a version",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("listbox", { name: "From version options" })
      .getByRole("option"),
  ).toHaveText(["2.1.0", "2.0.0"]);
  await page.getByRole("combobox", { name: "Search versions" }).press("Escape");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "From version: 1.0.0", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "To version: 1.1.0", exact: true }),
  ).toBeVisible();
});
