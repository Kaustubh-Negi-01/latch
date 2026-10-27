# Latch — submission package

**Track:** Builders · Solo entry  
**Working product:** https://latch-production-e63d.up.railway.app  
**Entry action:** 1-Click Judge Demo Mode · no account or setup required

## Project summary — ready to paste

Latch turns a spoken timing-bug description into a repeatable regression test. It started with a bug in my own work: double-clicking Apply Promo fired concurrent checkout requests, and the earlier, slower response arrived last and corrupted the total. Developers can dictate actions and response order through Wispr Flow, reproduce the failure, compare a guarded implementation, and download a runnable Playwright test with its fixtures. I used Wispr Flow to dictate build requirements and iterations, and the product accepts the same spoken debugging workflow. The public judge demo is preloaded and requires no login. Browser execution and deterministic fallback simulation are clearly distinguished.

## 90-second demo — recording plan

Speak the 181 words below, including the two dictated corrections. Bracketed instructions are visual cues, not narration. At a measured 140–150 words per minute, the narration leaves approximately 12–18 seconds for clicks and response waits within 90 seconds. Rehearse once with the deployed runner and keep the UI visible during waits.

### 0:00–0:22 — show the problem

[Open the public URL. Click **1-Click Judge Demo Mode**. Show **Race reproduced**, expected 129.00, observed 149.00.]

“I built Latch because a double-click broke my checkout. Two promo requests started together. The older, slower response arrived last and overwrote the correct total. Reproducing that timing was the frustrating part.

One click loads the example. The latest quote should win, but the buggy app shows one hundred forty-nine dollars.”

### 0:22–0:44 — show Wispr changing behavior

[Focus the narration box. Use Wispr Flow to dictate the quoted instruction. Click **Update scenario**, then **Run scenario**. Point to the changed lanes and passing assertion.]

“Now I use Wispr Flow to change the experiment: ‘Keep this checkout, but let the first request finish first.’

Update scenario changes the response order. Run it again, and the total stays correct. The same code behaves differently when the responses arrive differently.”

### 0:44–1:08 — demonstrate the regression and guard

[Dictate the next correction through Wispr. Click **Update scenario**, then **Run scenario** to show $149 again. Click **Guarded app**, then **Run scenario** to show $129.]

“Let’s restore the dangerous order: ‘Let the second request finish first.’

The bug returns. Now I switch to Guarded app and run that identical order. The latest-request guard ignores the stale response. The checkout stays at one hundred twenty-nine dollars, and the assertion passes.”

### 1:08–1:30 — leave with an executable artifact

[Click **Playwright test**, show the assertion, close it, and click **Download regression bundle**. End on the workbench and visible public URL.]

“This is more than a description. I can inspect the test and download the fixtures, request gates, and regression. Latch preserves my debugging explanation as something I can run again.

Judges can try the same workflow on this public link, without signing up.”

## Recording accuracy

- Use the live Wispr desktop overlay when dictating; do not substitute an animated waveform or prerecorded transcript.
- The preferred recording uses Chromium and the **Captured in Chromium** label. If the host falls back, keep the **Deterministic simulation** notice visible and explain it. Simulation snapshots are modeled images; the download becomes a simulation report, not a browser trace. The Playwright test remains executable.
- The checkout interaction comes from my own reported bug. Quote versions, amounts, products, invoices, and companies are synthetic demonstration data.
- Attach a genuine Wispr Insights usage-card screenshot and the actual demo video URL to the submission. Neither has been generated or claimed by this package.
- Do not claim measured time savings, universal bug detection, or guaranteed behavior on every hosting platform.

## Submission checklist

- Working project URL opens without login.
- Judge Demo Mode, dictation corrections, guarded comparison, screenshots and bundle download are verified.
- Demo video is at most two minutes; the script above targets 90 seconds.
- Genuine Wispr usage card is attached.
- Add the video URL in the submission form after recording.
- Submit before the organizer's current cutoff; the confirmed schedule is 31 October 2026 at 11:59 pm IST. Keep the planned 30 October buffer.
