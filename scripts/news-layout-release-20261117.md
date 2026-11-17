# News layout repair — 17 November 2026

The user explicitly requested fixing and deploying the deformed production news page. This code-only release follows catalogue release `adbef18` and targets the existing `byd-website` service on port 8082, preserving container port 3000, volumes, networks and the separate 8083 preview.

## Change

The news hub and Event/Press/Article archives now use `server/news-pages.js` for stable document flow within the incumbent header/footer. The genuine existing banner photograph is retained. Its heading stays inside the desktop banner and moves into a charcoal title band above the complete image on phones. Category headings, sparse card grids and empty states no longer depend on captured Elementor offsets or masonry sizes. Portrait, square and landscape artwork is contained in consistent 16:9 frames without cropping. Cards retain the existing publication/date/category rules and current records.

Generic managed story pages receive the real story document title rather than the unavailable-template title, and a bounded image. Existing imported article bodies remain in their source templates. Styles are scoped to news/story surfaces; shared assets receive `news-layout-20261117` cache versions.

## Verification

All 28 backend tests passed. Two new browser tests passed across 360/390/768/1024/1440/1920px, covering sparse records, long headlines, empty categories, portrait/square media, bounded complete images and current story titles. All 16 existing news-navigation and WordPress browser regressions passed, including the catalogue/comparison and enquiry/application paths. Local screenshots use explicit test fixtures and disposable databases. The independent layout reviewer returned Ship subject to those regression checks, which then passed. Scoped mechanical checks returned no findings; the initial scan reported degraded regex mode, so this is not a full accessibility audit.

## Git rollout

Inspect current allocations and preserve 8082:3000. Clone the pushed immutable commit into a new `/opt/byd-production-releases/<commit>` checkout. Pair its `docker-compose.production.yml` with `/opt/byd-poc/docker-compose.yml` using the same `byd-poc` Compose project. Validate configuration without printing environment values. Back up the database and uploads, record database/upload hashes and running container IDs, build only `byd-website`, then recreate that service only. Verify Docker/API health, news hub/category/story URLs, asset versions, unchanged database/upload hashes, seven published models and unchanged unrelated container IDs.

No content migration is part of this release. Do not run `server/replace-catalogue.js`; existing models, offers, news and customer records must remain unchanged. Retain the previous production image and source for rollback using the same persistent volumes.
