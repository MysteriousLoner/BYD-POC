---
name: BYD Millennium Motors
description: Faithful local Millennium Auto BYD public website with an independent dark staff manager.
colors:
  wp-red: "#ae2119"
  wp-red-hover: "#851a14"
  wp-dark: "#252728"
  wp-paper: "#ffffff"
  wp-muted: "#595d61"
  wp-line: "#d8dadd"
  wp-focus: "#bb3027"
  discovery-blue: "#195d7b"
  discovery-blue-deep: "#154b62"
  discovery-paper: "#edf4f8"
  discovery-panel: "#dceaf3"
  discovery-muted: "#455e6c"
  discovery-line: "#bfd0dc"
  discovery-focus-on-dark: "#a9d9f3"
  form-muted: "#d5d7d8"
  form-error: "#ffb3a7"
  form-success: "#9fe2b8"
  admin-bg: "#111214"
  admin-panel: "#1a1c1f"
  admin-ink: "#f3f1eb"
  admin-red: "#e2263e"
typography:
  display:
    fontFamily: "Orbitron, Arial, sans-serif"
    fontSize: "clamp(34px, 4.2vw, 56px)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Orbitron, Arial, sans-serif"
    fontSize: "clamp(28px, 3vw, 40px)"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Red Hat Display, Raleway, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Red Hat Display, Raleway, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  action:
    fontFamily: "Orbitron, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
  admin-body:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
rounded:
  field: "2px"
  admin: "4px"
  action: "26px"
  discovery-card: "12px"
  discovery-slot: "8px"
spacing:
  field-y: "12px"
  field-x: "14px"
  grid: "28px"
  section: "70px"
  section-phone: "42px"
components:
  public-button-primary:
    backgroundColor: "{colors.wp-red}"
    textColor: "{colors.wp-paper}"
    rounded: "{rounded.action}"
    padding: "12px 25px"
    typography: "{typography.action}"
  public-button-hover:
    backgroundColor: "{colors.wp-red-hover}"
    textColor: "{colors.wp-paper}"
  public-field:
    backgroundColor: "{colors.wp-paper}"
    textColor: "{colors.wp-dark}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  discovery-card:
    backgroundColor: "{colors.wp-paper}"
    textColor: "{colors.wp-dark}"
    rounded: "{rounded.discovery-card}"
  discovery-selection-panel:
    backgroundColor: "{colors.wp-dark}"
    textColor: "{colors.wp-paper}"
    rounded: "{rounded.discovery-card}"
    padding: "28px"
  public-form:
    backgroundColor: "{colors.wp-dark}"
    textColor: "{colors.wp-paper}"
---

# Design System: BYD Millennium Motors

## Overview

The public visual authority is the captured Millennium Auto BYD WordPress website, explicitly selected by the owner. Its charcoal header, genuine combined BYD/Millennium logo, geometric display typography, red capsule actions and native campaign imagery define the implemented world. The source layout and content sequence are retained; app-owned catalogue, comparison and form controls inherit that identity.

The owner-approved colourful showroom is scoped to `/models` and `/compare`: pale blue canvases, charcoal selection panels, red actions and substantial photographic cards extend the same public identity. Other public pages retain their source compositions. The route brief in `.impeccable/surfaces/model-discovery.md` records the page strategy.

The existing staff manager is a separate dark working environment with Sora typography and compact controls. Public design changes do not restyle its authentication, editors or inboxes.

Key characteristics:
- Original automotive marketing artwork and authentic vehicle colour photography.
- Charcoal navigation, footer and form areas alongside light catalogue and comparison surfaces.
- Orbitron display type with Red Hat Display/Raleway text.
- Phone layouts that preserve readable information and usable controls.

## Colors

### Primary

WordPress red marks capsule actions and meaningful public interaction. Its darker hover shade retains white action text.

### Secondary

Discovery blue supplies factual highlights, links and focus on light discovery surfaces; its deeper shade supports readable specification values. Pale blue paper and panels distinguish the two discovery routes. A pale blue outline remains visible on the charcoal picker. These tokens apply only to `/models` and `/compare`.

**The Scoped Discovery Rule.** Use the colourful showroom only on /models and /compare; preserve other source layouts and the separate staff manager.

