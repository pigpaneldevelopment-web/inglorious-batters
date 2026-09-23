import { positions, validate, localDate, pickGame, mapFeed } from "./model.js";
const $ = (s) => document.querySelector(s),
  el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  },
  key = "batters-game-v1";
const seed = await fetch("./seed-lineup.json").then((r) => r.json());
let state = structuredClone(seed),
  draft,
  logo,
  selected = "",
  timer,
  controller,
  version = 0,
  lastScore = null,
  lastAt = null,
  failed = false;
function clean(s) {
  return {
    team: seed.team,
    timezone: String(s.timezone),
    extras: !!s.extras,
    rival: {
      name: String(s.rival?.name || "Rivals").slice(0, 40),
      logo: /^data:image\/(png|jpeg|webp);base64,/.test(s.rival?.logo || "")
        ? s.rival.logo
        : null,
    },
    lineup: s.lineup.map((p) => ({
      name: String(p.name).slice(0, 32),
      position: String(p.position),
    })),
  };
}
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && !validate(clean(saved)).length) state = clean(saved);
} catch {}
const xy = {
  LF: [14, 22],
  LC: [38, 13],
  RC: [62, 13],
  RF: [86, 22],
  SS: [37, 43],
  "2B": [63, 43],
  "3B": [21, 61],
  "1B": [79, 61],
  P: [50, 64],
  C: [50, 87],
};
function render() {
  document.body.classList.toggle("many", state.lineup.length > 12);
  $("#lineup").replaceChildren();
  $("#positions").replaceChildren();
  state.lineup.forEach((p, i) => {
    const li = el("li");
    li.append(
      el("span", String(i + 1).padStart(2, "0"), "number"),
      el("span", p.name, "player"),
      el("span", p.position, "position"),
    );
    $("#lineup").append(li);
    if (xy[p.position]) {
      const n = el("div", undefined, "fielder");
      n.style.left = xy[p.position][0] + "%";
      n.style.top = xy[p.position][1] + "%";
      n.append(el("b", p.position), el("span", p.name));
      $("#positions").append(n);
    }
  });
  $("#count").textContent = state.lineup.length + " PLAYERS";
  $("#rival-name").textContent = state.rival.name;
  const holder = $("#rival-logo");
  holder.replaceChildren();
  if (state.rival.logo) {
    const img = el("img");
    img.src = state.rival.logo;
    img.alt = state.rival.name + " logo";
    holder.append(img);
  } else
    holder.textContent = state.rival.name
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
}
function editRows() {
  const wrap = $("#rows");
  wrap.replaceChildren();
  draft.lineup.forEach((p, i) => {
    const row = el("div", undefined, "edit-row"),
      name = el("input"),
      pos = el("select");
    name.value = p.name;
    name.maxLength = 32;
    name.setAttribute("aria-label", `Player ${i + 1} name`);
    name.oninput = () => (p.name = name.value);
    pos.setAttribute("aria-label", `Player ${i + 1} position`);
    for (const v of [...positions, "EH", "SUB"]) {
      const o = el("option", v);
      o.value = v;
      pos.append(o);
    }
    pos.value = p.position;
    pos.onchange = () => (p.position = pos.value);
    row.append(el("span", i + 1), name, pos);
    for (const [label, delta] of [
      ["↑", -1],
      ["↓", 1],
      ["Remove", 0],
    ]) {
      const b = el("button", label);
      b.type = "button";
      b.setAttribute(
        "aria-label",
        `${label === "Remove" ? "Remove" : delta < 0 ? "Move up" : "Move down"} player ${i + 1}`,
      );
      b.disabled =
        (delta < 0 && i === 0) || (delta > 0 && i === draft.lineup.length - 1);
      b.onclick = () => {
        if (delta)
          [draft.lineup[i], draft.lineup[i + delta]] = [
            draft.lineup[i + delta],
            draft.lineup[i],
          ];
        else draft.lineup.splice(i, 1);
        editRows();
        $("#rows")
          .children[Math.min(i, draft.lineup.length - 1)]?.querySelector(
            "input",
          )
          ?.focus();
      };
      row.append(b);
    }
    wrap.append(row);
  });
}
$("#edit").onclick = () => {
  draft = structuredClone(state);
  logo = state.rival.logo;
  $("#rival-input").value = state.rival.name;
  $("#zone").value = state.timezone;
  $("#extras").checked = !!state.extras;
  $("#errors").textContent = "";
  $("#logo").value = "";
  editRows();
  $("#editor").showModal();
};
$("#close").onclick = () => $("#editor").close();
$("#add").onclick = () => {
  draft.lineup.push({ name: "", position: "EH" });
  editRows();
};
$("#reset").onclick = () => {
  draft = structuredClone(seed);
  logo = null;
  $("#rival-input").value = draft.rival.name;
  $("#zone").value = draft.timezone;
  $("#extras").checked = false;
  editRows();
};
$("#logo").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 1024 * 1024
  ) {
    $("#errors").textContent = "Choose a PNG, JPEG or WebP image under 1 MB.";
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    logo = reader.result;
    $("#errors").textContent = "";
  };
  reader.readAsDataURL(file);
};
$("#form").onsubmit = (e) => {
  e.preventDefault();
  draft.timezone = $("#zone").value.trim();
  draft.extras = $("#extras").checked;
  draft.rival = { name: $("#rival-input").value.trim() || "Rivals", logo };
  const errors = validate(draft);
  if (errors.length) {
    $("#errors").textContent = errors.join("\n");
    return;
  }
  const next = clean(draft);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    $("#errors").textContent =
      "Could not save on this device. Free storage or enable local storage.";
    return;
  }
  state = next;
  render();
  $("#editor").close();
  selected = "";
  $("#date").value = localDate(new Date(), state.timezone);
  refresh();
};
function displayScore(message) {
  const box = $("#score");
  box.replaceChildren();
  if (message) box.append(el("strong", message));
  if (!lastScore) return;
  const s = lastScore;
  box.append(
    el(
      "div",
      s.teams.map((t) => `${t.name} ${t.score}`).join("  /  "),
      "scoreline",
    ),
  );
  box.append(
    el(
      "span",
      `${s.status}${s.time && !s.live && !s.final ? " · First pitch " + new Intl.DateTimeFormat("en-US", { timeZone: state.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(s.time)) : ""}`,
    ),
  );
  if (s.live && !failed) {
    box.append(
      el(
        "div",
        `${s.inning} · ${s.outs} out · ${s.balls}–${s.strikes} count · Bases 1/2/3: ${s.bases.map((b) => (b ? "●" : "○")).join(" ")}`,
        "live-details",
      ),
    );
    box.append(
      el(
        "div",
        `Batting: ${s.batter} · Pitching: ${s.pitcher}`,
        "live-details",
      ),
    );
  }
  if (s.final)
    box.append(
      el(
        "div",
        s.leaders.length
          ? "Game leaders · " + s.leaders.join(" · ")
          : "Game leaders unavailable.",
        "leaders",
      ),
    );
  if (lastAt)
    box.append(
      el(
        "small",
        `As of ${new Intl.DateTimeFormat("en-US", { timeZone: state.timezone, dateStyle: "short", timeStyle: "medium" }).format(lastAt)} (${state.timezone})`,
      ),
    );
}
async function json(url, signal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw Error("Data unavailable");
  return response.json();
}
async function refresh() {
  clearTimeout(timer);
  controller?.abort();
  const token = ++version;
  controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(
    () => controller?.signal === signal && controller.abort(),
    12000,
  );
  let delay = 120000;
  try {
    if (!navigator.onLine) throw Error("Offline");
    failed = true;
    displayScore("Updating…");
    const day = $("#date").value;
    if (!day) return;
    const center = new Date(day + "T12:00:00Z"),
      prev = new Date(+center - 86400000).toISOString().slice(0, 10),
      next = new Date(+center + 86400000).toISOString().slice(0, 10);
    const schedule = await json(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=112&startDate=${prev}&endDate=${next}`,
      signal,
    );
    if (token !== version) return;
    const games = (schedule.dates || [])
      .flatMap((d) => d.games)
      .filter((g) => localDate(new Date(g.gameDate), state.timezone) === day);
    $("#games").replaceChildren();
    for (const g of games) {
      const o = el(
        "option",
        `Game ${g.gameNumber || 1}: ${g.teams.away.team.name} @ ${g.teams.home.team.name}`,
      );
      o.value = g.gamePk;
      $("#games").append(o);
    }
    if (!games.length) {
      lastScore = null;
      lastAt = null;
      displayScore("No Cubs game scheduled for this local date.");
      $("#games").append(el("option", "No game"));
      return;
    }
    const game =
      games.find((g) => String(g.gamePk) === selected) || pickGame(games);
    $("#games").value = game.gamePk;
    const feed = await json(
      `https://statsapi.mlb.com/api/v1.1/game/${game.gamePk}/feed/live`,
      signal,
    );
    if (token !== version) return;
    lastScore = mapFeed(feed);
    lastAt = new Date();
    failed = false;
    displayScore();
    delay = lastScore.final ? 0 : lastScore.live ? 20000 : 120000;
  } catch (e) {
    if (token !== version) return;
    failed = true;
    displayScore(
      navigator.onLine
        ? "Score unavailable / stale. Use Refresh to retry."
        : "Offline · score unavailable / stale.",
    );
    delay = 30000;
  } finally {
    clearTimeout(timeout);
    if (token === version && delay && !document.hidden)
      timer = setTimeout(refresh, delay);
  }
}
$("#date").value = localDate(new Date(), state.timezone);
$("#date").onchange = () => {
  selected = "";
  lastScore = null;
  lastAt = null;
  refresh();
};
$("#games").onchange = (e) => {
  selected = e.target.value;
  lastScore = null;
  lastAt = null;
  refresh();
};
$("#retry").onclick = refresh;
$("#print").onclick = () => window.print();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(timer);
    version++;
    controller?.abort();
  } else refresh();
});
window.addEventListener("online", refresh);
window.addEventListener("offline", () => {
  version++;
  controller?.abort();
  clearTimeout(timer);
  failed = true;
  displayScore("Offline · score unavailable / stale.");
});
window.addEventListener("pagehide", () => {
  clearTimeout(timer);
  controller?.abort();
});
render();
refresh();
