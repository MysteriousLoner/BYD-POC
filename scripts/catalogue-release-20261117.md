# Sime Motors catalogue replacement — 17 November 2026

Based on production release `afaac3d`. Target: existing `byd-website` service on host port 8082, internal port 3000. The user approved deployment in this chat. Commit `adbef18d2524ba00df19057e89199913725e71c3` was deployed on 17 November 2026 from the immutable checkout `/opt/byd-production-releases/adbef18`.

## Result

Replace the managed vehicle catalogue with all seven families currently listed at https://byd.simemotors.my/: SEAL 6, THE NEW SEAL, ATTO 2, ATTO 3, DOLPHIN, M6 and 2026 SEALION 7. The fifteen variants are represented through explicitly qualified values within seven catalogue entries. Keep the existing six model IDs and add `dolphin`, preserving links and current promotion relationships.

The source model pages and their colour mappings were captured on 17 November 2026. All 95 unique photographs are local WebP assets with source URLs, checksums, dimensions and provenance under `website-with-chatbot/assets/sime-motors/`. Five ATTO 3 colour photographs had transparent margins trimmed; no photographs were recoloured or generated. Published starting prices come from the official model pages and do not represent a dealer quotation. Range uses the source NEDC basis.

Current official records use the existing managed detail shell, with their sourced gallery, colour controls, specification groups, brochure and existing enquiry form. Legacy managed records retain their prior snapshot routes. Catalogue, comparison, navigation and enquiry options all read the same managed records. Shared assets receive a new cache version. The existing noindex policy is unchanged.

## Explicit database replacement

Seed JSON is imported only on first installation. Existing deployments require the explicit command included in the image:

```
node server/replace-catalogue.js
node server/replace-catalogue.js --apply --expected <currentFingerprint-from-reviewed-plan>
```

The first command previews the replacement. The fingerprint covers vehicles and promotions; changed staff edits require a fresh reviewed plan. Apply first creates a mode-0600 consistent SQLite backup under the runtime `backups` directory, then replaces vehicle/image records transactionally. Offers for retained IDs remain intact. Retired vehicles and their associated offers are saved in a private database document before they are removed from the active collections. Branches, news, slides, staff accounts, sessions, messages, enquiries, job applications and uploads are outside the replacement.

Read-only production inspection found nine stored vehicle records, six published. Two retired IDs (`sealion6`, `shark6`) have historical offer relationships; those records and offers will be archived, leaving exactly seven vehicle entries. Integrity and production health checks passed before preparation. Ports 80, 443, 3210, 8082 and 8083 are already allocated; preserve existing host mappings, container port 3000, mounts and networks.

## Git rollout after user approval

1. Fetch the reviewed commit into a new immutable checkout under `/opt/byd-production-releases/`; do not reset or clean the dirty `/opt/byd-poc` checkout.
2. Refresh container/port allocations. Use the existing `/opt/byd-poc/docker-compose.yml` paired with this commit's `docker-compose.production.yml`, `RELEASE_TAG`, and `BYD_RELEASE_PATH`. Run configuration validation without printing resolved environment values. Retain existing persistent mounts and the previous image.
3. Build only `byd-website`. Run the catalogue preview in a one-off container without publishing ports. Compare the plan to the reviewed live inventory before applying. Run apply with that plan's fingerprint.
4. Recreate only `byd-website` with the same Compose project, files, volumes, networks and 8082:3000 mapping. Do not stop or modify the separate 8083 preview or unrelated services.
5. Wait for Docker health, then verify `/api/health`, exactly seven public models, all seven direct detail URLs, brochure/image availability, comparison and enquiry options. Check that retired models are unavailable and persistent non-catalogue collection counts are unchanged.
6. Retain the old image, source release and database backup. If rollback is needed, restore the previous image and catalogue collections only; do not overwrite newer customer submissions by restoring the full database.

## Verification

All 27 backend tests passed, including explicit backup/replacement, stale-plan rejection, relationship preservation and retired-offer archival. The 36-test browser suite passed 34 initially; two old six-model/order assertions were updated and both passed on rerun. Additional scoped checks cover the full catalogue at 360/390/605/768/1440px, genuine colour selection, complete mobile paint access, unbroken variant names, aligned brake comparisons, gallery lightbox, model switching and enquiry forms. Source asset checks verified all 95 checksums/dimensions and provenance sidecars. The scoped Impeccable detector reported no findings in degraded regex mode; this is not a full accessibility audit or physical-device test.

Local review uses a disposable database at http://127.0.0.1:4173/models and never loads production credentials or customer records. The user granted the production approval required by their AGENTS.md before rollout.


## Completed deployment verification

The production image is `byd-production:adbef18`, with Docker health `healthy` and the existing 8082:3000 mapping. The production catalogue has exactly seven published records. All seven direct model pages, all 95 images and all seven official brochure URLs are available. SQLite integrity and foreign-key checks passed. Two retired models and their two offers were archived; the five retained offers remain linked to their existing model IDs.

Before/after hashes confirmed unchanged branches, knowledge entries, campaigns, staff accounts/sessions, chat records, non-catalogue documents (including submissions) and upload files. The separate 8083 preview and every unrelated running container retained its original container ID and image.

The approved replacement created a consistent SQLite snapshot and an upload archive. Host copies are retained under `/opt/byd-backups/releases/catalogue-adbef18/` as `catalogue-before.sqlite` and `uploads-before.tar.gz`, with file mode 0600 and parent directory mode 0700. The directory also contains the reviewed plan, apply result and before/after verification summaries. The previous `byd-production:afaac3d` image and its immutable source release remain available for rollback. Restore catalogue collections only if required; do not overwrite later customer submissions with a full database restore.
