// Run the current build at :4173 and a baseline build at :4174 before invoking this script.
const { chromium } = require("playwright");
const versions = Object.fromEntries(
  Array.from({ length: 10000 }, (_, i) => [`1.${i}.0`, {}]),
);
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [label, port, modern] of [
      ["baseline", 4174, false],
      ["current", 4173, true],
    ]) {
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const page = await browser.newPage();
        await page.route("https://registry.npmjs.org/**", (route) =>
          route.fulfill({
            json: {
              name: "large",
              versions,
              "dist-tags": { latest: "1.9999.0" },
            },
          }),
        );
        const start = performance.now();
        await page.goto(`http://127.0.0.1:${port}/?q=large`);
        await page
          .getByText(
            modern ? "10,000 versions found" : "10000 version(s) trouvée(s)",
            { exact: true },
          )
          .waitFor();
        const ready = performance.now() - start;
        const elements = await page
          .locator(
            modern ? 'button[aria-label^="Open notes for"]' : ".chakra-badge",
          )
          .count();
        const input = page.getByPlaceholder(modern ? "e.g. 18.2" : "Ex: 18.2");
        const filterStart = performance.now();
        await input.fill("1.9999");
        await page
          .getByText(modern ? "1 versions found" : "1 version(s) trouvée(s)", {
            exact: true,
          })
          .waitFor();
        samples.push({
          readyMs: Math.round(ready),
          filterMs: Math.round(performance.now() - filterStart),
          renderedVersions: elements,
        });
        await page.close();
      }
      console.log(JSON.stringify({ label, samples }));
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
