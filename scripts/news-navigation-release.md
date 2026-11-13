# News & Events desktop hover preview

13 November 2026. Branch: `codex/news-hover-20261113`, based on saved release `995bd04` (including the direct mobile MODEL link).

The source checkout had cloud-offloaded files. Work continues from an independent clean Git clone of that exact pushed branch, preserving the previous checkout. No credentials were copied into the new checkout or test preview.

## Behaviour

- Desktop News & Events hover/focus and its separate arrow open the same compact dark preview shell as models: a full-width background, centred 808px grid and a maximum 360px/55dvh height.
- Show up to three published stories, newest date first, from the existing public news API. Retain genuine image, title, category and date; use the local story route and retain source records unchanged.
- Contain the complete artwork in its thumbnail. Limit visible title height to two lines, retaining the full accessible link name. Missing images use the existing placeholder.
- Provide a View all news & events archive link throughout loading, empty and error states, plus retry on errors.
- Both desktop preview menus share mouse/keyboard behaviour and remain mutually exclusive. Closing a previous hover no longer dismisses the newly opened sibling.
- On phones and tablets up to 1024px, News & Events and MODEL remain direct page links without arrows or preview panels. Do not fetch hover news on mobile.
- Keep the registration action on one line at compact desktop widths.
- Update all 81 compiled headers and shared asset references, plus the importer. Asset version: `news-20261113b`. Existing Docker copies include these assets without interface changes.

## Verification

The four new browser checks cover published/latest ordering, direct links, archive navigation, pointer transit, switching previews, keyboard focus/Escape, outside dismissal, error retry, empty/legacy data, missing images, long titles, full-width background and bounded content at 1100/1440/1265/1920 desktop widths, and direct mobile navigation at 360/390/605/768/1024px. Layout-only tests reuse real public API snapshots without changing application rate limits. Other mutation/publication/form regressions still call the API.

Rendered evidence is gitignored under `.impeccable/review`: `news-preview-{1100,1440,1265,1920}.png` and `news-direct-mobile-390.png`. No new shipping raster assets were created, and no physical-device check is claimed.

The full backend suite passed 25 tests and the full browser suite passed 36 tests. After the final asynchronous focus/retry hardening, all 10 navigation checks passed again. The single scoped detector returned no findings; desktop/mobile rendered reviews were completed. These checks do not claim a full accessibility audit or physical-device testing.

## Rollout

Prepared for a separate Git-based deployment to the existing 8083 preview. Keep 8082 untouched, retain preview data/uploads, inspect current ports/mappings, and obtain deployment approval before changing the server. This change has not been deployed.

## Production promotion

Use `docker-compose.production.yml` alongside the existing production Compose file, with `RELEASE_TAG` and `BYD_RELEASE_PATH` set to an immutable Git checkout. The override changes only the build context and versioned image. It retains the existing production environment file, host port 8082, internal port 3000, runtime/upload volumes, read-only seed bind and network. Build and test against copied live data before recreating only the production website service. Keep the old image, original server checkout and a protected database/uploads backup available for rollback. Port 8083 is a separate preview and is not changed by this promotion.
