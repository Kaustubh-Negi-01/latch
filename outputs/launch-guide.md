# Latch launch guide

Latch reproduces a checkout request race: two quick **Apply Promo** clicks, followed by an older response arriving after the latest one. The sample data and amounts are synthetic.

## Local use

1. Install dependencies with `npm ci` and Chromium with `npx playwright install chromium`.
2. Start with `npm run dev`.
3. Open `http://localhost:4317` and select **1-Click Judge Demo Mode**.
4. Inspect the request order and captured checkout result. Compare the corrected implementation and download the regression evidence.

The prepared judge path needs no account, model key, microphone access, or Wispr installation. Dictate into the narration field with Wispr for a live voice demonstration.

## Production launch

The repository contains a Dockerfile and Railway configuration. The service listens on `PORT`, serves the built workbench and API together, and reports health at `/api/health`.

Private source repository: [Kaustubh-Negi-01/latch](https://github.com/Kaustubh-Negi-01/latch).

Public application: [Latch](https://latch-production-e63d.up.railway.app). The source is on branch `codex/build-latch`, and Railway's authorized GitHub connection deploys updates automatically. The service's `/api/health` endpoint identifies browser availability, runner mode, and fallback support. See the verification report for completed checks, and open the public judge path once before recording/submission.

Start a local container with `docker compose up --build -d`. The connected Railway service deploys on `git push origin codex/build-latch`.

The app controls supported request orders in shipped fixtures. Auto mode prefers Chromium and uses a visibly labeled deterministic fixture simulation if browser execution fails. Set `LATCH_RUNNER_MODE=simulation` for a browser-free host. Simulated snapshots and reports remain available, alongside executable Playwright exports. The app does not run arbitrary external applications or prove that all races are eliminated. Downloaded run evidence is temporary on the host and should be saved before a restart.
