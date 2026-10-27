# Latch verification

Verified 27 October 2026.

- `npm run lint`: passed, zero lint errors or warnings.
- `npm test`: 39 passing domain, parser, model-adapter, API-boundary and queue tests.
- `npm run build`: TypeScript validation and Vite production build passed.
- `npm run test:e2e`: 9 passing browser tests.
- Extracted checkout, workspace, and search bundles: each standalone Playwright test passed against its included fixture server.

The browser suite covers each of the three scenarios in Buggy and Guarded modes under both completion orders. The stale response returning last violates the assertion in Buggy mode; Guarded mode preserves the latest state. Both modes pass in original completion order. Seeded assertion failures are expected evidence of the bug, not runtime errors.

It also checks dedicated iframe content, narration-driven scenario selection and ordering, named Acme/Nimbus responses, spoken corrections, missing fixture 404s, actual screenshot and trace downloads, export preview keyboard dismissal, desktop/mobile layout, reduced motion, and WCAG A/AA automated accessibility checks before and after a completed run.

Narration interpretation uses the bounded built-in parser when no server-side model key is configured. Unsupported or ambiguous instructions produce clarification rather than executable guesses. Model transport is covered with controlled test responses; live model credentials have not been supplied.

Source data, products, companies, invoices, and quote amounts in fixtures are synthetic. The checkout interaction is based on the user's actual reported promo double-click incident.
