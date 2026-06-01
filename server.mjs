import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = resolve(join(root, pathname));

    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const data = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}`);
});
