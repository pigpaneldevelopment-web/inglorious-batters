# Inglorious Batters

Static softball dashboard with device-local roster editing and a Cubs scoreboard. No runtime dependencies, API keys, accounts, or private scouting fields.

## Run and verify

Use Node 24 or newer:

```sh
npm ci
npm test
npm run build
npm run dev
```

Open http://localhost:4173. Serve `dist/` only, never the parent workspace. The build copies an explicit five-file allowlist (including two JavaScript modules). Paths are relative, so project-based GitHub Pages works without a base-path change.

For browser tests, leave the preview server running, then:

```sh
npx playwright install chromium
npm run test:browser
node scripts/check-pdf.mjs
```

Screenshots and PDF samples are generated in ignored `artifacts/`. Browser tests make real MLB requests as well as controlled error/off-day checks. Model fixtures are synthetic test data and are never copied into the production bundle.

## Game-day operation

Select **Edit game** to change names, positions, batting order, rival name/logo, or IANA time zone. Up/down buttons support keyboard and touch. Enable extra hitters/substitutes only when league rules permit them. EH and SUB entries do not appear on the field. SUB entries remain labeled in the displayed roster; remove them from the roster if they should not appear in the batting list. All ten field positions must be assigned exactly once. Save persists display settings to this browser; Close cancels the draft. Reset restores the seed in the editor, and Save applies it. Uploaded logos stay in this browser. No runner assignment is assumed.

Use **Print / PDF** and browser Save as PDF. The stylesheet requests Letter landscape with 10 mm margins. Disable the browser's own headers/footers to suppress its URL. The export omits live count/base/batter/pitcher details and includes an as-of timestamp when a score is available. The ten-player sample is tested to fit one page. Other printers, unusually long names, and large extra-player rosters may require scaling.

For a new seed roster, update only names/positions in `seed-lineup.json`, then test, build, and deploy. Existing local drafts override new seed data until Reset + Save. Keep all qualitative player descriptions outside this repository; pass them separately to Codex as private build context. Never add handoff ZIPs or private notes to this repository.

## Scoreboard

The selected date is interpreted in the configured local time zone (America/Denver initially). Adjacent schedule dates are queried and filtered by actual first-pitch local date. Doubleheaders have a game picker and default to the live game. Live feeds refresh every 20 seconds, other unfinished states every two minutes, and errors every 30 seconds. Final games stop polling; Refresh and returning to the tab recheck. Hidden tabs cancel requests. Each fetch has a 12-second timeout. Failed refreshes hide live details, label retained scores stale, and retain the last successful retrieval timestamp. A server that returns an old payload as a successful fresh response cannot be independently verified; the timestamp denotes retrieval, not a guarantee of upstream freshness.

Counts come from an unfinished current play matching the current half-inning. Between plays the app shows unknown count rather than recycling the prior batter's count. Bases/outs/scores come from linescore. Final leaders are computed separately for each team from game box-score hits, RBI, HR, and pitcher strikeouts; ties are preserved and zero categories omitted. Data availability and public API stability are not guaranteed.

Source: [MLB Cubs scores](https://www.mlb.com/cubs/scores), schedule API `statsapi.mlb.com/api/v1/schedule`, live feed API `statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`. Both API routes returned HTTP 200 through real desktop Chromium cross-origin requests on September 23, 2026. The actual Android K10 and a deployed Pages origin remain unverified.

## Branding

The original header reference and rival logo were not provided. The editable CSS wordmark is provisional. CHC and rival initials are plain text placeholders, not licensed team marks. No Cubs or opponent logo asset is bundled: public reuse permission was not established from [MLB's terms](https://www.mlb.com/official-information/terms-of-use). Replace only with approved assets. This is an independent team dashboard.

## Publish

A GitHub Pages Actions workflow is included. Create an `inglorious-batters` repository in the intended account, push this directory's reviewed source on `main`, and choose **Settings → Pages → Source → GitHub Actions**. The workflow builds and uploads only `dist/`. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

```sh
git push -u origin main
```

Check the workflow and published URL, then test MLB requests on the Android tablet at that URL. Never treat a successful build as proof of deployment.

Repository: https://github.com/pigpaneldevelopment-web/inglorious-batters

Pages address: https://pigpaneldevelopment-web.github.io/inglorious-batters/

Deploy updates with `git push origin main`; check the Deploy dashboard workflow before opening the Pages address.
