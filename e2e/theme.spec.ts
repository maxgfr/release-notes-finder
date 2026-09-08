import { test, expect } from "@playwright/test";
test("theme icon cycles Auto, Dark, Light; system changes and manual choices persist", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const auto = page.getByRole("button", {
    name: "Color theme: Auto. Switch to dark mode",
    exact: true,
  });
  const dark = page.getByRole("button", {
    name: "Color theme: Dark. Switch to light mode",
    exact: true,
  });
  const light = page.getByRole("button", {
    name: "Color theme: Light. Switch to auto mode",
    exact: true,
  });
  await expect(auto).toBeVisible();
  const autoIcon = await auto.locator("svg").innerHTML();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await auto.click();
  const darkIcon = await dark.locator("svg").innerHTML();
  expect(darkIcon).not.toBe(autoIcon);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(dark).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(light).toBeFocused();
  const lightIcon = await light.locator("svg").innerHTML();
  expect(lightIcon).not.toBe(darkIcon);
  expect(lightIcon).not.toBe(autoIcon);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(light).toBeVisible();
  await light.click();
  await expect(auto).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(auto).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("preserves an existing manual theme choice", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("chakra-ui-color-mode", "dark"),
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /^Color theme: Dark/ }),
  ).toBeVisible();
});
