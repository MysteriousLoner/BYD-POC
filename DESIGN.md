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

The public showroom opens with a cinematic, full-height vehicle photograph and a quiet, centered BYD identity. Its editorial journey moves into bright, generous spaces where authentic cars and dealership media lead. Graphite type and restrained red accents keep the brand present without competing with the imagery. The user pinned the Porsche-inspired composition; the BYD identity and published media make it specific to Millennium Motors.

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

- **Display:** The home hero uses responsive 36–70px story titles; on phones it uses 32–48px. White copy sits over the darkened image.
- **Headline:** Section headings scale from 30–46px; supporting copy is generally 15px.
- **Body and labels:** Body text is 15px at 1.65 line height; labels are commonly 13px. Forms retain 16px input text.

## Layout

Public content is centered at up to 1320px and 90% viewport width, with section padding scaling from 64px to 112px. The hero uses 100svh, a 740px desktop minimum and 1100px maximum, with copy anchored near the lower edge. A centered logo balances Menu at left and Contact at right. Cards use three columns where space and content permit; at 900px model grids become two columns, and at 650px they become one. On phones the hero has a 620px minimum, header labels hide, and the hero action spans the content width. Comparison values remain two columns.

## Elevation & Depth

Public sections are predominantly flat: tonal shifts, image crops and fine rules separate content. Gradients protect white text over images; menu and chat use shadows when floating above content. The dark manager uses tonal layering and borders for hierarchy. The news hero photograph moves with scroll; reduced motion removes the movement. Image-card hover uses a subtle 0.4s scale.

## Shapes

Public cards and media stages have generous 14px corners; controls use 5px corners, with circular image-card arrows and colour swatches. The manager retains its tighter 4px controls and flatter panels. Images crop to fill discovery cards but catalogue vehicle photos and campaign artwork are contained to preserve content.

## Components

### Buttons and links
Public primary buttons are graphite with white text, changing to red on hover; secondary buttons are outlined and lighten on hover. The hero action is white with graphite text. Underlined text links use a directional arrow and a 44px minimum interaction height. Manager primary buttons remain red. Public focus uses a 3px red outline; manager focus uses a warm 2px outline.

### Cards and media
Discovery cards overlay model names on large photographs with a bottom gradient. Catalogue cards pair contained vehicle photos with model, price, colour, key facts and a link to model details. Comparison is available from the dedicated comparison page. The news hero and light campaign stages use direct-selection dot controls and a separate pause button; campaign artwork remains contained with a separate caption; editorial news cards place text below cropped imagery.

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
