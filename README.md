# Latch

**Make UI timing bugs and race conditions repeatable.**

Latch turns a developer’s description of an intermittent UI race into a deterministic browser experiment, visible evidence, and a runnable Playwright regression.

[Try Latch live](https://latch-production-e63d.up.railway.app/) — no account, API key, or setup required.

## The problem

In a checkout workflow, rapidly applying a promo twice sent overlapping requests. The older response arrived last and overwrote the correct total. Latch makes response order explicit, reproduces the defect, and checks the guarded implementation against the same scenario.

Three seeded examples are available: double-click checkout, Acme/Nimbus invoice switching, and stale search results. All fixture data is synthetic.

## Voice-first workflow

Describe what happened in the narration box using Wispr Flow. Latch interprets the spoken observation into a supported scenario and response order; edit the text and choose **Update scenario** to apply it. Run the scenario to inspect the request waterfall, fixture, and assertion, then download its Playwright regression bundle. Wispr supplies dictation through the normal text field; Latch does not record audio or require a Wispr SDK.

## Architecture

The React and TypeScript workbench sends a validated scenario and completion order to a Fastify API. The runner intercepts and gates fixture network requests, releasing them in the selected order to reproduce timing races. It captures evidence and exports a standalone Playwright test. If Chromium is unavailable, deterministic simulation provides clearly labeled modeled snapshots and a simulation report. Both modes use finite synthetic fixtures; the runner does not browse arbitrary targets or execute generated code.

## Quickstart

Requires Node.js 24+ and npm.

```sh
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:4317](http://localhost:4317). Vite serves the workbench and proxies API requests to Fastify on port 4318.

Run browser tests:

```sh
npx playwright test
```

Build and start the production server:

```sh
npm run build
npm start
```

Optional configuration is documented in `.env.example`. No environment variables are required for the seeded demo; `LATCH_RUNNER_MODE=simulation` selects browser-free deterministic runs.

## License

Released under the [MIT License](LICENSE).
