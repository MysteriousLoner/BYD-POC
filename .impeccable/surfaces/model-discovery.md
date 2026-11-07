---
version: 1
slug: "model-discovery"
primary_target: "website-with-chatbot/content/wordpress/models.html"
related_targets: ["website-with-chatbot/content/wordpress/compare.html", "website-with-chatbot/js/model-showroom.js", "website-with-chatbot/css/model-showroom.css", "website-with-chatbot/server/wordpress-pages.js"]
---

# Colourful BYD showroom: model discovery and comparison

## Scope and authority

The owner-approved refresh applies only to `/models` and `/compare`. Both are Operate surfaces for Malaysian car shoppers, primarily on phones: discover a published model, inspect genuine paint photography and useful facts, compare two catalogue entries, and enquire. The source WordPress header/logo, Orbitron headings, Red Hat Display/Raleway text and red capsule actions remain the visual authority. Pale blue canvases, white photographic cards and charcoal selection panels are the scoped extension. Homepage, source model-detail pages, forms and staff tools retain their existing design.

`scripts/discovery-direction.md` records the approved direction. Both emitted route templates persist the five-block implementation contract under seed `discovery-20261107-pinned`; the generator and emitted asset references must remain consistent. `DESIGN.md` and `.impeccable/design.json` hold the extracted scoped palette and reusable components.

## Catalogue job and composition

Show two substantial model cards from 768px and one below. Content is 90% wide up to 1200px, becoming 92% on phones. Cards lead with contained authentic photography, managed model type/name/price, real paint swatches, up to three available specification highlights and an Explore model action. Retain units and variant context. Sparse facts produce honest guidance rather than invented highlights.

Type filters include counts, a charcoal selected state and a live result count. Swatches select genuine colour photographs, update the colour name and support arrow keys, Home and End. The comparison entry link leads to the dedicated route. Catalogue cards have no comparison checkboxes or fixed selection tray.

## Guided comparison and results

The picker presents two explicit slots on a charcoal stage and a thumbnail model gallery. Choosing a model fills the active slot and confirms its identity/status; the other chosen model cannot be selected as a duplicate. The gallery has three columns on desktop and two on phones. Compare models becomes available once two unique published entries are chosen. Change/remove controls return to the appropriate slot.

A valid `/compare?models=id1,id2` or saved `byd-comparison` pair opens results directly. URL selection takes precedence; unknown and duplicate entries are handled without inventing a replacement. Storage errors do not prevent use. The existing pair format remains compatible.

Results preserve two aligned vehicle columns at every reviewed width. A compact charcoal identity bar sticks below the measured public header while specifications scroll. Keep the discovery-only body overflow treatment that permits sticking and preserves the mobile navigation lock. Show the union of stable specification keys in source groups, with source units and label/variant qualifiers visible. Missing values read “Not specified.” Differences-only filtering compares normalized displayed values and their context, with a recovery action when no differences remain. Different values receive a neutral informational label, never a numerical winner or ranking. Each model retains its detail and model-specific enquiry links.

## Feedback, motion and accessibility

Controls retain at least 44px targets. Blue focus outlines apply on light discovery surfaces; the charcoal picker uses a visible pale blue outline. Preserve keyboard focus after slot changes, removals and result transitions, plus live status for selection, colour and row-count updates. Loading, empty/one-model, sparse-data, unavailable-image and API-error states provide readable feedback and retry/contact actions where relevant.

Paint changes use a brief genuine-image crossfade. Filter reflow keeps surviving cards spatially continuous. A short image-to-slot transition runs only when both are visible. Reduced motion removes these animations, decorative image scaling and smooth scrolling. No decorative loops are added.

## Content, media and implementation boundary

Existing normalized catalogue data and staff publication remain authoritative. No API/schema changes, nested trim management or new assets are required. Preserve authentic studio backgrounds and all existing source media provenance; the reviewed inventory of 369 raster originals had no missing files. No generated photographs or digital vehicle recolouring are used.

The dedicated module and stylesheet load only on the two discovery routes. Shared WordPress code delegates only the catalogue and comparison feature functions. Existing authentication, CSRF, private résumé handling, staff functionality and unrelated public interactions retain their current behavior.

## Review and release record

The discovery finish reviewer returned SHIP after two fix-verdict passes. The three scoped findings were resolved: sticky identity behavior, visible keyboard focus on charcoal and persistence of the direction contract. Verification reported 25 backend tests and 26 browser tests passing, plus a catalogue/picker/results matrix at 360, 390, 605, 768 and 1440px. The latest matrix included actual Tab-focus and scrolled sticky captures at 390 and 1440px. Review captures follow `.impeccable/review/discovery-{catalogue,picker,comparison}-{width}.png`, with additional focus/sticky captures.

The detector returned an empty findings list in degraded regex mode because its parser was unavailable. This is limited mechanical evidence, not a full accessibility audit.

Local review runs on port 4189. The port 8083 server preview has not received this refresh; release remains a Git-based workflow requiring credentials-file confirmation, target port/container inspection and explicit deployment approval. Preserve live port 8082 and unrelated containers. Repository resolution against `github.com/MysteriousLoner/BYD-POC` found no registered Techmation project, so no shared canonical documentation was verified or published; this is local repository documentation.
