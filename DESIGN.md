---
name: BYD Millennium Motors
description: An image-led public showroom and dark content manager for BYD Millennium Motors.
colors:
  public-bg: "#fff"
  public-panel: "#f4f4f2"
  public-raised: "#e9e9e7"
  public-ink: "#17191d"
  public-muted: "#5d6168"
  public-line: "#d9dad9"
  public-red: "#bc2033"
  public-red-hover: "#981a2a"
  public-success: "#17683e"
  admin-bg: "#111214"
  admin-panel: "#1a1c1f"
  admin-raised: "#22252a"
  admin-ink: "#f3f1eb"
  admin-muted: "#b0b2b7"
  admin-line: "#383b40"
  admin-red: "#e2263e"
  admin-focus: "#f5cc89"
typography:
  display:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "clamp(42px, 6vw, 80px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 46px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-.035em"
  body:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.65
rounded:
  public-control: "5px"
  public-card: "14px"
  admin-control: "4px"
  circular: "50%"
spacing:
  compact: "8px"
  small: "16px"
  card: "24px"
  mobile-section: "60px"
components:
  public-button-primary:
    backgroundColor: "{colors.public-ink}"
    textColor: "{colors.public-bg}"
    rounded: "{rounded.public-control}"
    padding: "12px 20px"
  public-button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.public-ink}"
    rounded: "{rounded.public-control}"
    padding: "12px 20px"
  public-card:
    backgroundColor: "{colors.public-panel}"
    rounded: "{rounded.public-card}"
  admin-button-primary:
    backgroundColor: "{colors.admin-red}"
    textColor: "{colors.public-bg}"
    rounded: "{rounded.admin-control}"
    padding: "12px 20px"
---

# Design System: BYD Millennium Motors

## Overview

**Creative North Star: "The Open Road Showroom"**

The public showroom opens with a full-height campaign slideshow and a quiet, centered BYD identity. Video covers the opening viewport behind the headline, description and actions. Images retain contain sizing, with the same text overlay. Its editorial journey moves into bright, generous spaces where authentic cars and dealership media lead. Graphite type and restrained red accents keep the brand present without competing with the imagery. The user pinned the Porsche-inspired composition; the BYD identity and published media make it specific to Millennium Motors.

Staff operate in the existing dark manager: charcoal panels, warm light text, clear fields and red primary actions. This distinction is intentional. `css/tokens.css` defines the dark base; `css/showroom.css` overrides it for public pages. The surface brief records page-level composition and content behavior.

**Key Characteristics:**
- Immersive photography and low-positioned, readable hero copy.
- White public grounds, graphite text, pale panels and sparing red accents.
- Self-hosted Sora, official BYD mark and authentic vehicle and campaign media.
- Generous editorial spacing for shoppers; compact, labelled dark controls for staff.

## Colors

### Primary
- **BYD red:** Public focus, selected controls and accents; the darker hover is used where defined. The manager uses its brighter red for primary actions.

### Neutral
- **White and pale stone:** Public backgrounds and quiet card surfaces.
- **Graphite and cool grey:** Public text, supporting copy and rules. Deep graphite also anchors the contact banner and footer.
- **Charcoal and warm off-white:** Manager backgrounds, panels and readable text; muted grey supports labels and borders.

**The Media First Rule.** Let imagery, white space and typography carry the public page; use red for meaningful emphasis and state.

## Typography

**Display and body font:** Sora, with Arial and sans-serif fallbacks. The self-hosted font uses compact tracking for headings and measured, readable body text.

- **Display:** The home hero uses responsive 36–70px story titles; on phones it uses 32–48px. White copy overlays the media on a dark lower gradient; mobile titles use 34px type.
- **Headline:** Section headings scale from 30–46px; supporting copy is generally 15px.
- **Body and labels:** Body text is 15px at 1.65 line height; labels are commonly 13px. Forms retain 16px input text.

## Layout

Public content is centered at up to 1320px and 90% viewport width, with section padding scaling from 64px to 112px. The hero occupies 100svh with absolutely positioned media, copy and controls; text does not reserve media space. A centered logo balances Menu at left and Contact at right. Cards use three columns where space and content permit; at 900px model grids become two columns, and at 650px they become one. On phones header labels hide, the hero action spans the content width, and the video covers the viewport behind the caption. Comparison values remain two columns.

## Elevation & Depth

Public sections are predominantly flat: tonal shifts, image crops and fine rules separate content. Gradients protect white text over images; menu and chat use shadows when floating above content. The dark manager uses tonal layering and borders for hierarchy. The campaign media shifts subtly with scroll; reduced motion removes the movement. Image-card hover uses a subtle 0.4s scale.

## Shapes

Public cards and media stages have generous 14px corners; controls use 5px corners, with circular image-card arrows and colour swatches. The manager retains its tighter 4px controls and flatter panels. Images crop to fill discovery cards but catalogue vehicle photos and campaign artwork are contained to preserve content.

## Components

