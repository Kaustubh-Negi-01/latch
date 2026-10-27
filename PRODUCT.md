# Latch

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated and confirmed through the accepted implementation blueprint: React, TypeScript, Vite, Fastify, Zod, Playwright and Docker. One Docker-capable public service is the deployment target. Provider credentials and hosting connection are not yet present.

## Users
Solo developers investigating intermittent UI timing bugs, and hackathon judges evaluating a self-contained public demonstration.

## Product Purpose
Turn a dictated hypothesis about request completion order into a repeatable Playwright regression and inspectable browser evidence.

## Positioning
Compile explicit event order and a state invariant from narration. Hold and release named network requests, compare seeded buggy/corrected implementations, and export the executed regression.

## Operating Context
The user is building through Wispr Flow for No Hands: The Wispr Challenge, due 31 October 2026 at 11:59 pm IST. The user confirmed Latch after reviewing the architecture and three candidate concepts. Wispr inserts dictation into a normal text field; no direct Wispr SDK integration is claimed.

## Capabilities and Constraints
One-click judge demo; anonymous use; realistic synthetic billing data; live Playwright runs; dictation revisions; request timeline; actual screenshots and browser traces. Auto mode falls back to a finite deterministic fixture model if Chromium cannot run; simulation snapshots/reports are explicitly labeled. Both engines export executable Playwright tests. Public execution supports shipped fixtures, not arbitrary external URLs or executable model output. Selected HTTP ordering is controlled; universal determinism is not claimed.

## Brand Commitments
Name: Latch. Plain, precise, confident language. No invented customers, performance claims, usage counts, testimonials, or voice recordings.

## Evidence on Hand
The user supplied an actual checkout race: rapidly double-clicking Apply Promo fired concurrent API calls, and the earlier slower response arrived last and corrupted the total. That interaction is the lead scenario. The checkout records, quote versions, amounts, companies and all other fixture data are explicitly synthetic. No measured time savings or Wispr usage totals have been supplied.

## Product Principles
- Every displayed run result identifies whether it comes from browser execution or a deterministic fixture model.
- A useful regression is the durable output.
- The sample path requires no accounts, credentials or microphone permissions.
- Interpretation uncertainty is visible and recoverable.

## Accessibility & Inclusion
Keyboard-operable controls, visible focus, sufficient text contrast, responsive layout, textual status alongside color, and reduced-motion support.