### Neutral

WordPress charcoal anchors the header, footer, article-card panels and forms; white supplies discovery cards, specification rows and form labels. Discovery muted blue-grey and dividers organize facts on pale surfaces. Muted grey and fine grey rules organize light-surface facts. Charcoal forms use lighter supporting copy, pale red errors and pale green success text. The staff manager keeps its own charcoal background, slightly raised panels, warm-white text and brighter red actions.

## Typography

Orbitron supplies source display headings and compact action labels. Red Hat Display and Raleway supply readable public text; source page-specific typography is retained by the copied theme styles. Shared app features use the body stack in the frontmatter.

The home hero display scales to the frontmatter range on desktop and becomes 32px/1.3 on phones. Feature headings scale from 28px to 40px. Discovery route headings use Orbitron at `clamp(28px, 3.2vw, 44px)` and 27px on phones; catalogue model names use the body family at 27px, reducing to 23px on phones. Other app feature titles retain their source scale; form labels remain 15px and input text 16px. Long headings wrap. The manager continues using self-hosted Sora and its existing scale.

## Layout

The sticky charcoal header holds the combined logo, horizontal desktop navigation and registration action. The home sequence is the managed opening slider, original full-width campaign/model artwork, three FAQ article cards, image-backed destination links and charcoal footer. Retain each copied page's original source composition rather than imposing the earlier showroom grid.

Discovery content uses 90% width and a 1200px maximum, widening to 92% below 768px. The route canvas has 40px top/64px bottom padding, reducing to 30px/40px on phones. Catalogue cards use two columns with a 28px gap from 768px, and one column with a 22px gap below it. The guided comparison gallery uses three columns, reducing to two on phones. Other public feature sections retain 70px vertical padding and 42px on phones. The logo is the home link; Home is omitted from the navigation list. The MODEL label links to the catalogue. On desktop, hovering or focusing it opens an edge-to-edge charcoal dropdown background with a centred 808px vehicle grid, at most 360px tall (also capped at 55dvh), with three columns of authentic published vehicle photos, source model names and managed prices. Compact thumbnail height adapts from 64px to 100px on short laptop viewports, preserving visible page content below the shallow dropdown; exceptionally short panels scroll independently. A short pointer-exit grace period allows moving into the panel, and Escape or leaving closes it. On phones, MODEL is a full-width direct link to the catalogue; its arrow and vehicle submenu are hidden. Desktop hover, keyboard previews and the separate arrow remain available. The mobile menu replaces desktop navigation at 1024px. Its charcoal panel sits 8px below the header, 12px from the viewport edge, with a 420px maximum width and 65dvh maximum height. Long model submenus scroll inside the panel; the header’s Close control stays visible. Outside taps and Escape dismiss the menu, background scrolling is locked at the root without moving the page, and controls retain at least 44px targets. Height-only viewport changes keep the menu open; crossing the desktop breakpoint resets it. The home slider uses viewport-relative height below the header, with lower copy placement on phones and separated transport controls.

Comparison keeps two aligned columns on phones, with smaller contained vehicle photographs and wrapped values. Its compact charcoal identity bar sticks below the measured public header while grouped specifications scroll; preserve the route-scoped body overflow clipping that enables sticking without changing mobile menu scroll locking. Model pages retain source photographs, native colour imagery, gallery and specification tabs. Below 768px, source numeric specification cells stack label over value at full width so long numbers remain readable. Galleries become two columns. Form name fields stack, submit actions span the phone width, and the news banner title stays within the image at tablet widths.

## Elevation & Depth

The public interface is primarily flat: photographs, charcoal/light section contrast and fine dividers establish hierarchy. The mobile navigation uses a restrained drop shadow; the modal gallery uses a dark backdrop. Do not introduce lifted dashboard cards into source marketing sections. Existing source card treatments remain intact. Discovery uses pale canvases, white cards and charcoal selection stages with fine blue-grey borders; no card shadows are added.

## Shapes

Actions are red capsules with a 26px radius; white inputs use restrained 2px corners and a grey stroke. Discovery cards use restrained rounded corners from the scoped card token, a fine border and contained photography; selection slots use the smaller scoped slot radius. Other source card treatments are unchanged. Colour swatches are circular and show an outlined selected state. The separate manager retains its 4px control radius.

