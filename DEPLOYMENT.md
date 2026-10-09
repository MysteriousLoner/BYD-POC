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
