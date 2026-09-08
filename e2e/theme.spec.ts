import { test, expect } from "@playwright/test";
test("Auto follows the system; manual choices override it and persist", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "auto",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "dark",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Color theme" })
    .selectOption("auto");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "auto",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("preserves an existing manual theme choice", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("chakra-ui-color-mode", "dark"),
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue(
    "dark",
  );
});
