# Verified social link prefill — 23 November 2026

The owner requested public web research, prefilled social settings, updated documentation and production application. The existing Social Links editor and shared public footer already support these destinations. This is a managed-content deployment from Git; the running application image and ports do not need to change.

## Destinations and evidence

| Setting | Destination | Verification |
| --- | --- | --- |
| TikTok | [@bydmillenniumauto](https://www.tiktok.com/@bydmillenniumauto) | The [dealership Linktree](https://linktr.ee/bydmillenniumautobeyond) links this account and the original dealership website. Its current HTML was checked; tracking parameters were removed. TikTok blocks automated profile access, so attribution relies on the dealership's own link. |
| Google Review | [Cheras review form](https://search.google.com/local/writereview?placeid=ChIJKV3cTlY1zDERz_EltbSQ7cA) | [Google Maps](https://www.google.com/maps/search/?api=1&query=BYD+Cheras+Millennium+Motors&query_place_id=ChIJKV3cTlY1zDERz_EltbSQ7cA) displayed **BYD Cheras - Millennium Motors** and street number 691, matching the [official Contact page](https://millenniumautobyd.com.my/home/contact/). The review URL uses that verified place ID. A signed-out browser reaches Google sign-in with the review destination retained. |
| Rednote / Xiaohongshu | Blank; icon hidden | The [dealership M6 brochure](https://millenniumautobyd.com.my/home/wp-content/uploads/2024/12/BYD-M6-brochure-NOV-2024-2.pdf) names **BYD Millennium 千禧**. No direct profile URL was verified on the dealership site, Linktree or public web search, and the owner had no URL to supply. A name alone is insufficient to publish a profile link. |

The footer has one Google Review field; the prefill explicitly selects the main Cheras showroom, rather than implying that Google reviews apply to the whole group. No review was posted. Staff can replace either destination or clear it to hide its icon. The URL/provenance record is `website-with-chatbot/server/data/social-links-verified-20261123.json`.

## Explicit content operation

Run from `website-with-chatbot` against an existing database:

```sh
DB_PATH=/absolute/path/to/byd.sqlite node server/prefill-social-links.js
DB_PATH=/absolute/path/to/byd.sqlite node server/prefill-social-links.js --apply --expected <reviewed-fingerprint>
```

Preview reports only the fields eligible for prefill. Apply rejects a changed fingerprint, makes a consistent mode-0600 SQLite backup, fills only blank fields with verified destinations, and records `social-links-prefill-20261123.json` in documents storage. Existing saved values, including a staff-supplied Rednote URL, take precedence. The completion marker prevents a later replay from undoing staff edits or clearing. The command never runs at startup and does not change news, slides, branches, uploads, submissions, credentials or accounts.

For this content-only production release, fetch the pushed commit into an immutable Git worktree with readable source permissions. Inspect the current Docker/port configuration and take protected-data/container inventories first. Use the current website image in a one-off container with no network or published ports, its existing runtime volume, and read-only bind mounts for this commit's prefill script and verified JSON. Review the preview before applying its exact fingerprint. Keep backups private, preserve the website and every unrelated container, and verify health, document changes and the footer afterward. Never reapply the older client-feedback reset for this operation.

## Local verification

Both local previews were prefilled after their own private backups. The Social Links editor shows the TikTok and Cheras Google Review URLs, with Rednote blank. Five public routes show the same two added icons; Rednote remains hidden. Desktop and 390px phone captures retain readable, usable social controls without horizontal overflow.

Six focused backend tests passed, including authentication/CSRF, safe URL handling, a stale prefill rejection, mode-0600 backup creation, preservation of saved destinations and later staff clearing. The existing staff editor/enquiry browser regression also passed. Evidence and the short update document are under `output/social-links-20261123/`.
