# Latch verification

Verified 27 October 2026.

- `npm run lint`: passed, zero lint errors or warnings.
- `npm test`: 58 passing domain, parser, model-adapter, API-boundary, queue, simulation and failover tests.
- `npm run build`: TypeScript validation and Vite production build passed.
- `npm run test:e2e`: 11 passing browser tests after the frontend design upgrade.
- All 10 browser tests pass against the single-port production build, including the root page and dedicated fixture routes.
- All 10 browser tests pass against an auto-mode production instance whose Chromium path is deliberately missing. Modeled images load, the simulation notice is visible, reports download, and no browser launch failure crashes the server.
- All 3 regression bundles exported in simulation mode also pass when independently executed in real Chromium.
- `docker compose config --quiet`: passed.
- Extracted checkout, workspace, and search bundles: each standalone Playwright test passed against its included fixture server.

The browser suite covers each of the three scenarios in Buggy and Guarded modes under both completion orders. The stale response returning last violates the assertion in Buggy mode; Guarded mode preserves the latest state. Both modes pass in original completion order. Seeded assertion failures are expected evidence of the bug, not runtime errors.

It also checks dedicated iframe content, narration-driven scenario selection and ordering, named Acme/Nimbus responses, spoken corrections, missing fixture 404s, actual screenshot and trace downloads, export preview keyboard dismissal, desktop/mobile layout, reduced motion, and WCAG A/AA automated accessibility checks before and after a completed run.

The network-resilience regression blocks all fixture-asset requests and fails the first health request. All three previews still render in both variants, and health recovers automatically. Trusted preview assets are bundled from the same fixture sources used by the browser runner and export.

Narration interpretation uses the bounded built-in parser when no server-side model key is configured. Unsupported or ambiguous instructions produce clarification rather than executable guesses. Model transport is covered with controlled test responses; live model credentials have not been supplied.

Fallback snapshots are SVG images generated from the finite fixture state. Their ZIP is a simulation report, not a Playwright trace. Browser mode remains the preferred public execution path; automatic fallback preserves the judge workflow on restricted hosts.

Source data, products, companies, invoices, and quote amounts in fixtures are synthetic. The checkout interaction is based on the user's actual reported promo double-click incident.
