import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
// Local read-only reference preview. Serves only the preserved mockup, never env/source files.
const root = fileURLToPath(new URL("../", import.meta.url));
const html = await readFile(`${root}Actically Mockups.html`);
createServer((request, response) => {
  if (request.url !== "/") { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); response.end(html);
}).listen(4317, "127.0.0.1", () => console.log("Read-only mockup reference at http://127.0.0.1:4317/"));
