const http = require("http");
const fs = require("fs");
const path = require("path");
const { injectEnvironmentBanner } = require("./lib/environment");

const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  const url = req.url?.split("?")[0] ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const filePath = path.join(publicDir, url === "/" ? "index.html" : url);
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(publicDir) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(resolved);
  const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };

  if (ext === ".html") {
    let html = fs.readFileSync(resolved, "utf8");
    if (path.basename(resolved) === "index.html") {
      html = injectEnvironmentBanner(html);
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
  fs.createReadStream(resolved).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Orion listening on port ${PORT}`);
});
