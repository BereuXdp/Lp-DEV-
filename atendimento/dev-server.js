// Servidor de desenvolvimento sem dependências, com recarregamento automático.
const http = require("http");
const fs = require("fs");
const path = require("path");

// Pasta servida: argumento opcional (ex.: node atendimento/dev-server.js .), senão a própria pasta.
const ROOT = path.resolve(process.argv[2] || __dirname);
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

const clients = new Set();
const RELOAD = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (url === "/__reload") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(": ok\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let file = path.normalize(path.join(ROOT, url === "/" ? "index.html" : url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith("/")) { res.writeHead(301, { Location: url + "/" }); return res.end(); }
    file = path.join(file, "index.html");
  }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("404"); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(ext === ".html" ? data.toString().replace("</body>", RELOAD + "</body>") : data);
  });
});

let timer;
fs.watch(ROOT, { recursive: true }, (_, name) => {
  if (!name || name.endsWith("dev-server.js") || name.startsWith("node_modules") || name.startsWith(".git")) return;
  clearTimeout(timer);
  timer = setTimeout(() => clients.forEach((c) => c.write("data: reload\n\n")), 100);
});

server.listen(PORT, () => console.log(`Dev+ rodando em http://localhost:${PORT}`));
