
# Release Notes Finder

**Release Notes Finder** is a web utility to quickly explore all versions of any NPM package and access their GitHub release notes, with smart search, local history, and optimized navigation.

🚀 **Live app**: [maxgfr.github.io/release-notes-finder](https://maxgfr.github.io/release-notes-finder/)

![Demo](https://raw.githubusercontent.com/maxgfr/release-notes-finder/main/.github/assets/record.gif)

---

## Features

- 🔍 **Instant NPM package search** with autocomplete
- 🕑 **Local search history** (browser-based)
- 🏷️ **Smart version filtering** (major, minor, patch, latest)
- 🗂️ **Tabbed navigation** (versions, changelog, info)
- 📝 **GitHub release notes** for each version
- 🏷️ **Monorepo support** (Next.js, etc.)
- ⌨️ **Keyboard navigation** (arrows, enter, escape)
- 🔗 **Direct links** to GitHub and NPM

---

## Usage

1. **Search**: Type an NPM package name in the search bar.
2. **History**: Click a package from your local history to reload it.
3. **Versions**: Browse versions, click to open a tab (does not auto-switch).
4. **Release Notes**: View release notes fetched from GitHub.
5. **Info**: See the NPM info card (description, author, license, keywords).

---

## Local development

```bash
git clone https://github.com/maxgfr/release-notes-finder.git
cd release-notes-finder
yarn
yarn dev
```

---

## Tech stack

- **React** + **TypeScript**
- **Chakra UI** (UI components)
- **NPM Registry API** & **GitHub API**
- **localStorage** (history)
- **Deployment**: GitHub Pages

---

## Contributing

PRs are welcome! For suggestions or bugs, please open an issue.

---

## License

MIT
