# Compact public mobile navigation — 10 November 2026

## Scope

Fix the copied WordPress public menu while preserving the existing branding, destinations, publication filtering, page content and separate admin interface. Branch: `codex/mobile-navigation-20261110`, based on the deployed preview release `ed8660e`.

The original plugin applies `height: 0` to its tablet dropdown until its own active class appears. The replacement JavaScript used a different open class and reset visibility/display but not height. At 390px the navigation measured only 56px, leaving the first link visible inside a clipped scroller. Inherited body `overflow-x:hidden` also created an unintended scrolling ancestor, preventing the header from sticking when the page was scrolled.

## Result

- Auto-height charcoal panel below the header: 8px gap, 12px viewport inset, maximum width 420px and maximum height 65dvh, additionally bounded by available viewport height.
- The model submenu lists individual vehicles only; the Explore all models and Compare models entries were removed at the owner’s request. Catalogue and comparison pages remain accessible through existing page actions.
- Long model lists scroll inside the panel; submenus have no separate nested scrollbar. Only one submenu expands at a time.
- The MODEL text links directly to `/models`; a separate labelled 44px arrow button expands the vehicle list. The arrow preserves keyboard expansion, Escape and focus behaviour on phone and desktop.
- Persistent labelled Close control with an X, outside-tap dismissal and Escape support.
- Root scroll locking and body overflow clipping retain page position and sticky positioning. Underlying content is inert while the menu is open.
- Existing keyboard focus trapping is retained, with visible white focus outlines on charcoal. Opening/closing avoids scrolling the document to the focused item.
- Height-only viewport changes do not unexpectedly close the menu. Crossing the desktop breakpoint resets it and restores desktop navigation.
- Menu targets remain at least 44px. Submenu arrow motion respects reduced motion.
- Shared CSS and JavaScript references use `nav-20261110e` in all 81 public templates and the WordPress importer. No API, database, upload, content or credentials changes.

## Evidence

Automated coverage in `website-with-chatbot/test/browser/mobile-navigation.spec.js` checks 360, 390, 605, 768, 844 landscape and 1024px layouts; independent scrolling and actual link hit-testing; outside/close dismissal; page-position preservation; keyboard focus wrapping; submenu collapse; height resize and desktop transitions; and reduced motion. Home, catalogue, comparison, contact, careers, events and model-detail routes are exercised. Existing public, admin and form regressions also run.

The navigation tests and existing repeated visual matrices reuse snapshots of real public API reads so repeated layout navigation does not exhaust the shared content rate limiter. No application rate limits have changed.

Rendered review captures are local and gitignored under `.impeccable/review`: `menu-compact-390.png`, `menu-models-390.png`, `menu-expanded-{360,390,605,768,844,1024}.png`, and `menu-desktop-1440.png`. A touch-enabled phone browser also verified open/submenu/close interactions. The single mechanical detector pass returned no findings; this is not a claim of a complete accessibility audit. No physical-device check was performed.

Validation completed: all 25 backend tests and all 28 browser tests passed. Shared asset versions and source syntax checks also passed. After the menu-entry removal and separate MODEL link/arrow follow-ups, all four targeted navigation checks passed, including phone/desktop keyboard activation and rendered review.

## Desktop preview follow-up

Reference: https://byd.simemotors.my/contact-us, inspected in the owner’s existing Chrome tab. Desktop MODEL hover and keyboard focus reveal a full-width charcoal panel with three columns of real car photographs, model labels and staff-managed prices. The existing public API controls models, publication and ordering. The panel stays open while moving from the header into a vehicle link; Escape, focus departure, or pointer departure dismiss it. Touch and mobile retain explicit disclosure controls and text-only links. The combined logo is labelled as the home link, and the separate Home menu item is removed across all 81 templates and the importer. No new photography or factual vehicle content is introduced.

The new desktop browser checks cover hover, pointer transit/dismissal, keyboard entry/Escape, links, logo navigation, managed pricing/order/publication, empty data, broken media and API retry. Phone checks cover 360/390/605/768px; desktop captures cover 1100/1440px and a short 1265×536 laptop viewport.

Final follow-up validation: all 25 backend tests and all 32 browser tests passed; the three desktop-preview checks passed again after the short-viewport image-height adjustment. The scoped layout detector returned no findings. Rendered desktop and short-laptop captures were inspected.

## Rollout

Prepared for Git-based deployment to the existing 8083 preview. Deployment requires a fresh user approval under the supplied AGENTS.md instructions. Inspect current server allocations and Compose mappings before rollout, retain data/uploads and a rollback release, then verify route assets and health. Port 8082 must remain untouched.

## Compact desktop correction

The owner requested a smaller dropdown after reviewing the full-width preview. It is now centred below the header with an 8px gap, a maximum width of 840px and a maximum height of 360px or 55dvh, whichever is smaller. Three columns retain all six published vehicles with 64–100px authentic thumbnails, 15px model names and 13px price text. The surrounding page remains visible and interactive; exceptionally long content scrolls inside the panel. Desktop tests now assert bounded width/height, centring and visible page space at 1100×900, 1440×900, 1265×536 and 1920×1080. Mobile navigation and all hover/keyboard/route controls are retained. Shared asset version: nav-20261110e.

Compact correction validation: all six targeted desktop/mobile navigation checks passed. Rendered 1440px and 1265×536 captures confirm the page remains visible around the dropdown. The single scoped detector pass returned no findings.

## Horizontal background extension

At the owner’s request, the dark desktop dropdown background now spans the full viewport width and meets the header. The three-column vehicle content stays centred within 808px, retaining the compact thumbnails, type scale and 360px/55dvh height limit. The background extension does not enlarge the vehicle cards. Desktop checks assert the full-width background independently from the bounded content grid at all four desktop/laptop viewports; mobile stays unchanged. Shared asset version: nav-20261110f.

Horizontal-background validation: all six targeted navigation tests passed; the rendered desktop capture and the single scoped detector pass showed no outstanding layout issues.
