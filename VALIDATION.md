# Validation and performance

Measured locally on 2026-09-08 with Node.js 24.10.0 and Chromium. Initial source baseline: `960a1df`. These measurements use local production builds and simulated network responses; they are not internet latency or Core Web Vitals claims.

## Regressions reproduced and fixed

The first three tests failed on the original implementation and passed after correction:

- A slower earlier package search overwrote the latest result.
- Clearing autocomplete left its timer active and allowed suggestions to return.
- Valid JSON of the wrong shape in local storage was accepted as history.

Additional tests cover late release responses, closed tabs, overlapping history updates, cache expiry and refresh, queued requests, token isolation, HTTP/JSON failures, Unicode changelogs, repository formats, scoped tags and version range semantics.

## Measurements

The initial build before changes reported 249.75 kB gzip for the main JavaScript. After adding the features, the main script is approximately 182 kB gzip, about 27% smaller. The Markdown parser/renderer is deferred until a notes view is opened. Its additional chunks mean total downloaded code after opening notes is larger than the initial download; only the initial JavaScript is subject to the 250,000-byte regression budget.

Three fresh-page samples with 10,000 published versions, identical JSON fixtures, no network latency simulation and desktop Chromium:

| Measurement              | Baseline median | Updated median |
| ------------------------ | --------------: | -------------: |
| Package list ready       |          499 ms |         123 ms |
| Filter to one version    |          304 ms |          11 ms |
| Rendered version choices |          10,000 |             50 |

The benchmark's baseline badge count includes one extra metadata badge. The old source was rebuilt with the installed toolchain for the timing comparison. The initial bundle figure above was recorded before dependency updates.

Run `node scripts/benchmark.cjs` with the baseline build served on port 4174 and the current build on 4173 to repeat the timing comparison. `BUILD_DIR` and `PORT` configure `scripts/serve-build.cjs`.

The cache test asserts one HTTP request for overlapping and repeated reads, another after five-minute expiry, and another after explicit invalidation. Browser tests verify that retrying an unsuccessful comparison entry does not refetch successful entries.

## Automated results

44 Jest tests and 30 desktop/mobile Playwright scenarios passed. TypeScript, the production build and the initial JavaScript budget check passed.

## Pre-push revalidation

The full suite is invoked with `CI=true yarn validate`. The script was renamed from `check` because Yarn 1 reserves `yarn check` for its dependency consistency command. The workflow and README use the unambiguous command.

## Browser coverage

Desktop and mobile Chromium scenarios exercise keyboard autocomplete, history removal, filters, prereleases, opening/closing tabs, source links, Unicode changelogs, both comparison views, stop/resume/full-interval loading, partial failure recovery, quota recovery, optional tokens, clipboard sharing, browser navigation, invalid links, empty packages, Auto/Light/Dark selection, live system-theme changes, persisted manual overrides and 10,000-version pagination. Markdown fixtures contain script, iframe and unsafe-link attempts.

Local real-service smoke checks successfully loaded React 18.2.0, @babel/core 7.24.7 and Next.js 14.2.0 release notes, with no browser exceptions. Real-service checks are separate from deterministic CI tests.

## Remaining verification limits

- Mobile tests emulate a mobile viewport and input in Chromium; native Safari and Firefox are not covered by this run.
- Visual inspection covered desktop/mobile comparison layouts and themes; this is not a WCAG conformance certification.
- GitHub Actions, CodeQL and publication require a remote workflow run; local validation alone does not establish their outcome.
- The existing Create React App toolchain still reports dependency/compatibility deprecation notices. No framework migration was included.

## Auto theme and interval comparison

A new browser regression test failed on the previous build: comparing seven intervening versions fetched only five releases. It now fetches all seven, excludes the starting version and includes the target version. The default comparison also presents repository commits and files, with unit coverage for npm commit references, scoped tag fallback, pagination, file-list limits and non-linear histories.

A live comparison of React 18.0.0 → 18.2.0 loaded the intermediate release notes and returned 180 repository commits plus the capped file list, without browser exceptions. The UI flags the repository scope and file-list cap.
