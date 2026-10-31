---
version: 1
slug: "website-with-chatbot-index-html"
primary_target: "website-with-chatbot/content/wordpress/home.html"
related_targets: ["website-with-chatbot/content/wordpress", "website-with-chatbot/css/wordpress.css", "website-with-chatbot/js/wordpress.js", "website-with-chatbot/server/wordpress-pages.js", "website-with-chatbot/admin-dashboard.html", "website-with-chatbot/admin-login.html"]
---

# Millennium Auto BYD WordPress public copy

## Scope and modes
Public home/model marketing: Persuade. News and source articles: Read. Catalogue, dedicated comparison, enquiry/test-drive, employment and staff tools: Operate. Phone browsing is the primary public usage scene.

## Visitor job and action
Discover the current BYD offer, choose a published catalogue model, inspect authentic colour photos, specifications and gallery, compare two entries, then enquire through a preferred branch. Applicants submit employment details and a résumé. Staff manage catalogue facts, publication, slides, archive cards, branches and private inboxes.

## Visual authority and build path
The owner explicitly replaced the earlier Porsche direction with a faithful copy of https://millenniumautobyd.com.my/home/. scripts/wordpress-direction.md records the code-led direction. Compiled pages in content/wordpress, source-local theme assets and css/wordpress.css now define the public world; js/wordpress.js owns the replacement interactions. The previous index.html/showroom shell is not the public entrypoint. server/wordpress-pages.js serves the compiled home at / and redirects /index.html to /. DESIGN.md documents the extracted system.

## First viewport and source composition
The sticky charcoal header carries the genuine combined BYD/Millennium logo, desktop links, model submenu and red registration capsule. The managed hero inherits the source's Orbitron heading and native vehicle image composition. It is followed by original full-width campaign/model banners, FAQ article cards, image-backed destination links and footer. Preserve the complete linked source layout for model marketing, About, Contact, Careers and news archives. New catalogue/comparison surfaces use light backgrounds and the same brand typography/actions. The public interface adds no chatbot.

## Responsive decisions
At 1024px navigation becomes a labelled 44px menu control and scrollable charcoal panel; catalogue moves from three columns to two. At 767px catalogue and form name fields become single-column; catalogue sections use 42px vertical padding; form submit fills the available width. Hero copy moves toward the bottom with separated slide controls. Comparison remains two aligned columns with contained photos and wrapped values. Original model numeric specification cells stack full-width label/value on phones; colour tabs, gallery and specification controls stay accessible. Tablet news banner titles remain inside their image. Charcoal forms use white labels, light supporting copy and high-contrast success/error text.

## Managed content and snapshot boundaries
SQLite remains authoritative for managed catalogue entries, colours/specifications, publication, slides, archive cards, branches and submissions. Original long model marketing sections and source article bodies are compiled snapshots; no automatic WordPress sync exists. Managed description edits do not replace imported marketing copy. Source variant tabs are informational; comparison uses catalogue entries with shared stable specification keys, at most two unique selections and explicit missing values. Publication rules apply to imported direct routes and archive cards. New managed stories use a generic page. Preserve authentication, CSRF, private résumé storage and existing admin tools.

## Interactions and feedback
Small app-owned interactions replace the WordPress plugin runtime: responsive menu/submenus, ordered slideshow, authentic colour switching, specification tabs and modal gallery. Slides follow saved timing, with labelled controls and reduced-motion behavior. Data errors, unavailable/empty content and form status remain readable; unsuccessful forms retain input. Branch-load failure offers retry and disables submit until recovered. The dark manager retains search, 25-record pagination, details and authenticated résumé download for its read-only enquiry/application inboxes.

## Media provenance
Use only the copied source images and genuine combined logo. The local source manifest has 517 entries and 369 raster images; no generated photos or digital vehicle recolouring are used. website-with-chatbot/assets/wordpress/sources.json and catalogue manifests record sources/hashes; font OFL licenses live under assets/wordpress/licenses. Original marketing artwork keeps its composition. Providers still host embedded maps/videos and external social destinations.

## Preview and release evidence
The separate Docker preview uses port 8083, independent volumes, fresh public seed data and a separate admin session cookie. Live port 8082 remains untouched. No customer submissions or private uploads are copied. WORDPRESS-PREVIEW.md documents operation and snapshot boundaries.

Finish disposition: SHIP after two verdict passes; all seven finish-review findings resolved, restricted to the fix list. Backend tests passed 25 and browser tests passed 19. Captures: .impeccable/review/desktop.png, mobile.png, wp-events-banner-768.png and wp-contact-form-390.png, checked against wordpress-source/home-reference.png. Detector ran in degraded regex mode because its parser was unavailable; mechanical hidden-lightbox findings were fixed. This evidence is a review record, not a claim of full parser coverage.
