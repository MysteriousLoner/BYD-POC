# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Malaysian car shoppers browsing on phones, job applicants, and staff maintaining dealership content.

## Product Purpose
Reproduce the public Millennium Auto BYD website faithfully within the existing application while helping visitors choose a model, inspect real colour photography/specifications, compare two catalogue entries and enquire through a preferred branch. Let applicants submit a résumé with a preferred branch. Present published showroom contact details and clear directions, with staff control over branch facts and optional social destinations.

## Capabilities and Constraints
Existing HTML/CSS/JavaScript, Express, Node 24+ and SQLite remain in place. Preserve managed publication, legacy specifications, authentication, CSRF and private résumés. Comparison uses catalogue entries without nested trims. English UI. Event orientation warnings remain advisory. No public chatbot is added. Staff can maintain branch address, phone, email, hours, photograph and direction links; authenticated Social Links settings control optional TikTok, XHS and Google reviews destinations. Empty optional destinations stay hidden in the public footer.

The original reproduction kept the live port 8082 service untouched. The separate Docker preview uses port 8083, independent volumes, a separate admin session cookie name and fresh public seed data; it contains no live enquiries, applications, résumés or conversations. The preview is noindex. See WORDPRESS-PREVIEW.md for startup and isolation boundaries. The approved catalogue release `adbef18` was deployed to production port 8082 on 17 November 2026; see scripts/catalogue-release-20261117.md. The approved client-feedback release `2514af6` was deployed to the same service on 23 November 2026, including the one-second logo and complete two-row model menu; see scripts/client-feedback-20261123.md for the verified rollout.

## Brand Commitments
The owner selected https://millenniumautobyd.com.my/home/ as the public visual and content authority, replacing the prior Porsche-inspired direction. Preserve its genuine combined BYD/Millennium logo, charcoal header, red capsule actions, Orbitron headings, Red Hat Display/Raleway text, the source visual language and authentic native imagery. Catalogue/comparison remain light; enquiry/employment forms use charcoal with white labels and readable statuses. Keep the existing dark Sora staff manager separate. No fabricated facts or digitally recoloured vehicles. The owner-approved `/models` and `/compare` exception uses a pale blue showroom catalogue and guided two-model comparison with the same typography, logo, red actions and genuine photography. On 23 November 2026, the owner also approved runtime Contact and About compositions, a shared footer with optional social links, filled desktop model-menu imagery, an initially empty homepage hero and a branded navigation overlay. The later approved timing change requires a one-second minimum on first visits, reloads and ordinary internal navigation, with immediate history restoration. These changes retain the Millennium identity; their surface scope is recorded in `.impeccable/surfaces/website-with-chatbot-index-html.md`.

## Evidence on Hand
Compiled source pages in website-with-chatbot/content/wordpress include six rich model pages, About, Contact, Careers and 63 captured article/news/event posts. Source captures and direction are recorded in scripts/wordpress-direction.md and WORDPRESS-PREVIEW.md. Local source assets include 517 manifest entries and 369 raster images, with source manifests and self-hosted font OFL licenses. No generated photographs are used.

The deployed Sime Motors catalogue contains seven official model families and fifteen variants expressed in qualified fields, preserving six existing IDs and adding `dolphin`. Its 95 genuine local photographs and colour images have provenance in website-with-chatbot/assets/sime-motors/sources.json.

Long model marketing sections and original article bodies are compiled source snapshots, without automatic WordPress synchronization. The captured About, Contact and footer markup remains unchanged on disk; `server/public-dealership.js`, applied by `server/wordpress-pages.js`, owns the approved runtime replacements. Contact shows published managed branch cards above the original enquiry form. About uses the authentic Cheras showroom photograph, introduction, services, vision/mission, six values and enquiry action. The shared footer retains Facebook, Instagram and WhatsApp alongside configured optional social links. Official catalogue records use the existing managed detail template with colour selection, specifications, brochure, gallery and the existing enquiry form; legacy records retain imported marketing snapshots. SQLite controls the managed catalogue, colours/specifications, publication, campaign slides, archive cards, branches and form submissions. Editing a managed description does not rewrite an imported marketing page. Existing managed branch records take precedence over the initial public-source seed; the coming-soon location is excluded.

New seed data has no hero slides. When no slides are published, server rendering removes the complete opening-slider wrapper and its spacing while retaining later campaign banners, FAQs and destination links. The slide editor and future publication remain available. The one-time feedback update for existing databases uses the explicit `server/apply-client-feedback.js` preview/apply command: it requires the reviewed content fingerprint, creates a private database backup, unpublishes existing hero slides and verified legacy story `2` (BYD Seal Performance Showcase, 12 September 2026) once, and backfills only missing branch facts. A completion marker prevents replay; startup does not reset staff changes. See `scripts/client-feedback-20261123.md` for operation and release instructions; this is not a record of production application.

## Product Principles
- Preserve the source website's brand and authentic imagery while improving phone tasks within the documented owner-approved layout exceptions.
- Keep managed factual content and publication under staff control, with snapshot boundaries explicit.
- Make model selection, dedicated comparison, enquiry and employment submission usable on phones.
- Show useful errors without discarding entered form details.

## Accessibility & Inclusion
Keyboard navigation, visible focus, labelled fields, 44px touch targets, reduced motion and readable contrast. Mobile navigation is scrollable, source numeric specifications stack label/value at full width, gallery/specification interactions remain operable and comparison retains aligned entries.

Verified social content as of 23 November 2026: the explicit Git-tracked prefill supplies TikTok `@bydmillenniumauto`, sourced from the dealership Linktree, and the Google review form for the verified Cheras showroom. Rednote/Xiaohongshu remains blank and hidden: the dealership brochure names BYD Millennium 千禧 but no direct profile URL was verified or supplied. Saved staff destinations and subsequent clearing take precedence; prefill is never run at startup. See `scripts/social-links-20261123.md` and `website-with-chatbot/server/data/social-links-verified-20261123.json` for source evidence and operation.
