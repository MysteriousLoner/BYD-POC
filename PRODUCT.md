# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Malaysian car shoppers browsing on phones, job applicants, and staff maintaining dealership content.

## Product Purpose
Reproduce the public Millennium Auto BYD website faithfully within the existing application while helping visitors choose a model, inspect real colour photography/specifications, compare two catalogue entries and enquire through a preferred branch. Let applicants submit a résumé with a preferred branch.

## Capabilities and Constraints
Existing HTML/CSS/JavaScript, Express, Node 24+ and SQLite remain in place. Preserve managed publication, legacy specifications, authentication, CSRF and private résumés. Comparison uses catalogue entries without nested trims. English UI. Event orientation warnings remain advisory. No public chatbot is added.

Keep the live port 8082 service untouched. The separate Docker preview uses port 8083, independent volumes, a separate admin session cookie name and fresh public seed data; it contains no live enquiries, applications, résumés or conversations. The preview is noindex. See WORDPRESS-PREVIEW.md for startup and isolation boundaries.

## Brand Commitments
The owner selected https://millenniumautobyd.com.my/home/ as the public visual and content authority, replacing the prior Porsche-inspired direction. Preserve its genuine combined BYD/Millennium logo, charcoal header, red capsule actions, Orbitron headings, Red Hat Display/Raleway text, original layouts and authentic native imagery. Catalogue/comparison remain light; enquiry/employment forms use charcoal with white labels and readable statuses. Keep the existing dark Sora staff manager separate. No fabricated facts or digitally recoloured vehicles.

## Evidence on Hand
Compiled source pages in website-with-chatbot/content/wordpress include six rich model pages, About, Contact, Careers and 63 captured article/news/event posts. Source captures and direction are recorded in scripts/wordpress-direction.md and WORDPRESS-PREVIEW.md. Local source assets include 517 manifest entries and 369 raster images, with source manifests and self-hosted font OFL licenses. No generated photographs are used.

Marketing sections and original article bodies are compiled source snapshots, without automatic WordPress synchronization. SQLite controls the managed catalogue, colours/specifications, publication, campaign slides, archive cards, branches and form submissions. Editing a managed description does not rewrite an imported marketing page. Existing managed branch records take precedence over the initial public-source seed; the coming-soon location is excluded.

## Product Principles
- Preserve the source website's brand, layout and authentic imagery while improving phone tasks.
- Keep managed factual content and publication under staff control, with snapshot boundaries explicit.
- Make model selection, dedicated comparison, enquiry and employment submission usable on phones.
- Show useful errors without discarding entered form details.

## Accessibility & Inclusion
Keyboard navigation, visible focus, labelled fields, 44px touch targets, reduced motion and readable contrast. Mobile navigation is scrollable, source numeric specifications stack label/value at full width, gallery/specification interactions remain operable and comparison retains aligned entries.
