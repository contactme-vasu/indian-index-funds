# Task: Backend Performance Data

## Goal

Add backend-only cumulative performance chart data to the public site JSON so future full site generation includes normalized TRI performance series.

## Current State

- `main.py` downloads all configured index TRI DataFrames, builds rolling analysis with `build_analysis()`, then writes `cache/site_data.json` and `docs/data.json` through `build_public_site_data()` and `build_site()`.
- `src/processor.py` currently emits public metadata and `periods` rows, but intentionally excludes raw TRI values and does not emit chart-ready performance data.
- Cached TRI CSVs are available under `cache/data_cache/`; verification must use those files only and must not run `python main.py` because that refreshes NSE data over the network.
- `web_export/static/` and `docs/` frontend files are out of scope for this backend-only task.

## Plan

- Add a processor helper in `src/processor.py` that builds `data.performance` from the displayed/successfully downloaded index DataFrames.
- Compute the exact shared date intersection across included DataFrames, derive dynamic `startDate` and `endDate`, and sample the last common date of each month plus exact endpoints.
- Normalize every sampled TRI point to an initial INR 1,000 investment at `startDate`.
- Extend `build_public_site_data()` to accept optional performance source DataFrames and include the generated payload.
- Update `main.py` to pass `all_data` into `build_public_site_data()` so future full site generation includes the backend chart data.
- Verify from cached CSVs only, including current-cache expectations for `startDate`, `endDate`, series count, and `initialInvestment`.

## Review Notes

- Scope is limited to backend generation and task documentation; no frontend/static UI files should be edited.
- The chart date range must be derived from exact shared dates present in every included DataFrame, not from configured start/end dates or `get_end_date()`.
- The performance payload may include normalized TRI values but should not expose unsampled raw daily TRI series.
- Sampling should use dates from the common intersection, choosing the last available common date per calendar month, then ensuring exact dynamic endpoints are present.

## Implementation Notes

- Added `build_performance_data()` in `src/processor.py`.
- The helper cleans each DataFrame, normalizes dates, deduplicates by date, computes the exact shared date intersection, derives dynamic `startDate`/`endDate`, samples the last shared date in each calendar month plus exact endpoints, and normalizes sampled TRI values to INR 1,000.
- Extended `build_public_site_data()` with a `performance_data` argument and emits top-level `performance`.
- Updated `main.py` to pass `all_data` into `build_public_site_data()` so future full generation includes the backend payload.
- Updated `cache/site_data.json` and `docs/data.json` from cached CSVs only, using configured index names and without running `python main.py`.
- Frontend continuation on 2026-07-03:
  - Added a cumulative performance section below the analysis table in `web_export/static/index.html`.
  - Added dependency-free SVG chart rendering in `web_export/static/app.js` using `data.performance`, dynamic start/end date labels, INR y-axis labels, and all-series chart scaling.
  - Added checkbox controls for every series, selected by default, plus Select all and Clear controls. Checkbox changes hide/show lines only and do not rebase the chart.
  - Added graceful unavailable handling when `data.performance` is missing or empty.
  - Added chart, controls, and responsive styles in `web_export/static/styles.css`.
- Regeneration and verification continuation on 2026-07-03:
  - Regenerated `cache/site_data.json` from cached index CSVs only, using `_load_cached()` and `build_public_site_data(..., performance_data=all_data)`.
  - Regenerated `docs/` through `build_site()` from the static source files and the rebuilt public site data.
  - Did not run `python main.py` and did not refresh NSE data.
- Excluded-index note continuation on 2026-07-03:
  - Added `excludedIndexes` to the public site JSON so skipped configured indexes can be disclosed without manual CSV downloads.
  - Updated `main.py` to pass configured indexes missing from `all_data` into `build_public_site_data()`.
  - Added a metadata note in the static site UI that appears only when `excludedIndexes` is non-empty.
  - Regenerated `cache/site_data.json` and `docs/` from cached CSVs only.

## Verification

- Ran `python -B -m py_compile main.py src\processor.py` successfully.
- Built performance data from cached CSVs only; did not run `python main.py`.
- Current-cache verification from `cache/site_data.json`:
  - `startDate = 2009-01-01`
  - `endDate = 2026-03-30`
  - `series count = 43`
  - `initialInvestment = 1000`
  - `currency = INR`
  - `pointFrequency = monthly`
- Verified performance series names match the first period's displayed row index names.
- Verified every series starts at `2009-01-01` with value `1000.0` and ends at `2026-03-30`.
- Verified every series has 208 sampled monthly/endpoints points.
- Frontend continuation verification on 2026-07-03:
  - Ran `node --check .\web_export\static\app.js` successfully.
  - Confirmed `cache/site_data.json` contains `performance` with `startDate = 2009-01-01`, `endDate = 2026-03-30`, `series count = 43`, and `initialInvestment = 1000`.
  - Did not regenerate `docs/`; source updates were limited to `web_export/static/` plus this task note.
