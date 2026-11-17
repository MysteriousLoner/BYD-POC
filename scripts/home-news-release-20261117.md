# Homepage and WordPress news content — 17 November 2026

The owner requested fixing the inconsistent homepage/News & Events content and removing the QR post from the live homepage. Target only the existing `byd-website` service on port 8082. Preserve the 8083 preview and unrelated services.

## Content and behavior

The 63 bundled WordPress posts match a fresh read of the original Event (54), Press (6), and Article (3) archives by source URL, title, category and publication date. All local card images and full story templates exist. The explicit `server/sync-wordpress-content.js` CLI merges missing posts by ID/source URL, preserving existing staff posts, imported edits and publication choices. It never runs at startup. It rejects conflicting IDs, changed QR media and stale plans, takes a consistent private SQLite backup, and applies changes in one transaction.

The reviewed `old-klang-road` hero record contains the standalone QR upload ending in `forms.gle_m1weXED7gzxSG7QY8.png`. Unpublish that record while preserving its media and all other slide fields. Existing production has three other news records, so the expected result is 66 records: 56 Events, 7 Press, and 3 Articles.

Homepage FAQs now render the same publication-filtered, date-ordered Article cards used by News & Events, with direct local story links and an article archive link. Keep the source charcoal background, white cards, brand typography and all other homepage campaign banners. Source article bodies remain compiled snapshots, with managed cards/publication; there is no background WordPress synchronization. Shared CSS/JS cache version is `home-news-20261117`. Catalogue records and exact Sime Motors model/menu images are unchanged.

## Validation and rollout

All 31 backend tests and 7 relevant browser checks passed, including news geometry, story routes, slideshow publication, archive links, homepage articles at 390/768/1440px, and an isolated admin publication roundtrip. Final targeted homepage checks also assert readable date/button colours. Tests use disposable local data and fixture credentials. Mechanical layout scanning reported no findings in degraded regex mode; it does not establish full accessibility coverage.

Use an immutable pushed Git checkout and the existing production Compose configuration with `docker-compose.production.yml`. Before deployment, inspect allocations/configuration and retain host 8082/container 3000 and both persistent volumes. Back up SQLite and uploads privately, retain the old image/source, recreate only `byd-website`, preview the importer, then apply its exact fingerprint. Verify health, all source story/image routes, expected categories, homepage Article links, unpublished QR, preserved staff posts/private collections/uploads, and unchanged unrelated container IDs/images. Do not run catalogue replacement or reset the dirty `/opt/byd-poc` checkout.