## Components

### Actions and navigation

Public actions use Orbitron, white text, at least 44px height and the red capsule shape. Outline actions inherit their surface contrast. Hover darkens red and adds a subtle one-pixel lift; a visible three-pixel focus outline sits outside controls. The sticky charcoal header preserves the combined source logo, current-page indication, model submenu and collapsible phone navigation.

### News navigation preview

On desktop, News & Events shares the model menu’s edge-to-edge charcoal background, centred 808px three-column content area and 360px/55dvh height cap. Show the three latest published stories with genuine uncropped thumbnails, a two-line title, saved category/date and a 44px View all news & events link. Keep the label itself linked to `/events`; the separate arrow also supports keyboard entry. Hover exit has the same grace period as models; Escape, outside interaction and focus departure dismiss the preview. Opening one preview closes the other without a delayed close affecting the new panel. Mobile hides both disclosure buttons and preview panels, leaving direct MODEL and News & Events links. Loading, empty and retry states retain access to the archive. No record data or publication settings are changed.

### Catalogue and comparison

Discovery catalogue cards contain genuine photographs in a 1.85 aspect-ratio stage (1.65 on phones), real colour swatches, managed type/price and up to three available factual highlights. Card copy has 24px padding, reducing to 18px on phones. Type filters show counts and a charcoal selected state. Swatches have 44px targets, a blue selected outline and named colour feedback; arrow keys, Home and End select colours. Filtering keeps surviving cards in place with a brief reflow; paint changes crossfade genuine photographs. Reduced motion removes these transitions and decorative image scaling.

Dedicated comparison uses a charcoal guided stage with two explicit slots, a thumbnail gallery and an explicit Compare models action. Slot focus uses the pale outline token; other discovery controls use blue focus outlines. A short image-to-slot transition runs only when visible and motion is allowed. Model identity, changed selection, counts and errors remain readable and announced. Results show the union of stable specification keys in source groups, preserved units/variant qualifiers and explicit missing values. Differences-only filtering compares displayed value context; differences are informational, with no numeric winners. Model-specific enquiry actions remain available. Existing URL and saved-pair compatibility are preserved.

### Forms and states

Enquiry/test-drive and employment forms use charcoal surroundings, white labels and white fields with dark text. Inputs and selectors are at least 48px high; checkboxes remain visible alongside consent wording. Supporting text, error/success status and retry actions must retain contrast on charcoal. Failed submission preserves entries. Branch-loading errors disable submission and offer recovery. Résumé handling remains private.

### Slider, colour, specifications and gallery

The home slider follows saved slide order, duration and publication, with labelled previous/next, dot selection, play/pause and sound controls where relevant. Hero photography covers its stage; static source campaign artwork below keeps its composition. Colour controls select genuine photographs, specification tabs remain operable, and gallery images open in a keyboard-accessible modal. Reduced motion disables decorative transitions and starts automatic media paused.

### Staff manager

Preserve the dark manager's grouped sidebar/mobile drawer, 48px fields, explicit save feedback, slide ordering and collapsible preview. Enquiries and job applications remain authenticated read-only searchable inboxes with 25-record pagination, detail views and private résumé downloads. Its Sora typography and dark token set belong to staff workflows only.

## Do's and Don'ts

### Do:
- **Do** follow the captured WordPress layout, genuine combined logo and locally sourced original media.
- **Do** preserve published catalogue facts, native colour images and source marketing composition.
- **Do** keep focus, statuses, 44px targets and full-width phone specification values readable.
- **Do** preserve the separate dark manager and reduced-motion behavior.
- **Do** scope the colourful showroom palette and card system to `/models` and `/compare`, retaining genuine paint photography and aligned comparison columns.

### Don't:
- **Don't** restore the superseded Porsche-inspired public system or public Sora typography.
- **Don't** generate replacement photography, digitally recolour vehicles or fabricate specifications.
- **Don't** assign numeric winners or extend discovery styling to source marketing pages or staff tools.
- **Don't** hide source artwork behind decorative UI or apply light-surface text colours to charcoal forms.
