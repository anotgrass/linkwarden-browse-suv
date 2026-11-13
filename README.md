# Linkwarden Browse (SUV)

**Strictly Using Vibecoding** fork of the [Linkwarden browser extension](https://github.com/linkwarden/browser-extension).

Browse collections and links in a drill-down popup, then save the current page to your Linkwarden instance. This is **not** the official store extension.

| | Official Linkwarden | This fork |
| --- | --- | --- |
| Focus | Save links | Browse + save |
| Firefox id | store listing | `linkwarden-browse@local` |
| Distribution | Chrome / AMO listed | Self-distributed (signed, GitHub updates) |

Repo: [anotgrass/linkwarden-browse-suv](https://github.com/anotgrass/linkwarden-browse-suv)

## Features

- Browse collections with drill-down navigation
- **All** / **Pinned** / **Collections** / **Tags** on the main view
- Search links
- **Add Site** with the same collection picker
- Rename / delete collections (full manage UX lives in your Linkwarden dashboard)
- Open, pin/unpin, edit metadata, delete links; copy URL
- Favicons (toggle in settings)
- Context menu: save page / save all tabs
- Omnibox keyword `lw`
- Sign in with API key (or username/password where supported)

## Install (Firefox, permanent)

1. Download the latest `.xpi` from [Releases](https://github.com/anotgrass/linkwarden-browse-suv/releases).
2. Firefox → `about:addons` → gear → **Install Add-on From File…** → pick the `.xpi`.
3. Open the toolbar popup → gear → set your Linkwarden URL + API key.

Updates are automatic via `update_url` → [`firefox/updates.json`](firefox/updates.json) on this repo.

Temporary load (`about:debugging`) still works for development but does not survive restarts.

## Develop

Requires **Node.js 20+** and **npm** (this fork uses npm, not Yarn).

```bash
git clone https://github.com/anotgrass/linkwarden-browse-suv.git
cd linkwarden-browse-suv
npm install
npm run build
```

Load `dist/manifest.json` as a temporary add-on in Firefox, or:

```bash
npm run dev:firefox
```

Other scripts:

```bash
npm run pack:firefox   # build + zip for AMO upload
npm run sign:firefox   # build + Mozilla unlisted sign (needs WEB_EXT_API_KEY / WEB_EXT_API_SECRET)
npm run lint:firefox
npm run e2e            # Playwright (Chromium + a running Linkwarden)
```

## Firefox release checklist

1. Bump `version` in [`manifest.config.ts`](manifest.config.ts).
2. `npm run sign:firefox` (or upload the pack zip to AMO **On your own** and download the signed `.xpi`).
3. Create a GitHub Release `vX.Y.Z` and upload `linkwarden-browse-X.Y.Z.xpi`.
4. Append that version to [`firefox/updates.json`](firefox/updates.json) on `main`.

## Safari / Chrome

Shared `dist/` build also loads in Chromium. Safari: `npm run build:safari` then open the Xcode project under `safari/` (same caveats as upstream).

## Upstream

Based on [linkwarden/browser-extension](https://github.com/linkwarden/browser-extension). Issues for *this* fork belong on [anotgrass/linkwarden-browse-suv](https://github.com/anotgrass/linkwarden-browse-suv/issues), not the Linkwarden core tracker.
