---
version: 1
slug: "website-with-chatbot-index-html"
primary_target: "website-with-chatbot/index.html"
related_targets: ["website-with-chatbot/showroom.html", "website-with-chatbot/admin-dashboard.html", "website-with-chatbot/admin-login.html"]
---

# The Open Road Showroom

## Scope and modes
Homepage and vehicle discovery/detail: Persuade. Comparison, contact, careers and manager tools: Operate. News and events: Read. English mobile web is the primary visitor usage scene; staff edit on desktop and phones.

## Visitor job and action
Understand the current published campaign, discover a BYD catalogue entry, inspect authentic colour photography and specifications, compare two entries, then enquire through a preferred published branch. Job applicants submit a résumé with their preferred branch. Staff can manage campaign order, media, timing, actions and publication, and maintain the existing catalogue and customer content.

## Visual authority and build path
The user pinned a Porsche-inspired, cinematic public direction. The current built source and desktop and phone review captures are the visual authority: `index.html`, `showroom.html`, `css/showroom.css` and `js/showroom.js`. The implementation is code-first. The public showroom uses white and graphite surfaces, authentic BYD photography, Sora and restrained red accents. The existing dark manager and sign-in system remain in place. `DESIGN.md` records the shared visual rules and the distinction between these contexts.

## Direction and first viewport
A full-height admin-managed campaign slideshow opens the homepage. Published slides follow saved priority and duration, with image, uploaded video or YouTube media that starts automatically and muted. The first configured button is the main action and additional saved buttons remain available. Dot selectors and a pause control preserve keyboard focus; motion starts paused under reduced motion. Video fills the opening viewport behind the copy. Images keep contain sizing, with the same overlaid headline and actions. A dark lower gradient protects text contrast. Missing or unavailable slides show a branded fallback and a usable model link; failed requests offer retry.

The homepage proceeds through featured vehicle imagery, dealership context and the footer. “Explore and compare models” opens `/models`, which links to the dedicated comparison page. The duplicate catalogue, campaign stage, editorial story block and closing contact banner are removed. `/models/:id` retains galleries and specifications; `/compare` retains two catalogue entries; `/events` retains category filters. `/contact` and `/careers` hold focused forms.

## Responsive decisions
Public content is capped at 1320px and occupies 90% of the viewport. At 900px the model grids become two columns; at 650px public grids collapse to one, the header labels hide, the hero action fills the content width, and the video covers the viewport behind its caption. Campaign images remain contained, including portrait artwork. The comparison selectors and values remain two columns on phones. Visitors select both vehicles on the dedicated comparison page; model cards and details have no selection controls or floating tray. Contact and careers stack their introduction and form. The manager retains its dark sidebar and accessible mobile drawer.

## Managed content and preservation
The redesign changes presentation and navigation. Existing API contracts, SQLite records, authentication, CSRF, private résumés, saved campaign timing/order/actions, publication settings and managed factual content remain authoritative. Only published records appear publicly. Prices, descriptions, specifications and legacy catalogue facts must not be invented or replaced by design copy. Legacy fields normalize into editable specifications with shared stable keys; comparisons use catalogue entries without nested trims.

Campaign `eyebrow` remains the stored field name for compatibility; the editor labels it Supporting caption and both public output and preview place it below the headline. User-provided text is content, not a new decorative kicker system. The preview contains a separate uninterrupted `previewMedia` region followed by `preview-copy`.

Legacy homepage anchors map to their focused routes while preserving the query string, including a selected model: `#models` and `#technology` go to `/models`, `#contact` to `/contact`, `#careers` to `/careers`, and `#news` to `/events`. `#about` remains the dealership section on the homepage. Managed campaign action URLs are normalized to these destinations. Legacy admin HTML URLs redirect to `/admin`.

Initial branch evidence comes from the public WordPress contact page, excluding the coming-soon location. Existing managed branch records take precedence; deletion must not trigger reseeding.

## Media provenance
Vehicle and dealership images come from the Millennium Motors WordPress media library, with sources in `website-with-chatbot/assets/sources.json` and per-image JSON records. The official BYD logo comes from `https://www.byd.com/static_material/byd/overseas/public-icon/logo.svg`. Sora comes from the Google Fonts Sora directory, is self-hosted as `assets/sora.ttf`, and retains `assets/Sora-OFL.txt` under SIL OFL 1.1. The retained Manrope asset is not used by active shells. Interface icons are authored stroke SVGs from `js/ui-icons.js` and matching inline paths.

## States and feedback
Data-dependent areas expose loading, retry, empty, unavailable and missing-specification states. Campaign rotation follows saved duration, supports dot selection and pause, pauses while offscreen, during focus/pointer interaction and hidden-tab state, and starts paused under reduced motion. Videos start automatically and muted, following saved slide timing. The pause control, offscreen state and hidden-tab state pause playback. Reduced motion starts video playback paused; background video uses labelled site pause and sound controls, with provider transport controls hidden. Browser-blocked autoplay shows recovery text.

Comparison allows at most two unique entries, persists selection and removes unavailable models. Failed forms preserve entered details. Branch loading errors disable submission and offer retry. Event portrait/square warnings are advisory, preserve originals and allow saving; browser/API orientation handling remains intact. The manager's Add story action reveals and focuses the editor. Feedback uses readable status text, visible focus and contextual error/success treatments.

## Staff inboxes
Enquiries and Job applications are authenticated, read-only, searchable and paginated at 25 records per page. Staff can open details, retain search and page when returning, and download private résumés. Legacy records, missing fields, missing attachments, errors and empty lists have explicit states. The dark manager has grouped navigation, consistent labelled controls, immediate-save slide ordering, collapsible preview and mobile edit focus. Existing publication controls, branch management, event warnings, conversation management and public forms remain supported.