- Regeneration and end-to-end verification on 2026-07-03:
  - Rebuilt `cache/site_data.json` and `docs/` from cached CSVs only. Loaded 43 cached series; 3 configured indices were missing cached CSVs and were skipped consistently with the current cache.
  - Confirmed `docs/data.json` contains `performance.initialInvestment = 1000`, `currency = INR`, `pointFrequency = monthly`, `startDate = 2009-01-01`, `endDate = 2026-03-30`, and `series count = 43`.
  - Confirmed every performance series starts on `2009-01-01` at `1000.0`, ends on `2026-03-30`, and has 208 sampled points.
  - Confirmed `docs/index.html`, `docs/app.js`, and `docs/styles.css` include the cumulative performance chart UI, controls, and chart styles.
  - Ran `node --check .\docs\app.js` successfully.
  - Ran `python -B -m py_compile main.py src\processor.py` successfully.
  - Served `docs/` locally at `http://localhost:8766/` and verified the page loads in the browser with no JavaScript console errors.
  - Browser desktop check: chart renders below the analysis table, description uses `01/01/2009` and `30/03/2026`, 43 checkboxes are selected, and 43 SVG lines render.
  - Browser interaction check: Clear sets 0 selected series and shows the "No indexes selected" empty state; Select all restores 43 selected series and 43 lines; an individual checkbox hides and restores one line.
  - Browser mobile-width check at 390px: page has no document-level horizontal overflow, chart remains visible with internal chart scrolling, controls stack correctly, and no console errors were reported.
- Excluded-index note verification on 2026-07-03:
  - Confirmed `cache/site_data.json` and `docs/data.json` include `excludedIndexes = ["NIFTY MIDCAP SELECT", "NIFTY TOTAL MARKET", "NIFTY100 QUALITY 30"]`.
  - Confirmed the regenerated chart data remains dynamic with `startDate = 2009-01-01`, `endDate = 2026-03-30`, and `series count = 43`.
  - Confirmed `docs/index.html`, `docs/app.js`, and `docs/styles.css` include the note container, rendering logic, and styles.
  - Ran `node --check web_export\static\app.js` successfully.
  - Ran `node --check docs\app.js` successfully.
  - Ran `python -B -m py_compile main.py src\processor.py` successfully.
- Final review and publish preparation on 2026-07-03:
  - Reviewed `git status` and confirmed the pending product changes are limited to backend performance data generation, frontend chart UI, regenerated `cache/site_data.json`, regenerated `docs/` files, and this task note.
  - Rechecked `docs/data.json` performance values: `initialInvestment = 1000`, `currency = INR`, `pointFrequency = monthly`, `startDate = 2009-01-01`, `endDate = 2026-03-30`, and `series count = 43`.
  - Confirmed `docs/app.js`, `docs/index.html`, and `docs/styles.css` match the generated copies of `web_export/static/app.js`, `web_export/static/index.html`, and `web_export/static/styles.css`.
  - Ran `python -B -m py_compile main.py src\processor.py` successfully.
  - Ran `node --check web_export\static\app.js` and `node --check docs\app.js` successfully.
  - Ran `git -c safe.directory="D:/Index Fund" diff --check` successfully; Git reported only line-ending normalization warnings.
  - Served `docs/` locally with `python -B -m http.server 8767 -d docs` and verified `/` and `/data.json` returned HTTP 200, chart markup was present, and the served data retained `2009-01-01` through `2026-03-30` with 43 series.
- Live deployment closeout on 2026-07-03:
  - Confirmed `origin/main` points to deployed candidate commit `d13cdcbf28b9e239fc4f63b8ee65cbd4351bb38b` (`Add cumulative performance chart`) with `git -c safe.directory="D:/Index Fund" ls-remote origin refs/heads/main`.
  - Verified live URL `https://contactme-vasu.github.io/indian-index-funds/?v=d13cdcbf28b9e239fc4f63b8ee65cbd4351bb38b`.
  - `gh` is not installed in this environment, and the unauthenticated GitHub Pages REST endpoint returned 404, so deployment status was verified from the live Pages response and deployed assets.
  - Live HTML returned HTTP 200 from GitHub Pages with `Last-Modified: Fri, 03 Jul 2026 02:36:00 GMT`.
  - Downloaded live `data.json` with the commit cache-busting query string and confirmed the parsed JSON object exactly matches committed `docs/data.json`; raw byte hashes differ because of served formatting/line endings.
  - Confirmed live `data.performance` has `initialInvestment = 1000`, `currency = INR`, `pointFrequency = monthly`, `startDate = 2009-01-01`, `endDate = 2026-03-30`, and `series count = 43`.
  - Browser desktop verification on the live page: chart renders below the analysis table, chart text uses `01/01/2009` and `30/03/2026`, all 43 index checkboxes are selected by default, and 43 SVG paths render with no JavaScript console errors.
  - Browser interaction verification on the live page: Clear sets 0 selected indexes, removes chart paths, and shows the empty state; Select all restores 43 selected indexes and 43 paths; toggling one index hides and restores one line.
  - Browser mobile verification at 390px width: chart text and dynamic dates render, all 43 indexes are selected by default, 43 paths render, there is no document-level horizontal overflow, and no JavaScript console errors were reported.
  - No live bug was found, so no product code change, regeneration, commit, or push was needed.
