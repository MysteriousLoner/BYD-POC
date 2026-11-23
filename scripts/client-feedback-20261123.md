# Client feedback revision — 23 November 2026

Branch: `codex/client-feedback-20261123`, based on `7539d86`.

This revision implements the five supplied screenshot comments and the confirmed homepage reset. The older PDF's additional requests are outside this revision.

## Public behavior

- Desktop model-menu photographs use native 8:5 frames that fill without white sidebars. The enlarged menu fits two complete rows including names and prices, measured from the first six cards and recalculated after fonts load or the viewport resizes. It scrolls for later models or short screens, with 32px clearance below it; mobile MODEL remains a direct catalogue link. The seven original image files and their checksums are unchanged.
- Fresh installations start with no hero slides. The renderer omits the entire empty carousel wrapper, including its captured Elementor spacing, while retaining later campaign artwork, article cards and destination links. Staff can publish fresh slides using the existing editor.
- Contact is rendered from published managed branches: two columns at 768px and above, one below. Showroom photographs use 16:9 frames; addresses and hours wrap fully. Each branch has Google Maps and Waze actions, plus its available telephone, email and hours. The original enquiry form remains below.
- About uses the existing Cheras showroom photograph and factual copy in the approved introduction → services → vision/mission → values → enquiry sequence. No replacement photographs or commercial claims were generated.
- The shared footer keeps Facebook, Instagram and WhatsApp. Staff can configure TikTok, XHS and Google Review URLs in **Social Links**. Blank destinations hide their icons. This revision supplies no unverified profile or review URLs.
- First visits and reloads show the authentic logo for at least one second after document readiness. Internal page links share a one-second countdown across documents, holding a quick destination behind the overlay for the remainder. The overlay blocks pointer input and destination content is temporarily inert. History restores bypass the hold; cancelled navigation releases after one second. Same-page links, external destinations, downloads, form submissions and modified clicks retain native behavior. JavaScript-disabled content remains visible.

`server/public-dealership.js` owns the approved Contact/About/footer rendering exceptions. Captured source HTML remains intact, including the enquiry form used by the runtime renderer.

## Managed interfaces

Branch CRUD adds `email`, `image` and `wazeUrl`; `mapUrl` remains the Google Maps override. Existing branch metadata survives updates. The public branch response adds the display fields through an explicit whitelist and supplies address-search links when map overrides are blank. Source facts for the four initial branches are retained in `server/data/branch-details.json`, copied from the captured Contact page; saved values take precedence.

Authenticated, CSRF-protected `GET/PUT /api/admin/social-links` stores the three optional URL fields in the existing SQLite documents table. Public footers render them on the server. URLs must use HTTP(S), with no embedded credentials or unsafe schemes. Branch photographs accept public local asset/upload paths or HTTP(S) URLs.

Address-link syntax follows the official [Google Maps URL guide](https://developers.google.com/maps/documentation/urls/get-started) and [Waze deep-link guide](https://developers.google.com/waze/deeplinks). These are address searches, rather than claims that exact place IDs or navigation pins have been verified. Staff can save exact share links as overrides.

## Explicit existing-content update

Changing seed files does not reset an existing database. From `website-with-chatbot`, first preview the intended database explicitly:

```sh
DB_PATH=/absolute/path/to/existing.sqlite node server/apply-client-feedback.js
```

Review the returned fingerprint, slideshow IDs, story ID and branch IDs. Then apply that exact plan:

```sh
DB_PATH=/absolute/path/to/existing.sqlite node server/apply-client-feedback.js --apply --expected <reviewed-fingerprint>
```

The command refuses a missing database, changed preview, or legacy story `2` whose title/date do not match **BYD Seal Performance Showcase / 2026-09-12**. Before applying, it makes a consistent SQLite backup with file mode 0600 under the target database's `backups` directory. Its transaction unpublishes current slideshow records and the verified story, fills only missing branch facts, and records completion. Records and media remain recoverable. Re-previewing and applying after completion is a no-op, preserving later staff publication and edits. The command never runs at application startup.

## Verification and delivery

- 36 backend tests passed, including authentication/CSRF, URL rejection, public publication filtering, future slides, stale-plan rejection, private backup, repeat application and preservation of unrelated records.
- 14 focused Playwright checks passed: 390/768/1440px layouts, 1265×536px menu, enquiry submission, Social Links save/clear, navigation exclusions/fallback/history, reduced motion and JavaScript-disabled content. Existing homepage article and News & Events regressions passed in the same run.
- The current one-second logo hold passed nine focused browser checks, including the four timing cases, navigation recovery and the staff editor/enquiry regression. A separate ordinary navigation on the proof preview measured 1,207ms before the destination was revealed, without an artificial network delay. The preceding backend run passed all 36 tests.
- The later dropdown expansion passed its focused layout check at 1440×649, 1440×900 and 1265×536, including complete titles/prices, 8:5 images, keyboard scrolling, Escape and the mobile catalogue link. All four News & Events navigation regressions passed. The proof preview measured a 473px panel with both rows complete and 16px below their cards.
- The mechanical Impeccable detector returned no findings for the changed UI JS/CSS. This does not establish full accessibility coverage.
- Desktop/phone Contact and About, homepage, short-menu and transition captures are under `.impeccable/review/`.
- Isolated local previews run at `http://127.0.0.1:4173` and `http://127.0.0.1:4174`, using local seed/fixture databases, uploads and distinct admin cookie names. Their state was preserved when the services restarted for the timing change. Health and public routes returned HTTP 200. No existing customer data is used.

Production deployment requires separate approval. Confirm the credentials file with the user before accessing it, inspect the actual target's port allocations and Compose mappings, and explain the reviewed Git release/content plan before rollout. Preserve internal ports, persistent volumes and unrelated containers; verify application/database health and public publication results after an approved deployment.

## Release candidate validation

The user requested production deployment on 23 November 2026 after reviewing the local revisions. The final candidate passed all 36 backend tests and 13 focused browser tests together: Contact/About responsiveness, complete two-row model dropdown, staff fields and enquiry submission, one-second logo timing and recovery, JavaScript-disabled navigation, and News & Events navigation regressions. The deployment retains the existing persistent database/uploads and changes only the website service; its explicit feedback content update remains a separate reviewed transaction with a private backup.
