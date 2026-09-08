const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(process.env.BUILD_DIR || "build");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".ico": "image/x-icon",
};
http
  .createServer((req, res) => {
    const route = new URL(req.url, "http://localhost").pathname.replace(
      /^\/release-notes-finder(?=\/)/,
      "",
    );
    const file = path.resolve(
      root,
      "." + (route.endsWith("/") ? route + "index.html" : route),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(Number(process.env.PORT || 4173), "127.0.0.1");