- Final maintainability and future-refresh audit on 2026-07-03:
  - Reviewed `AGENTS.md`, this task file, `src/processor.py`, `main.py`, `web_export/static/app.js`, `web_export/static/styles.css`, `web_export/static/index.html`, and `docs/data.json`.
  - Confirmed production chart dates are recomputed in `build_performance_data()` from the exact shared date intersection across included TRI DataFrames with `startDate = common_dates.min()` and `endDate = common_dates.max()`.
  - Confirmed no current-cache dates are hardcoded in production chart logic; `2009-01-01` and `2026-03-30` appear only as generated current-cache data or verification notes.
  - Confirmed `python main.py` still uses `get_end_date()` only for the download refresh range, while the chart payload receives `all_data` and derives its own common-date range from downloaded/cached DataFrames.
  - Confirmed `docs/data.json` is 923,271 bytes, with `data.performance` about 343,251 compact JSON bytes, 43 series, and 8,944 sampled points, which remains reasonable for GitHub Pages.
  - Confirmed accessibility basics: the chart section has an `aria-labelledby` heading, dynamic description text, SVG `role="img"`, checkbox controls are native labeled inputs, and Select all/Clear are native buttons usable by keyboard.
  - Confirmed mobile layout risk is handled by a single-column checkbox grid under 820px and horizontal scrolling inside `.chart-wrap` for the fixed-min-width SVG, avoiding document-level chart overflow.
  - Confirmed `AGENTS.md` and this task file both document the dynamic common-date rule for future agents.
  - No maintainability issue requiring product changes was found, so no code change, docs regeneration, commit, or push was performed.
- Hover/focus highlighting continuation plan on 2026-07-03:
  - Scope is limited to cumulative performance chart interaction in `web_export/static/app.js`, `web_export/static/styles.css`, and generated static copies under `docs/`.
  - Add active-series UI state only; do not change analysis table behavior, performance data generation, chart date logic, or INR 1,000 normalization.
  - Wire SVG line pointer/focus events and checkbox-label pointer/focus events to the same active-series state while keeping checkbox show/hide behavior unchanged.
  - Add CSS classes for active and dimmed visible chart lines plus active/dimmed legend labels.
  - Add a non-obstructive SVG label for the active index name/value and keep chart line names available through SVG title/ARIA labels.
  - Verify syntax with `node --check` for source and generated app JS, and perform local static/browser checks if feasible.
- Hover/focus highlighting continuation implementation on 2026-07-03:
  - Added `state.performanceActive` in `web_export/static/app.js` and mirrored it to `docs/app.js`.
  - Added pointer and focus handlers to each rendered chart line and each checkbox label so chart-line hover/focus and legend hover/focus use the same active-series state.
  - Added focusable chart paths with per-series `aria-label` values and existing SVG `<title>` names.
  - Added active/dimmed chart line classes, active/dimmed legend label classes, and an SVG active label showing the highlighted index name and latest displayed value.
  - Kept Select all, Clear, and individual checkbox visibility behavior unchanged; clearing or hiding the active series also clears the active highlight.
  - Updated only `web_export/static/app.js`, `web_export/static/styles.css`, `docs/app.js`, `docs/styles.css`, and this task note; `docs/data.json` was not regenerated or changed.
- Hover/focus highlighting continuation verification on 2026-07-03:
  - Ran `node --check web_export\static\app.js` successfully.
  - Ran `node --check docs\app.js` successfully.
  - Did not run `python main.py`.
  - Served `docs/` through an in-process local static server and checked the page in local Chrome through Playwright using the existing Chrome executable.
  - Browser check results: 43 chart lines render initially; hovering a chart line produces 1 active line, 42 dimmed lines, and an active label; hovering a checkbox label produces 1 active line, 42 dimmed lines, and an active label; focusing the first checkbox input produces the same active highlight path.
  - Confirmed the active SVG label fits inside its label background.
  - Confirmed keyboard checkbox toggling still hides/restores only the matching line: 43 lines to 42 lines and back to 43 lines.
  - Confirmed Clear shows 0 lines and the "No indexes selected" empty state, while Select all restores 43 lines.
  - Confirmed a 390px mobile viewport has no document-level horizontal overflow and still renders 43 chart lines.
  - Browser console and page-error captures were empty.
