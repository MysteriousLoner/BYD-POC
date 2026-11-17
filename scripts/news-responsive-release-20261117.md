# News responsive refinement — 17 November 2026

The owner requested removing the mobile news banner photograph, replacing the white app background with grey, cropping desktop news images to remove their white sidebars, and showing one horizontally scrollable card per mobile news section. Target the existing production `byd-website` service on port 8082 using the previously authorized credentials and Git deployment workflow.

## Change

The public page canvas uses `--wp-canvas: #e3e5e7`. Dedicated card/form/showroom surfaces retain their own colours. Below 768px the news banner image is hidden, while its title remains. Each hub category uses a native horizontal row sized to one complete card, with snap alignment, a swipe hint and keyboard access to the remaining cards. View all still opens each complete category archive. Tablet/desktop retain category grids. News cards use cover crops from 768px, and the desktop News & Events menu also crops thumbnails to fill its frames, removing the light bars. Model preview images, full article images, all managed records and private data remain unchanged. Shared assets use `news-responsive-20261117` cache versions.

## Verification and rollout

All 31 backend tests and 9 affected browser tests passed. Coverage includes 320–1920px layouts, mobile banner visibility, grey canvas, one full-width card per mobile news section, independent native ArrowRight scrolling, keyboard focus to offscreen cards, desktop menu cover crops, sparse/empty categories, story pages, homepage article publication and navigation/error states. A final screenshot capture waits for lazy images to decode. Scoped mechanical layout scanning returned no findings.

Deploy an immutable pushed Git commit with the existing production Compose configuration and release override, retaining 8082:3000 and both persistent volumes. Inspect allocations/configuration immediately before deployment. Back up the database and uploads privately, record database/upload hashes and running container IDs, build/recreate only `byd-website`, and verify Docker/API health, archive/story links, grey background, mobile scrolling and desktop image crops. All database/upload hashes and unrelated container IDs/images must remain unchanged. Do not rerun the WordPress importer or catalogue replacement for this presentation-only release. Keep the previous image `byd-production:70b314d` and source for rollback using the existing volumes.

## Deployment completed

Commit `666c2beb03e6ec92c5e92d776abad8118c9c5e11` was deployed as `byd-production:666c2be` from `/opt/byd-production-releases/666c2be`. Docker and API health are healthy, retaining host 8082/container 3000. All four news hub/archive routes, 66 story routes and seven current model routes passed production checks. The QR slide remains unpublished.

Live browser verification confirmed all three desktop menu images are loaded with `object-fit:cover`, without light sidebars. At 390px the mobile news banner image is hidden, the canvas is `rgb(227,229,231)`, and all three category tracks have one 351px card within a 351px viewport with no page overflow. A native ArrowRight moved only the Event track to its second card (371px), leaving the other tracks at zero. Temporary viewport overrides were reset. The independent final reviewer returned Ship with no material blockers.

Every database-table and upload-inventory hash matches the pre-deployment snapshot. The 8083 preview and all unrelated containers retain their IDs/images. Private backups and verification summaries are under `/opt/byd-backups/releases/news-responsive-666c2be/`; database/upload backup files use mode 0600. No content import or catalogue replacement ran.
