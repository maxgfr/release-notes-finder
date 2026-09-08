# Release Notes Finder

Browse npm package versions and their GitHub release notes, or read the changes between two versions.

[Open the app](https://maxgfr.github.io/release-notes-finder/)

## Features

- Package autocomplete, keyboard navigation and ten recent searches stored locally.
- SemVer sorting, text and major/minor/patch filters, latest per major, and optional prereleases. Lists show 50 versions per page.
- Release-note tabs, a package information panel, and an on-demand changelog reader.
- Repository detection for HTTPS, SSH and GitHub shorthand, including scoped packages and monorepo directories.
- **Changes between versions** (default): commits and changed files between the published Git references, followed by every release note for versions greater than A and less than or equal to B, oldest first.
- **Release notes only**: the full published-note timeline, without the repository comparison.
- **Endpoint notes side by side**: notes for A and B, displayed in columns on desktop and stacked on mobile.
- Release notes load automatically through the whole interval. Stop or resume whenever needed; errors and GitHub quotas remain explicit. Successful entries are reused on retry.
- Shareable package, version and comparison links; browser back/forward support.
- An English interface, Auto/Light/Dark themes, labeled controls and keyboard-accessible actions. Auto follows system changes immediately; manual choices override the system and persist across reloads.

Selecting a version opens a tab without switching away from the version list. Select the tab to read its notes.

### Themes

Use the **Color theme** selector in the header. **Auto** is the default for new visitors and follows the operating system, including changes while the app is open. Existing light/dark preferences are preserved. Theme selection is stored locally, independently of GitHub access.

### GitHub access

No account or token is required for public packages. Expand **GitHub access (optional)** to enter a personal access token if you need a higher request limit. The token stays in the current tab's memory, is sent only to `https://api.github.com`, and disappears on reload. It is never saved in browser storage or shared URLs. You can replace or remove it at any time.

GitHub requests are serialized. A quota response pauses further requests until the service's retry time; use the retry controls afterward or add a token. See [GitHub's rate-limit guidance](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

### Shared links

Existing `?q=react` links remain supported:

```text
?q=react&version=18.2.0
?q=react&from=18.0.0&to=18.2.0&view=changes
?q=react&from=18.0.0&to=18.2.0&view=range
?q=react&from=18.0.0&to=18.2.0&view=side-by-side&prereleases=1
```

`view=changes` is the default when no recognized view is specified. Existing `view=range` and `view=side-by-side` links keep their meaning. When comparison parameters are present, they take precedence over `version`. Invalid selections display guidance. The target must be newer than the starting version. Prereleases are excluded by default from intermediate versions; an explicitly selected prerelease endpoint is always included.

### Cache and content

Successful HTTP responses are cached in memory for five minutes, with a limit of 200 responses / approximately 20 MiB of serialized text. Oversized responses are not cached. **Refresh package** invalidates the cache and reloads the package. Changing the token purges GitHub data.

Markdown is loaded only when needed, supports tables and sanitized HTML, and resolves relative links from the repository. Scripts, embedded frames and unsafe URLs are removed. A release with an empty body, a Git tag without a release and missing notes are reported separately.

## Development

Use Node.js 24 (Node.js 22+ is supported) and Yarn 1.22.22:

```sh
corepack enable
yarn install --frozen-lockfile
yarn dev
```

Production and validation:

```sh
yarn playwright install chromium
yarn validate
```

`yarn validate` runs TypeScript, deterministic Jest tests, the production build, an initial JavaScript size budget and Playwright scenarios on desktop and mobile Chromium. Browser tests mock npm and GitHub, including HTTP errors, quotas and hostile Markdown. On a Linux CI runner, install browser system dependencies with `yarn playwright install --with-deps chromium`.

To serve an existing build or run the optional real-service smoke check:

```sh
node scripts/serve-build.cjs
# In another terminal:
node scripts/smoke-live.cjs
```

The smoke check reads public npm/GitHub data for React, Babel and Next.js; its result depends on connectivity and available GitHub quota. It does not use a token.

## Architecture

- `src/domain`: package/repository normalization, SemVer filters, comparison ranges and share-link encoding.
- `src/services`: bounded HTTP cache, cancellation, request serialization, authentication, error classification and release/changelog resolution.
- `src/hooks`: package lifetimes, per-version request deduplication, autocomplete and search history.
- `src/components`: the package browser, comparison controls, optional token settings and a lazy Markdown renderer.

The application remains a static React/Chakra UI app built with Create React App. GitHub Pages publication runs only after **Validate** succeeds on a push to `main`, using that exact revision and the existing `gh-pages` branch. No hosting-setting migration is required. Workflow publication itself must be verified on GitHub; local checks do not deploy the site.

## Limits

Release naming differs between projects. The resolver tries `vVERSION`, `VERSION`, `PACKAGE@VERSION`, and the unscoped package form. It remembers successful conventions during the session; it cannot infer every custom tag scheme. Changelog lookup checks `CHANGELOG.md`, `changelog.md`, `CHANGES.md` and `HISTORY.md` in the package directory, then the repository root. Very large files may require opening GitHub directly.

Comparisons show original release notes and GitHub commit/file data, without generating a summary. Git references come from npm publishing commit SHAs when available, otherwise resolved release tags. Monorepo Git comparisons cover the whole repository and may include other packages; this is labeled explicitly. Missing notes or references do not imply that nothing changed.

Commit results load 100 at a time. GitHub exposes at most 300 changed files for a comparison; reaching that cap displays an incompleteness notice. Use **View full diff on GitHub** to inspect the code diff. Diverged histories and identical references are identified rather than presented as a straight upgrade. See the [GitHub comparison API documentation](https://docs.github.com/en/rest/commits/commits#compare-two-commits).

Private registries, OAuth and a backend are outside this implementation.

See [validation and performance measurements](VALIDATION.md).

## License

MIT
