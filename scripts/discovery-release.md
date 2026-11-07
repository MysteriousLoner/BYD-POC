# Discovery refresh release

Branch: codex/model-discovery-20261107, based on the WordPress preview branch.

Changes are limited to model discovery and dedicated comparison: scoped module/styles, generated template asset versions, generator support, and browser regression coverage. Existing API payloads, database schemas, source marketing pages, forms and admin are unchanged. All facts and photographs remain managed/sourced content.

Validation: 25 backend tests and 26 browser tests passed. The discovery capture matrix covers catalogue, guided picker and selected comparison at 360, 390, 605, 768 and 1440px, with actual keyboard focus and scrolled sticky-header evidence at phone/desktop widths. Impeccable finish review scored its three material findings resolved over two verdict passes. Detector reported no regex findings in degraded mode; it did not provide a complete parser-based accessibility assessment. All369 existing raster provenance records remain present.

Local review: run `BYD_PREVIEW_PORT=4189 node test/preview-server.js` from website-with-chatbot. It creates disposable local data independently of server records.

Release targets only the existing8083 preview. Before server access, the owner must confirm the credentials file. Before deployment, obtain explicit approval for this reviewed release as required by the supplied AGENTS.md. Inspect existing ports, Compose mappings, active containers and the checkout before changes. Back up current preview SQLite consistently and its uploads; retain its previous image/tag and a rollback command. Build/preflight the exact Git commit with isolated public seed data; do not copy customer submissions to local tests. Preserve the existing preview volumes on rollout, then verify health/routes, selected model flows and persistence. Check that production8082's container/image/start time did not change. Do not stop or modify unrelated containers.
