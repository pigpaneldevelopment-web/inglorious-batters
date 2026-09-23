import { mkdir, copyFile, rm, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
const files = [
  "index.html",
  "style.css",
  "seed-lineup.json",
  "src/app.js",
  "src/model.js",
  "src/pwa.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
];
await rm("dist", { recursive: true, force: true });
const hash = createHash("sha256");
for (const file of files) {
  await mkdir(dirname(`dist/${file}`), { recursive: true });
  await copyFile(file, `dist/${file}`);
  hash.update(await readFile(file));
}
const worker = await readFile("sw.js", "utf8");
hash.update(worker);
await writeFile(
  "dist/sw.js",
  worker.replace("__BUILD_VERSION__", hash.digest("hex").slice(0, 16)),
);
console.log("Built public allowlist → dist/");
