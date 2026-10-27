# BYD sales assistant

Node 24+, SQLite, Express and the OpenAI JavaScript SDK. The SDK also connects to DeepSeek's compatible Chat Completions endpoint. The active deployment uses DeepSeek as requested.

## Configuration

Copy `.env.example` to `.env`, fill the provider key and a random admin password of at least 12 characters, then run `docker compose up -d --build`. Never commit `.env`. `AI_PROVIDER=deepseek` uses `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`; `AI_PROVIDER=openai` uses `OPENAI_API_KEY` / `OPENAI_MODEL`. OpenAI uses Responses with `store:false`. DeepSeek uses JSON mode with server-side schema/source validation; provider retention policies are separate from application storage.

`PUBLIC_ORIGIN` must exactly match the URL used by admins. Set `COOKIE_SECURE=true` after enabling HTTPS. `TRUST_PROXY` accepts explicit proxy addresses/CIDRs only; leave it empty for direct access. No public request can alter content without an admin session and CSRF token. The first startup creates the account from environment credentials; subsequent startups do not reset its password.

## Persistence and migration

Docker volumes `byd-runtime` and `byd-uploads` contain the database and media. JSON is imported once during migration 1; deleting records does not re-import them on restart. The current deployed JSON and uploads must be backed up and copied before the first migration. Promotions without a catalogue vehicle get a hidden placeholder vehicle, preserving the offer without fabricating specifications. Complete and publish these vehicles in admin if appropriate. Existing hidden vehicles stay hidden. Missing warranty, branch and other knowledge is not invented: add approved facts under Sales Knowledge and Branches.

Public form submissions are stored separately in SQLite and are never sent to AI. Résumés are not served by the public upload route. Marketing slides/news are excluded from chatbot knowledge.

## Backups and rollback

Use `node server/backup.js /app/runtime/backups/byd-YYYYMMDD-HHMMSS.sqlite` inside the container for a transactionally consistent snapshot. A host job should copy the snapshot and `/app/uploads` to a root-readable archive outside the container. Keep daily archives for 30 days; then delete only the dated `byd-*.tar.gz` files in the dedicated backup directory. Do not run `docker compose down -v`.

Chat records persist until an administrator deletes them. Backups retain deleted content until their 30-day expiry. Audit records contain administrator ID, action, count and timestamp, never deleted transcript text or IPs.

Before rollout, preserve the previous Docker image and application directory. Roll back with the preserved Compose directory/image and original data; do not replace or erase new database volumes. Admin content written after migration exists in SQLite and must be retained for later recovery.

## Verification

`cd website-with-chatbot && npm ci && npm test`. Tests use temporary databases and a mock AI provider, not production records. `/api/health` reports database availability and whether an AI key is configured, not whether the provider key has balance. Check a real reply and its completed status in admin after rollout.

The assistant reads published database records on every turn and keeps the last ten server-stored messages as context. The API assigns UUID conversation IDs and binds them to a random HttpOnly browser cookie. Knowing a conversation ID alone cannot access or append to it. No public transcript retrieval endpoint exists.

Provider outage, invalid/unsupported output, refusal or timeout produces a recorded safe fallback. HTTP rate limits and input validation reject requests before they create conversations. Sessions and chat requests have no cross-process rate-limit sharing; the deployment is a single app instance.

## Mobile showroom update

The public entrypoint remains `/`. Vehicle details are direct links at `/models/:id`,
comparison at `/compare?models=id1,id2`, and stories at `/events`. Express explicitly
serves these pages; Docker includes `showroom.html` and local `assets/`.

Vehicle records add `colours` (id, name, six-digit swatch, images) and ordered
`specifications` (key, label, value, unit, group). Existing range/acceleration/power/
battery fields are normalized on reads and mirrored when edited. Reuse a stable
specification key across cars; changing labels does not require changing keys.
The vehicle editor accepts hosted URLs, local asset references, and colour-specific
uploads. Colour images must depict the actual selected colour.

News & Events in admin manages the existing news collection. Portrait and square
image warnings recommend landscape photography and preserve the original upload;
saving remains available. The API reads EXIF orientation for uploaded image dimensions.
The public event cards show a 16:9 crop. Video hero slides remain editable; public
campaigns rotate in priority order using each saved duration, with pause and manual
navigation. Video slides play only when requested and pause campaign rotation.

Migration 2 seeds the four sourced branch records only when the branch table is
empty, and records the migration even when branches already exist. Deleted branches
are never automatically recreated. Job applications now require a published branch
ID and store its name at submission time. Historical submissions remain unchanged.
No new submissions or résumés are exposed by the public API.

Existing databases keep their models, media and publication state. Updated JSON
seed imagery is imported on a fresh installation only; use the vehicle and event
editors to update an existing installation. New local photography and provenance
are in `website-with-chatbot/assets/sources.json`; Sora is self-hosted with its OFL; the BYD mark comes from the official BYD website.

Before rollout, back up the SQLite database and upload directory as described above.
Build the new image, verify `/api/health`, model direct links, `/events`, the admin
editors and a test application, then retain the existing persistent volumes. Rollback
can use the previous image with the same additive JSON records and branch migration.
Do not erase the database or uploads during rollback.

### Browser verification

Run `npm ci`, `npm test`, and `npm run test:browser` in `website-with-chatbot`.
Browser checks use an isolated temporary SQLite database and upload directory and
never load `.env` or production records. The test server uses exclusive port 4187 and refuses to reuse an existing server; the review preview uses port 4173. On macOS they use installed Google Chrome;
otherwise run `npx playwright install chromium` first, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a compatible browser executable. The screenshot
review covers 360, 390, 605, 768 and 1440px widths and the affected mobile editors.

For a local review preview, run `node test/preview-server.js`; it listens on
`http://127.0.0.1:4173` with temporary data. Its admin credentials are test fixtures
in that script and must never be used for deployment.

### Dark public and manager surfaces

`/models`, `/contact` and `/careers` use the shared `showroom.html` route shell,
along with model detail, comparison and events. The Docker image already copies
that shell and the complete CSS/JS/assets directories. Active styles are
`tokens.css` plus scoped `showroom.css` or `admin-showroom.css`; the old manager
override stack is no longer loaded. CSS and script URLs carry a release version.

Legacy homepage anchors for models, contact, careers, news and technology route
to dedicated pages; model query parameters survive the redirect. Published
records and all existing API payload shapes remain unchanged.

The dark release is staged under `/opt/byd-releases/dark-20261026-2130`, with
backup data under `/opt/byd-backups/releases/dark-20261026-2130`. Its prepared
`rollback.sh` switches the image and source back while retaining runtime and
upload volumes. Do not remove either volume during a rollback.
