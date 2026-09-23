import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const url = process.env.PWA_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
await page.goto(url);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
await page.waitForSelector("#lineup li");
const cdp = await context.newCDPSession(page);
const manifest = await cdp.send("Page.getAppManifest");
assert.equal(manifest.errors.length, 0, JSON.stringify(manifest.errors));
const parsed = JSON.parse(manifest.data);
assert.equal(parsed.display, "fullscreen");
assert.equal(parsed.scope, "./");
for (const icon of parsed.icons) {
  const r = await page.request.get(new URL(icon.src, url).href);
  assert.equal(r.status(), 200);
}
const eligibility = await cdp.send("Page.getInstallabilityErrors");
assert.deepEqual(eligibility.installabilityErrors, []);
await page.locator("#fullscreen").click();
await page.waitForFunction(() => !!document.fullscreenElement);
assert.equal(await page.locator("#fullscreen").innerText(), "Exit full screen");
await page.screenshot({ path: "artifacts/pwa-fullscreen.png", fullPage: true });
await page.locator("#fullscreen").click();
await page.waitForFunction(() => !document.fullscreenElement);
await page.evaluate(() => {
  document.documentElement.requestFullscreen = async () => {
    throw new Error("Denied");
  };
});
await page.locator("#fullscreen").click();
assert.match(await page.locator("#app-status").innerText(), /could not enter/);
await page.locator("#edit").click();
await page.getByLabel("Rival name", { exact: true }).fill("Offline Rivals");
await page.getByRole("button", { name: "Save game", exact: true }).click();
await context.setOffline(true);
await page.reload();
await page.waitForSelector("#lineup li");
assert.equal(await page.locator("#lineup li").count(), 10);
assert.equal(await page.locator(".fielder").count(), 10);
assert.equal(await page.locator("#rival-name").innerText(), "Offline Rivals");
await page.waitForFunction(() =>
  document.querySelector("#score").textContent.includes("Offline"),
);
const keys = await page.evaluate(async () => {
  const all = [];
  for (const key of await caches.keys()) {
    const cache = await caches.open(key);
    all.push(...(await cache.keys()).map((r) => r.url));
  }
  return all;
});
assert.ok(keys.length >= 10);
assert.ok(keys.every((u) => u.startsWith(url)));
assert.ok(keys.every((u) => !/statsapi|PRIVATE|SCOUTING/.test(u)));
await writeFile(
  "artifacts/pwa-verification.json",
  JSON.stringify(
    {
      url,
      manifest: parsed,
      eligibility,
      cached: keys,
      offline: "ten fielders and saved draft restored",
      fullscreen: "entered and exited; denial handled",
    },
    null,
    2,
  ),
);
console.log(
  "PWA passed: installability, manifest/icons, full screen toggle, denial handling, offline launch, draft persistence, and cache privacy.",
);
await browser.close();
