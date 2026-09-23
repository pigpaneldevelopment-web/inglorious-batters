import { mkdir, copyFile, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/src", { recursive: true });
for (const f of [
  "index.html",
  "style.css",
  "seed-lineup.json",
  "src/app.js",
  "src/model.js",
])
  await copyFile(f, `dist/${f}`);
console.log("Built public allowlist → dist/");
