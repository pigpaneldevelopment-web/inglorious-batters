export const positions = [
  "P",
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "LC",
  "RC",
  "RF",
];
export function validate(s) {
  const e = [],
    names = s.lineup.map((p) => p.name.trim().toLowerCase());
  if (names.some((n) => !n)) e.push("Every player needs a name.");
  if (new Set(names).size !== names.length)
    e.push("Player names must be unique.");
  if (
    s.lineup.length < 10 ||
    s.lineup.length > 20 ||
    (!s.extras && s.lineup.length !== 10)
  )
    e.push(
      "Use 10 players, or enable extra hitters / substitutes (maximum 20).",
    );
  for (const pos of positions)
    if (s.lineup.filter((p) => p.position === pos).length !== 1)
      e.push(`Assign ${pos} exactly once.`);
  if (
    s.lineup.some(
      (p) =>
        !positions.includes(p.position) &&
        !(s.extras && ["EH", "SUB"].includes(p.position)),
    )
  )
    e.push("Choose a valid position.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.timezone }).format();
  } catch {
    e.push("Enter a valid IANA time zone.");
  }
  return e;
}
export function localDate(date, zone) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((k) => p.find((x) => x.type === k).value)
    .join("-");
}
export function pickGame(games) {
  return (
    games.find((g) => g.status.abstractGameState === "Live") ||
    games.find((g) => g.status.abstractGameState !== "Final") ||
    games.at(-1)
  );
}
export function mapFeed(f) {
  const d = f.gameData,
    l = f.liveData.linescore || {},
    status = d.status.detailedState,
    final = d.status.abstractGameState === "Final",
    live =
      d.status.abstractGameState === "Live" &&
      !/delay|suspend|postpon/i.test(status),
    p = f.liveData.plays?.currentPlay,
    active =
      live &&
      !p?.about?.isComplete &&
      p?.about?.inning === l.currentInning &&
      p?.about?.isTopInning === l.isTopInning;
  const result = {
    status: final ? "FINAL" : status,
    final,
    live,
    time: d.datetime?.dateTime,
    teams: ["away", "home"].map((side) => ({
      name: d.teams[side].abbreviation || d.teams[side].name,
      score: l.teams?.[side]?.runs ?? "—",
    })),
    inning: l.currentInning
      ? `${l.isTopInning ? "Top" : "Bottom"} ${l.currentInning}`
      : "",
    outs: l.outs ?? "—",
    balls: active ? (p?.count?.balls ?? "—") : "—",
    strikes: active ? (p?.count?.strikes ?? "—") : "—",
    batter: active
      ? (p?.matchup?.batter?.fullName ?? "Unavailable")
      : "Between batters",
    pitcher: active ? (p?.matchup?.pitcher?.fullName ?? "Unavailable") : "—",
    bases: ["first", "second", "third"].map((b) => Boolean(l.offense?.[b])),
    leaders: [],
  };
  if (final)
    for (const side of ["away", "home"]) {
      const players = Object.values(
        f.liveData.boxscore?.teams?.[side]?.players || {},
      );
      for (const [label, group, key] of [
        ["Hits", "batting", "hits"],
        ["RBI", "batting", "rbi"],
        ["HR", "batting", "homeRuns"],
        ["K", "pitching", "strikeOuts"],
      ]) {
        const rows = players.filter((p) =>
          Number.isFinite(p.stats?.[group]?.[key]),
        );
        const max = Math.max(0, ...rows.map((p) => p.stats[group][key]));
        if (max > 0)
          result.leaders.push(
            `${d.teams[side].abbreviation} ${label}: ${rows
              .filter((p) => p.stats[group][key] === max)
              .map((p) => p.person.fullName)
              .join(", ")} (${max})`,
          );
      }
    }
  return result;
}
