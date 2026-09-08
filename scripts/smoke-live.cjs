// Optional real-service smoke test. Never accepts or logs a GitHub token.
const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [name, version] of [
      ["react", "18.2.0"],
      ["@babel/core", "7.24.7"],
      ["next", "14.2.0"],
    ]) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:4173/?q=${encodeURIComponent(name)}&version=${version}`,
      );
      await page
        .getByRole("tab", { name: version, exact: true })
        .waitFor({ timeout: 30000 });
      await expect(
        page.getByRole("tab", { name: version, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      const panel = page.getByRole("tabpanel");
      await expect(panel).not.toContainText("Loading", { timeout: 30000 });
      const result = (await panel.innerText())
        .slice(0, 180)
        .replace(/\s+/g, " ");
      console.log(
        JSON.stringify({ name, version, result, browserErrors: errors }),
      );
      if (errors.length || (await panel.getByRole("alert").count()) > 0)
        process.exitCode = 1;
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