### Buttons and links
Public primary buttons are graphite with white text, changing to red on hover; secondary buttons are outlined and lighten on hover. The hero action is white with graphite text. Underlined text links use a directional arrow and a 44px minimum interaction height. Manager primary buttons remain red. Public focus uses a 3px red outline; manager focus uses a warm 2px outline.

### Cards and media
Discovery cards overlay model names on large photographs with a bottom gradient. Catalogue cards pair contained vehicle photos with model, price, colour, key facts and a link to model details. Comparison is available from the dedicated comparison page. The homepage campaign stage uses direct-selection dots and a separate pause button, respects saved order and timing, and contains media above its caption; editorial news cards place text below cropped imagery.

### Inputs and navigation
Public fields use white backgrounds, grey borders and at least 48px height; focused forms sit on pale panels. The public header overlays the home hero and becomes a white bar on interior routes. Menu opens a light, vertically listed navigation panel; chat opens from navigation. The dark manager uses its own compact sidebar or mobile drawer and dark fields.

## Do's and Don'ts

### Do:
- **Do** use published, authentic vehicle and campaign media and keep campaign artwork legible.
- **Do** maintain clear contrast over photographs and preserve visible keyboard focus.
- **Do** keep mobile controls and comparison information usable at narrow widths.
- **Do** retain the dark manager's existing control language for staff workflows.

### Don't:
- **Don't** fabricate vehicle facts or digitally recolour cars.
- **Don't** let decorative overlays obscure important campaign artwork.

## Homepage and staff submission browsing, 30 October 2026

The homepage sequence is the managed opening slideshow, featured models, dealership introduction and footer. The catalogue, duplicate campaign block, editorial news block and closing contact banner are removed from the homepage. “Explore and compare models” opens `/models`; comparison remains on its dedicated page. News stays on `/events`.

The dark manager groups website content, assistant tools and submissions in the same desktop sidebar/mobile drawer. Homepage slides have immediate-save Move up/Move down controls, labelled action links, seconds-based timing, a collapsible preview, and explicit published/hidden save feedback. Editing a slide brings its fields into view on phones. Content and uploads remain staff-controlled.

Enquiries and Job applications are read-only inboxes: search saved fields, browse 25 newest-first records per page, open a full detail view, then return to the same filtered list. Detail fields stack on phones and use a two-column definition list on wider screens. Branch snapshots are preferred; older branch IDs resolve to managed names where available. Missing legacy data is labelled, never invented. Authenticated résumé downloads retain private storage and report missing attachments without discarding the application. No submission deletion or status workflow is added.

The current HTTP transport warning remains visible, as explicitly accepted by the owner. Submission reads and downloads require the existing admin session and use `Cache-Control: no-store`; unsafe attachment paths and links escaping the upload directory are rejected. No database schema migration is required.

Finish review: SHIP for the homepage/admin usability release. Reviewed rendered public, slide-editor and submission list/detail flows at 360, 390, 605, 768 and 1440px, including keyboard focus, portrait media, long and missing fields. The backend suite passed 20 tests and browser suite passed 22 tests. The mechanical detector reported no findings in degraded regex mode, so computed contrast was checked separately: white/red actions 4.58:1 and muted manager text/panel 8.05:1. The intentional HTTP transport limitation remains visible and owner-approved.

Video playback update: public video slides start automatically and muted, inline on phones, and rotate after the admin-defined duration. The slideshow pause control also pauses the active video, including a single video slide. Leaving the stage or hiding the tab pauses playback; returning resumes when not manually paused. Reduced motion starts paused. Native and YouTube player controls remain available, with explanatory recovery text if the browser blocks autoplay. Staff previews stay manual while editing. YouTube uses its official IFrame API to mute and synchronize playback.

Autoplay finish review: SHIP. Phone and desktop native-video captures retain the existing composition without the public play-poster overlay. Backend tests passed (20); the six targeted autoplay, timing, pause, reduced-motion and control-recovery browser checks passed after the broader regression run. Native video playback was exercised with a local fixture; YouTube control integration was verified with a deterministic API stub, not a claim that third-party streaming was observed live.

Full-screen hero correction: the header, headline, description, destination links and dot/pause/sound controls overlay the opening media. Native video uses cover sizing. YouTube embeds use centered 16:9 cover sizing with 35% overscan to cover the cinematic letterboxing shown in the user’s reference; edge cropping is intentional; background playback hides provider transport controls and keyboard focus, while labelled site controls handle pause and sound, including API-load recovery. Images keep contain sizing. A lower dark gradient provides text contrast; short landscape screens reduce the heading and omit secondary description text. Native and YouTube autoplay, saved timing and reduced motion remain supported.

Overlay finish review: SHIP. The 26-test browser suite passed, including full-viewport media bounds, absolute text placement, unobstructed controls, native/YouTube playback, sound switching and short landscape layout. Reviewed mobile and desktop captures with fixture media behind the overlay; image artwork remains contained. The detector returned no findings in degraded regex mode; rendered contrast and control separation were reviewed directly.
