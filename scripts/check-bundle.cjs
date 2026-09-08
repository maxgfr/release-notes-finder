const fs = require("fs");
const zlib = require("zlib");
const manifest = JSON.parse(
  fs.readFileSync("build/asset-manifest.json", "utf8"),
);
const bytes = manifest.entrypoints
  .filter((file) => file.endsWith(".js"))
  .reduce(
    (sum, file) => sum + zlib.gzipSync(fs.readFileSync(`build/${file}`)).length,
    0,
  );
const limit = 250000;
console.log(
  `Initial JavaScript: ${bytes.toLocaleString()} bytes gzip (budget: ${limit.toLocaleString()})`,
);
if (bytes > limit) {
  console.error("Initial JavaScript exceeds the pre-change baseline.");
  process.exitCode = 1;
}
