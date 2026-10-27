# Frontend design review

Verified 27 October 2026. [Live Latch](https://latch-production-e63d.up.railway.app).

| Before | After | Why |
| --- | --- | --- |
| Small single-line introduction | 43–60px two-line Manrope heading, copper emphasis, ambient measuring dots | Establish the task before the controls |
| Pale request lanes | Dark instrument surface, ordinal gate ruler, request identities, actual engine and event metadata | Make response order immediately legible |
| Judge entry only in the introduction | Original one-click action plus compact sticky header action | Keep demo access available during evidence review |
| Filmstrip alone | Native keyboard-accessible screenshot scrubber plus synchronized filmstrip | Inspect the captured sequence with pointer, touch or keyboard |
| Static narration framing | Focus-driven transform waveform and explicit input-active label | Signal the dictation target without claiming audio capture |
| One light palette | Light and dark semantic tokens throughout workbench, history, help and code preview | Maintain contrast across both viewing conditions |
| Mobile panels shrink to content | Full-width panels from 320px, stacked tablet workbench | Preserve readable narration and evidence controls |

## Reference choices

The supplied home pages were inspected in Chromium at 1440px and their heading/font information sampled. Hatypo uses approximately 86px Gilroy headings; Dgrees uses roughly 89px Pastiche Grotesque; Unifiers uses 260px Anton display lettering. Latch retains its own Manrope font and reduces the display scale to serve an operating screen. Intrepid's dark field, orange action and precision dividers guide the instrument palette. Bindplane's separation between headline, control and product data informs telemetry framing. Sparcley, Portfoliofy and Yarnity contribute hierarchy and tactile interaction cues. No reference assets are reused.

Sources: [Bindplane](https://bindplane.com), [Intrepid](https://www.intrepidautomation.com), [Dgrees](https://dgrees.studio), [Sparcley](https://sparcley.co.uk), [Hatypo](https://www.hatypo.studio), [Unifiers](https://unifiersofjapan.framer.website), [Portfoliofy](https://portfoliofy.io), [Yarnity](https://yarnity.webflow.io).

## Verification

- TypeScript/Vite build and ESLint pass with zero errors.
- 58 existing unit/API tests pass.
- 11 Chromium browser tests pass against the production build locally.
- All three fixtures, Buggy/Guarded modes and both response orders preserve their existing outcomes.
- Screenshots, generated tests, browser traces and regression bundle downloads pass.
- Light/dark automated WCAG A/AA checks pass, including a completed guarded result.
- No horizontal page overflow at 320, 390, 768, 1024 or 1440px in either theme.
- Keyboard Home/End scrubbing changes the selected screenshot and filmstrip state.
- Focus waveform becomes static under reduced motion; mobile navigation also disables transitions.
- Backend runner, domain and public fixture files are byte-for-byte unchanged, verified with SHA-256 manifests.

## Screenshots

[Light desktop](design/light-desktop.png) · [Dark desktop](design/dark-desktop.png) · [Light mobile](design/light-mobile.png) · [Dark mobile](design/dark-mobile.png).
