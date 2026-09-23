import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const pdf = await getDocument({
  data: new Uint8Array(await readFile("artifacts/lineup.pdf")),
  useSystemFonts: true,
}).promise;
assert.equal(pdf.numPages, 1, "PDF must fit one page");
const page = await pdf.getPage(1),
  text = (await page.getTextContent()).items.map((i) => i.str).join(" ");
for (const name of [
  "Sam",
  "Tyler",
  "Jeremy",
  "Ryan",
  "Brock",
  "Bird",
  "Yoni",
  "Cooper",
  "Brett",
  "Woody",
])
  assert.equal(
    text.split(name).length - 1,
    2,
    `${name} appears in order and on diamond`,
  );
assert.doesNotMatch(text, /Edit game|Print \/ PDF|https?:|slump|scouting/i);
assert.match(text, /As of/);
const viewport = page.getViewport({ scale: 1.5 }),
  canvas = createCanvas(viewport.width, viewport.height);
await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
await writeFile("artifacts/lineup-pdf.png", canvas.toBuffer("image/png"));
console.log(
  "PDF: one page, all ten names twice, timestamp present, no controls, URLs or private notes.",
);
