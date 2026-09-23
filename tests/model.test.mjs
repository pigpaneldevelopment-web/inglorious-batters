import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { validate, mapFeed, localDate, pickGame } from "../src/model.js";
const seed = JSON.parse(await readFile("seed-lineup.json"));
export function fixture(status = "In Progress", abstract = "Live") {
  return {
    gameData: {
      status: { detailedState: status, abstractGameState: abstract },
      datetime: { dateTime: "2026-09-23T23:40:00Z" },
      teams: { away: { abbreviation: "CHC" }, home: { abbreviation: "OPP" } },
    },
    liveData: {
      linescore: {
        currentInning: 3,
        isTopInning: true,
        outs: 1,
        teams: { away: { runs: 2 }, home: { runs: 1 } },
        offense: { first: { id: 1 } },
      },
      plays: {
        currentPlay: {
          about: { inning: 3, isTopInning: true, isComplete: false },
          count: { balls: 2, strikes: 1 },
          matchup: {
            batter: { fullName: "Test Batter" },
            pitcher: { fullName: "Test Pitcher" },
          },
        },
      },
      boxscore: {
        teams: {
          away: {
            players: {
              a: {
                person: { fullName: "Player A" },
                stats: { batting: { hits: 3, rbi: 2, homeRuns: 1 } },
              },
              b: {
                person: { fullName: "Player B" },
                stats: { batting: { hits: 3 }, pitching: { strikeOuts: 5 } },
              },
            },
          },
          home: { players: {} },
        },
      },
    },
  };
}
test("seed has ten unique fielders and names", () =>
  assert.deepEqual(validate(seed), []));
test("duplicates, missing positions, invalid timezone and extra players rejected", () => {
  let s = structuredClone(seed);
  s.lineup[1] = s.lineup[0];
  s.timezone = "bad";
  assert.ok(validate(s).length >= 3);
  s = structuredClone(seed);
  s.lineup.push({ name: "Extra", position: "EH" });
  assert.ok(validate(s).length);
  s.extras = true;
  assert.deepEqual(validate(s), []);
});
test("live batter, pitcher, count, bases and outs", () => {
  const s = mapFeed(fixture());
  assert.equal(s.batter, "Test Batter");
  assert.equal(s.pitcher, "Test Pitcher");
  assert.equal(s.balls, 2);
  assert.equal(s.strikes, 1);
  assert.equal(s.outs, 1);
  assert.deepEqual(s.bases, [true, false, false]);
});
test("completed plate appearance never reuses count", () => {
  const f = fixture();
  f.liveData.plays.currentPlay.about.isComplete = true;
  assert.equal(mapFeed(f).balls, "—");
});
test("final leaders are game stats with ties", () => {
  const s = mapFeed(fixture("Final", "Final"));
  assert.ok(s.final);
  assert.equal(s.live, false);
  assert.ok(s.leaders.includes("CHC Hits: Player A, Player B (3)"));
  assert.ok(s.leaders.includes("CHC K: Player B (5)"));
});
test("delayed postponed and suspended do not expose live details", () => {
  for (const status of ["Delayed", "Postponed", "Suspended"])
    assert.equal(mapFeed(fixture(status)).live, false);
});
test("timezone date boundaries and doubleheader selection", () => {
  assert.equal(
    localDate(new Date("2026-09-24T01:00:00Z"), "America/Denver"),
    "2026-09-23",
  );
  const games = [
    { status: { abstractGameState: "Final" } },
    { status: { abstractGameState: "Live" } },
  ];
  assert.equal(pickGame(games), games[1]);
});
test("public source excludes private descriptions and notes", async () => {
  for (const f of [
    "src/app.js",
    "src/model.js",
    "index.html",
    "style.css",
    "seed-lineup.json",
  ])
    assert.doesNotMatch(
      await readFile(f, "utf8"),
      /slump|low confidence|rough patch|scouting|weak bats/i,
    );
  assert.ok(!(await readdir(".")).includes("PRIVATE_SCOUTING.md"));
});
