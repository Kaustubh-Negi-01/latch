# Latch visual system

## Direction
A precision workbench with a warm daylight canvas, dark green instrument surfaces, and a copper action color. The user's reference brief expands the existing Latch identity: retain the self-hosted Manrope face, orange actions, three scenario fixtures, and the established dictation → schedule → evidence workflow. A compact scenario heading leads directly into scheduling and evidence; there is no marketing hero.

## Tokens
- Canvas #f5f5f1; panels #ffffff; primary ink #202827; secondary ink #59655f.
- Navigation #19211f; telemetry #1b2522; telemetry footer #141e1a.
- Action #b74320; hover #983415; action wash #fff0e6.
- Pass #176346 on #e9f5ee; failure #a72f2b on #fff0ed.
- Earlier request uses ochre; latest request uses blue. Request identity is independent of assertion status.
- Dark theme: canvas #131918, panels #1c2422, ink #edf1ea, secondary #afbeb5, action #ff9c70. Semantic result colors have dedicated dark counterparts.
- Typeface: Manrope Variable, self-hosted. Scenario title 22–23px at weight 800 and tracking -0.03em; control and body copy 11–13px. Platform monospace is limited to routes, fixture/engine badges, event counts, order indices, and evidence counters.
- Panel radius 12px; controls 5–7px; one-pixel separators. Restrained offset shadows lift work areas without competing with telemetry.
- Spacing base 4px; content gutters 16px mobile, 24–40px desktop.

## Composition
Persistent dark navigation at desktop left, with numeric scenario identities. The header contains the single primary execution action, Run Scenario, with a 1-click demo badge. The active scenario heading leads directly into the workbench. Request scheduling and fixture evidence occupy the wider column; narration and exports share the narrow column. At desktop widths of 1100px and above and viewport heights of 740px and above, the workbench fits the available viewport without document scrolling. The preview scales its complete 960×720 fixture viewport to fit without internal scrolling. At 1080px the workbench stacks. At 650px navigation becomes an offcanvas menu and all context panels fill the available width. Both themes preserve bright fixture contents because those are screenshots or isolated synthetic applications.

## Signature interactions
The two-lane request waterfall shows ordinal completion gates, explicitly labeled as a sequence rather than latency. Engine labels and event counts come from actual run results. A native range slider scrubs the returned screenshots and stays synchronized with accessible filmstrip buttons. Home/End and arrow keys work through native browser semantics. The waveform responds only to narration-field focus; its label says input active, never recording. Variant buttons retain aria-pressed state and the guarded selection has a clear green boundary.

## Motion and accessibility
Press feedback uses a 1px translation. Hover and focus changes use 120–180ms transitions with named properties and cubic-bezier(.22,1,.36,1). The focus waveform animates transform only; spinners appear only during pending operations. Reduced motion disables all continuous animation and transitions, retaining static focus feedback. Strong focus outlines, a skip link, semantic status text, native inputs, and body contrast are verified with Chromium and axe. No animation is driven by React render loops.

## Reference translation
Bindplane informs the separation of overview, control, and data surfaces. Intrepid's dark engineering field, orange action, and fine dividers inform the instrument palette. Hatypo and Unifiers inform type hierarchy and crisp indices; their marketing-scale compositions are reduced to fit an operating tool. Dgrees and Sparcley inform the editorial header and restrained depth. Portfoliofy and Yarnity inform tactile control feedback. The ambient dots are confined to the introductory measuring surface. No reference logos, images, fonts, or proprietary assets are copied.

## Evidence boundaries
All sample products, companies, invoices, and quote values are synthetic. Existing runners, request gates, parsers, fixture applications, and Playwright export implementations are unchanged. Browser results and simulation results remain explicitly distinguished. Public screenshots of the workbench are review artifacts, not fabricated product results.

Captured evidence uses a 360px minimum image height inside a 390px minimum browser frame, with contain/top positioning. The scrubber and frame selectors share a desktop row. Shorter viewports may scroll after a run rather than shrink the evidence; the complete guarded comparison remains within a 1920×1080 viewport.
