# Latch

Make a UI timing bug repeatable. Latch turns a narrated request-order hypothesis into a constrained Playwright regression, executes it against a seeded application, and returns browser evidence and an exportable test.

The lead scenario comes from a real development problem: rapidly double-clicking **Apply Promo** starts two checkout requests, and the earlier response arrives last and corrupts the total. The shipped checkout records, quote versions, amounts, and application are synthetic demonstrations of that interaction.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open `http://localhost:4317`. Vite serves the workbench and proxies `/api` to the Fastify runner on port 4318.

For a production build:

```sh
npm run build
npm start
```

The service uses `PORT` when set. Its default port is 4318.

## Judge demo

Choose **1-Click Judge Demo Mode**. The prepared scenario runs in a real isolated Chromium context. Compare response orders and the buggy/corrected implementation, then download the actual regression evidence. No account, API key, microphone permission, or Wispr installation is required to use the seeded path.

Wispr Flow can dictate into the narration field. Latch receives the inserted text; it does not claim a direct Wispr SDK integration or certify the source of entered text. No Wispr usage statistics or recordings are invented.

## Execution boundary

The public runner accepts a finite scenario vocabulary and shipped fixtures. It controls selected HTTP response ordering with named gates. It does not execute arbitrary model-generated code, browse supplied external URLs, reproduce every source of browser nondeterminism, or certify that an application has no other races.

Synthetic fixtures intentionally contain a buggy and a corrected implementation. A failed invariant is a successful reproduction of the demonstration bug, not an infrastructure failure. Runner errors are reported separately.

Results and traces are temporary. A deployment restart may clear them. Download evidence you want to retain.

## Checks

```sh
npm run check
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deploy

The three workbench examples use dedicated checkout, Acme/Nimbus invoices, and document-search fixtures. Buggy implementations fail when the stale response returns last; guarded implementations preserve the latest state. Dictation can select a supported scenario and change its response ordering, including named workspace responses and self-corrections. Without a model key, the interface labels the bounded built-in interpreter.

The Dockerfile installs Chromium from the exact Playwright package in `package-lock.json`, builds the client, and starts the API and client on one port. Railway reads `railway.json` and checks `/api/health` before making the deployment healthy.

```sh
docker build -t latch .
docker run --rm -p 8080:8080 latch
```

For Railway, connect this repository as a service, leave its Dockerfile builder enabled, and generate a service domain. No model key is required for seeded scenarios. Optional `OPENAI_API_KEY` and `OPENAI_MODEL` belong in server-side service variables; never put keys in browser code or commit an `.env` file.

The host account may incur hosting charges. Judge access has no payment or sign-in gate.

## Build context

Built for No Hands: The Wispr Challenge, organized by WeMakeDevs and Wispr Flow. Submission deadline: 31 October 2026, 11:59 pm IST. Record genuine Wispr usage and actual personal workflow measurements separately; neither is established by the synthetic demo.
