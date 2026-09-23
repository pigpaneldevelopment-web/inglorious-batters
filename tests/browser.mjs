import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// Real cross-origin calls from the locally served application.
await page.goto("http://127.0.0.1:4173");
await page.waitForTimeout(15000);
await writeFile(
  "artifacts/real-api-status.txt",
  await page.locator("#score").innerText(),
);
const cors = await page.evaluate(async () => {
  try {
    const r = await fetch(
      "https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=112&date=2026-09-23",
    );
    const s = await r.json();
    const g = s.dates?.[0]?.games?.[0];
    if (!g) return { schedule: r.status, games: 0 };
    const f = await fetch(
      `https://statsapi.mlb.com/api/v1.1/game/${g.gamePk}/feed/live`,
    );
    const data = await f.json();
    return {
      schedule: r.status,
      feed: f.status,
      status: data.gameData.status,
      gamePk: g.gamePk,
    };
  } catch (e) {
    return { error: String(e) };
  }
});
await writeFile("artifacts/cors-check.json", JSON.stringify(cors, null, 2));
await page.screenshot({
  path: "artifacts/tablet-landscape.png",
  fullPage: true,
});
assert.equal(await page.locator("#lineup li").count(), 10);
assert.equal(await page.locator(".fielder").count(), 10);
assert.equal(
  await page.locator(".fielder").filter({ hasText: "3BRyan" }).count(),
  1,
);
await page.locator("#edit").click();
await page.getByLabel("Player 1 name", { exact: true }).fill("Tyler");
await page.getByRole("button", { name: "Save game", exact: true }).click();
assert.match(await page.locator("#errors").innerText(), /unique/);
await page.getByLabel("Player 1 name", { exact: true }).fill("Sam");
await page.getByLabel("Rival name", { exact: true }).fill("Night Owls");
await page
  .getByRole("button", { name: "Move down player 1", exact: true })
  .click();
await page.getByRole("button", { name: "Save game", exact: true }).click();
assert.match(await page.locator("#lineup li").first().innerText(), /Tyler/);
await page.reload();
assert.equal(await page.locator("#rival-name").innerText(), "Night Owls");
await page.getByRole("button", { name: "Edit game", exact: true }).click();
await page.getByRole("button", { name: "Reset to original lineup" }).click();
await page.getByRole("button", { name: "Save game", exact: true }).click();
await page.waitForFunction(
  () => !document.querySelector("#score").textContent.includes("Updating"),
);
await page.setViewportSize({ width: 800, height: 1280 });
await page.screenshot({
  path: "artifacts/tablet-portrait.png",
  fullPage: true,
});
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.setViewportSize({ width: 390, height: 844 });
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.screenshot({ path: "artifacts/phone.png", fullPage: true });
await page.setViewportSize({ width: 1280, height: 800 });
await page.pdf({
  path: "artifacts/lineup.pdf",
  preferCSSPageSize: true,
  printBackground: true,
  displayHeaderFooter: false,
});
await page.route("https://statsapi.mlb.com/**", (route) =>
  route.fulfill({ json: { dates: [] } }),
);
await page.locator("#retry").click();
await page.waitForFunction(() =>
  document.querySelector("#score").textContent.includes("No Cubs game"),
);
await page.unroute("https://statsapi.mlb.com/**");
await page.route("https://statsapi.mlb.com/**", (route) => route.abort());
await page.locator("#retry").click();
await page.waitForFunction(() =>
  document.querySelector("#score").textContent.includes("unavailable"),
);
assert.equal(await page.locator("#lineup li").count(), 10);
await page.context().setOffline(true);
await page.waitForFunction(() =>
  document.querySelector("#score").textContent.includes("Offline"),
);
assert.deepEqual(errors, []);
console.log("Browser checks passed. Real API:", cors);
await browser.close();
