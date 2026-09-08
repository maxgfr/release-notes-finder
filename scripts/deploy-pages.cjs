// Run only in the trusted deployment job, after Validate succeeds for the same commit.
const { execFileSync } = require("child_process");
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required for deployment");
const authorization = Buffer.from(`x-access-token:${token}`).toString("base64");
// Environment-scoped Git configuration reaches gh-pages' temporary clone without token URLs.
execFileSync(
  process.execPath,
  [
    require.resolve("gh-pages/bin/gh-pages"),
    "-d",
    "build",
    "-u",
    "github-actions-bot <support+actions@github.com>",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${authorization}`,
    },
  },
);
