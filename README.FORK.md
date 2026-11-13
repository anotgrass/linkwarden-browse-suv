# Linkwarden Browse (personal fork)

Browse-first Firefox extension forked from Linkwarden’s official extension.

## Features

- Opens to **Browse** (collections + links); **Add Site** in the header
- Search, All / Pinned / Collections / Tags filters
- Favicons (toggle in settings: Show link icons)
- Open, edit, delete, pin/unpin, copy URL
- Drag to reorder links (in a collection) and root collections
- Drag a link onto a folder to move it
- Create / rename / delete collections
- Bulk select + multi-delete
- Polished context menu: **Save to Linkwarden** / **Save all tabs**
- Toolbar popup only (no Firefox sidebar)

## Develop / load in Firefox

```bash
cd linkwarden-extension
npm install
npm run build
```

Then: `about:debugging` → This Firefox → **Load Temporary Add-on** → `dist/manifest.json`.

Configure instance URL + API key via the gear icon.

Extension id: `linkwarden-browse@local`

## Next (deferred)

Native Firefox bookmark sync with Linkwarden (high priority follow-up).
