# Compact public mobile navigation — 10 November 2026

## Scope

Fix the copied WordPress public menu while preserving the existing branding, destinations, publication filtering, page content and separate admin interface. Branch: `codex/mobile-navigation-20261110`, based on the deployed preview release `ed8660e`.

The original plugin applies `height: 0` to its tablet dropdown until its own active class appears. The replacement JavaScript used a different open class and reset visibility/display but not height. At 390px the navigation measured only 56px, leaving the first link visible inside a clipped scroller. Inherited body `overflow-x:hidden` also created an unintended scrolling ancestor, preventing the header from sticking when the page was scrolled.

## Result

- Auto-height charcoal panel below the header: 8px gap, 12px viewport inset, maximum width 420px and maximum height 65dvh, additionally bounded by available viewport height.
- Long model lists scroll inside the panel; submenus have no separate nested scrollbar. Only one submenu expands at a time.
- Persistent labelled Close control with an X, outside-tap dismissal and Escape support.
- Root scroll locking and body overflow clipping retain page position and sticky positioning. Underlying content is inert while the menu is open.
- Existing keyboard focus trapping is retained, with visible white focus outlines on charcoal. Opening/closing avoids scrolling the document to the focused item.
- Height-only viewport changes do not unexpectedly close the menu. Crossing the desktop breakpoint resets it and restores desktop navigation.
- Menu targets remain at least 44px. Submenu arrow motion respects reduced motion.
- Shared CSS and JavaScript references use `nav-20261110` in all 81 public templates and the WordPress importer. No API, database, upload, content or credentials changes.

## Evidence

Automated coverage in `website-with-chatbot/test/browser/mobile-navigation.spec.js` checks 360, 390, 605, 768, 844 landscape and 1024px layouts; independent scrolling and actual link hit-testing; outside/close dismissal; page-position preservation; keyboard focus wrapping; submenu collapse; height resize and desktop transitions; and reduced motion. Home, catalogue, comparison, contact, careers, events and model-detail routes are exercised. Existing public, admin and form regressions also run.

The navigation tests and existing repeated visual matrices reuse snapshots of real public API reads so repeated layout navigation does not exhaust the shared content rate limiter. No application rate limits have changed.

Rendered review captures are local and gitignored under `.impeccable/review`: `menu-compact-390.png`, `menu-models-390.png`, `menu-expanded-{360,390,605,768,844,1024}.png`, and `menu-desktop-1440.png`. A touch-enabled phone browser also verified open/submenu/close interactions. The single mechanical detector pass returned no findings; this is not a claim of a complete accessibility audit. No physical-device check was performed.

Validation completed: all 25 backend tests and all 28 browser tests passed. Shared asset versions and source syntax checks also passed.

## Rollout

Prepared for Git-based deployment to the existing 8083 preview. Deployment requires a fresh user approval under the supplied AGENTS.md instructions. Inspect current server allocations and Compose mappings before rollout, retain data/uploads and a rollback release, then verify route assets and health. Port 8082 must remain untouched.
