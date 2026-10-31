# WordPress public-site preview

Branch: `codex/wordpress-site-20261031`.

This branch reproduces the public Millennium Auto BYD WordPress website inside the existing Express/SQLite application. It retains the source header, logo, typography, page order, six rich model pages, About, Contact, Careers and all 63 captured news/event/article posts. The native WordPress runtime, trackers and forms are replaced with app-owned accessible interactions and private submissions. It does not modify the WordPress server.

## Added app features

- `/models`: published managed catalogue, linked from the MODEL menu.
- `/compare`: two catalogue entries, stable-key specification alignment, saved selections and missing-value handling.
- `/models/:id`: original WordPress marketing/colour/specification/gallery content plus a managed model selector, comparison link and managed catalogue specifications. Source variant tabs remain informational; comparison uses catalogue entries.
- Enquiry/test-drive and employment forms retain source fields/consent wording, add the managed preferred branch, and save to the existing staff inbox. Résumés require an authenticated staff download.
- Existing `/admin` remains available with campaign, vehicles, events, branches and submissions management.

Original source marketing pages are compiled snapshots. Managed colours/specifications, catalogue, publication, campaign slides and archive cards come from SQLite. Editing a model's description does not rewrite the imported long marketing page; reimport or edit its compiled source for those sections. Managed news publication controls apply to direct imported stories and archive cards; original article bodies remain snapshots. New managed articles use a generic page. The preview is noindex. Its admin session cookie has a separate name so logging in on port 8083 does not replace the live-site session cookie.

## Run and verify

Requires Node 24+.

```sh
cd website-with-chatbot
npm ci
npm test
npm run test:browser
node test/preview-server.js
```

`scripts/wordpress-smoke.cjs` runs inside a disposable Docker preflight container and creates synthetic enquiry/application records. It verifies copied routes/assets, private downloads and isolated login cookies. Discard that container after verification; start the persistent preview with fresh volumes.

The isolated local preview creates temporary SQLite/uploads and never reads `.env` or production data. Browser tests exercise submissions against this disposable data only.

For a persistent server preview, create a root-only `.preview.env` with `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `PUBLIC_ORIGIN=http://72.62.75.216:8083`. Then use the separate Compose project:

```sh
RELEASE_TAG=<git-commit> docker compose -p byd-wordpress-preview -f docker-compose.preview.yml up -d --build
```

This creates independent volumes and seeds public source content. Do not mount production volumes or copy customer submissions into the preview. Stop only the preview with the same compose project/file. Production on port 8082 remains independent. To roll back this separate preview, run `docker compose -p byd-wordpress-preview -f docker-compose.preview.yml stop`; this leaves production and preview volumes intact. Admin traffic remains HTTP, as previously chosen, with its existing console warning.

## Source import and assets

Source authority: https://millenniumautobyd.com.my/home/ . Captured public pages are recorded in `website-with-chatbot/content/wordpress/index.json`. Source asset URLs and optimized file hashes are recorded in `assets/wordpress/sources.json`; catalogue images have their own manifest. Source photographs are optimized, never digitally recoloured. Fonts are self-hosted with OFL licenses under `assets/wordpress/licenses`.

`node scripts/import-wordpress.cjs` rebuilds the compiled copy from local browser captures in ignored `wordpress-source/` and the earlier verified catalogue import at `../BYD-POC/catalogue-import-20261027/`. These inputs are intentionally not included in Docker or needed at runtime. They contain public page captures only. After importing, run `node scripts/wordpress-provenance.cjs` with `IMPECCABLE_EMBED_SCRIPT` pointing to Impeccable's `embed-prompt.mjs`. WebP provenance uses the utility's supported JSON sidecar; PNG provenance is embedded. Existing logo/photography ownership is retained by the source owners; font licenses are included. This repository is the user's authorized reproduction, not a grant to reuse the brand assets elsewhere.

Source Facebook emoji images are replaced by their original Unicode alt text. Public styles and photos are local. Embedded maps/videos and external social links still use their providers.
