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

Railway service domain has been allocated: [Latch](https://latch-production-e63d.up.railway.app). Deployment and public execution verification are pending. An allocated domain is not a successful deployment; do not submit it until the health and judge-demo checks pass.

The app controls supported request orders in shipped fixtures. It does not run arbitrary external applications or prove that all races are eliminated. Downloaded run evidence is temporary on the host and should be saved before a restart.
