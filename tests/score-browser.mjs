import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let status = "In Progress";
const feed = () => ({
  gameData: {
    status: {
      detailedState: status,
      abstractGameState: status === "Final" ? "Final" : "Live",
    },
    datetime: { dateTime: "2026-09-23T23:40:00Z" },
    teams: { away: { abbreviation: "CHC" }, home: { abbreviation: "OPP" } },
  },
  liveData: {
    linescore: {
      currentInning: 4,
      isTopInning: false,
      outs: 2,
      teams: { away: { runs: 3 }, home: { runs: 2 } },
      offense: { second: { id: 2 } },
    },
    plays: {
      currentPlay: {
        about: { inning: 4, isTopInning: false, isComplete: false },
        count: { balls: 3, strikes: 2 },
        matchup: {
          batter: { fullName: "Fixture Batter" },
          pitcher: { fullName: "Fixture Pitcher" },
        },
      },
    },
    boxscore: {
      teams: {
        away: {
          players: {
            a: {
              person: { fullName: "Fixture Leader" },
              stats: {
                batting: { hits: 2, rbi: 1, homeRuns: 1 },
                pitching: { strikeOuts: 6 },
              },
            },
          },
        },
        home: { players: {} },
      },
    },
  },
});
await page.route("https://statsapi.mlb.com/**", (route) => {
  if (route.request().url().includes("schedule"))
    return route.fulfill({
      json: {
        dates: [
          {
            games: [1, 2].map((n) => ({
              gamePk: n,
              gameNumber: n,
              gameDate: "2026-09-23T23:40:00Z",
              status: { abstractGameState: n === 2 ? "Live" : "Final" },
              teams: {
                away: { team: { name: "Chicago Cubs" } },
                home: { team: { name: "Fixture Opponent" } },
              },
            })),
          },
        ],
      },
    });
  return route.fulfill({ json: feed() });
});
await page.goto("http://127.0.0.1:4173");
await page.locator("#date").fill("2026-09-23");
await page.locator("#retry").click();
await page.waitForFunction(() =>
  document.querySelector("#score").textContent.includes("Fixture Batter"),
);
assert.equal(await page.locator("#games").inputValue(), "2");
assert.match(await page.locator("#score").innerText(), /3–2 count/);
assert.match(await page.locator("#score").innerText(), /Bottom 4 · 2 out/);
await page.emulateMedia({ media: "print" });
assert.equal(await page.locator(".live-details").first().isVisible(), false);
await page.emulateMedia({ media: "screen" });
for (const s of ["Delayed", "Suspended", "Postponed", "Final"]) {
  status = s;
  await page.locator("#retry").click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector("#score").textContent.includes(expected),
    s === "Final" ? "FINAL" : s,
  );
  assert.equal(await page.locator(".live-details").count(), 0);
}
assert.match(
  await page.locator("#score").innerText(),
  /CHC Hits: Fixture Leader \(2\)/,
);
await page.locator("#edit").click();
await page.locator("#extras").check();
await page.locator("#add").click();
await page.getByLabel("Player 11 name", { exact: true }).fill("Extra Player");
await page.getByRole("button", { name: "Save game", exact: true }).click();
assert.equal(await page.locator("#lineup li").count(), 11);
assert.equal(await page.locator(".fielder").count(), 10);
await page.locator("#edit").click();
await page
  .getByRole("button", { name: "Remove player 11", exact: true })
  .click();
await page.getByRole("button", { name: "Save game", exact: true }).click();
assert.equal(await page.locator("#lineup li").count(), 10);
await page.locator("#edit").click();
await page.getByLabel("Player 1 position", { exact: true }).selectOption("P");
await page.getByRole("button", { name: "Save game", exact: true }).click();
assert.match(
  await page.locator("#errors").innerText(),
  /Assign P exactly once/,
);
await page.locator("#close").click();
assert.equal(await page.locator("#positions .fielder").count(), 10);
console.log(
  "Score state, doubleheader, print suppression, extra hitter, removal, and position-edit checks passed.",
);
await browser.close();
