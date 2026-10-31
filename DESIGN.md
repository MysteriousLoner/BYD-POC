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
  public-form:
    backgroundColor: "{colors.wp-dark}"
    textColor: "{colors.wp-paper}"
---

# Design System: BYD Millennium Motors

## Overview

The public visual authority is the captured Millennium Auto BYD WordPress website, explicitly selected by the owner. Its charcoal header, genuine combined BYD/Millennium logo, geometric display typography, red capsule actions and native campaign imagery define the implemented world. The source layout and content sequence are retained; app-owned catalogue, comparison and form controls inherit that identity.

The existing staff manager is a separate dark working environment with Sora typography and compact controls. Public design changes do not restyle its authentication, editors or inboxes.

Key characteristics:
- Original automotive marketing artwork and authentic vehicle colour photography.
- Charcoal navigation, footer and form areas alongside light catalogue and comparison surfaces.
- Orbitron display type with Red Hat Display/Raleway text.
- Phone layouts that preserve readable information and usable controls.

## Colors

### Primary

WordPress red marks capsule actions and meaningful public interaction. Its darker hover shade retains white action text.

### Neutral

WordPress charcoal anchors the header, footer, article-card panels and forms; white supplies catalogue and comparison backgrounds and form labels. Muted grey and fine grey rules organize light-surface facts. Charcoal forms use lighter supporting copy, pale red errors and pale green success text. The staff manager keeps its own charcoal background, slightly raised panels, warm-white text and brighter red actions.

## Typography

Orbitron supplies source display headings and compact action labels. Red Hat Display and Raleway supply readable public text; source page-specific typography is retained by the copied theme styles. Shared app features use the body stack in the frontmatter.

The home hero display scales to the frontmatter range on desktop and becomes 32px/1.3 on phones. Feature headings scale from 28px to 40px. Catalogue titles use the body family at 24px; form labels remain 15px and input text 16px. Long headings wrap. The manager continues using self-hosted Sora and its existing scale.

## Layout

The sticky charcoal header holds the combined logo, horizontal desktop navigation and registration action. The home sequence is the managed opening slider, original full-width campaign/model artwork, three FAQ article cards, image-backed destination links and charcoal footer. Retain each copied page's original source composition rather than imposing the earlier showroom grid.

New catalogue and comparison areas use 90% width, a 1200px maximum and 70px vertical section padding. The catalogue has three columns, two at 1024px and one at 767px; phone section padding is 42px. The mobile menu replaces desktop navigation at 1024px, with a scrollable charcoal panel and 44px targets. The home slider uses viewport-relative height below the header, with lower copy placement on phones and separated transport controls.

Comparison keeps two aligned columns on phones, with smaller contained vehicle photographs and wrapped values. Model pages retain source photographs, native colour imagery, gallery and specification tabs. Below 768px, source numeric specification cells stack label over value at full width so long numbers remain readable. Galleries become two columns. Form name fields stack, submit actions span the phone width, and the news banner title stays within the image at tablet widths.

## Elevation & Depth

The public interface is primarily flat: photographs, charcoal/light section contrast and fine dividers establish hierarchy. The mobile navigation uses a restrained drop shadow; the modal gallery uses a dark backdrop. Do not introduce lifted dashboard cards into source marketing sections. Existing source card treatments remain intact.

## Shapes

Actions are red capsules with a 26px radius; white inputs use restrained 2px corners and a grey stroke. Catalogue cards are open, ruled layouts with contained photography rather than rounded floating tiles. Colour swatches are circular and show an outlined selected state. The separate manager retains its 4px control radius.

## Components

### Actions and navigation

Public actions use Orbitron, white text, at least 44px height and the red capsule shape. Outline actions inherit their surface contrast. Hover darkens red and adds a subtle one-pixel lift; a visible three-pixel focus outline sits outside controls. The sticky charcoal header preserves the combined source logo, current-page indication, model submenu and collapsible phone navigation.

### Catalogue and comparison

Catalogue photographs are contained within a 1.7 aspect-ratio light image area. Model names, published facts and capsule actions follow below a 24px gap. A subtle image scale on hover is optional to the existing component and removed for reduced motion. Dedicated comparison shows two unique managed catalogue entries, aligned specification keys and explicit missing values; selectors remain available above results.

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

### Don't:
- **Don't** restore the superseded Porsche-inspired public system or public Sora typography.
- **Don't** generate replacement photography, digitally recolour vehicles or fabricate specifications.
- **Don't** hide source artwork behind decorative UI or apply light-surface text colours to charcoal forms.
