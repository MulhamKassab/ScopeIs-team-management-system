# Design QA — Review Command

## Comparison context

- Source: `design/reference-review-command.png`
- Source pixels: 1487 × 1058
- Implementation: `qa/schedule-1440x900.png`
- Implementation pixels / viewport: 1440 × 900
- State: Nora Albright · Super Admin · September 2026 · Proposed · scarce-skill conflict inspector open
- Focused region: complete shell, schedule review rail, command bar, filters, planning grid, and conflict inspector

The source and implementation were opened together in the same visual comparison pass. The implementation preserves the source’s core hierarchy: fixed white navigation, narrow utility header, neutral planning canvas, stepped Draft/Proposed/Published review state, compact controls, dense schedule grid, sparse semantic color, and right-side conflict review.

## Iteration history

### Pass 1

- **P1 · Layout/readability:** two overlapping Cora Bell assignments occupied the same visual lane, causing clipped, obscured card content. Source evidence showed conflicts as readable, individually selectable schedule cells. Implementation evidence was the first 1440 × 900 capture. Fixed in `src/pages/schedule.tsx` and `src/styles.css` by creating explicit per-employee schedule lanes and spanning the employee/day cells across those lanes.
- **P2 · Tooling:** TypeScript JSX routing file extension and ESLint TypeScript parsing were incomplete. Fixed the extension and parser configuration before browser QA.

### Pass 2

- Desktop comparison passed after the lane fix. No overlapping conflict cards remained.
- Tablet inspector behaves as a right-side drawer and keeps a visible close control.
- Mobile inspector becomes a full-width task surface; closing it reveals the review rail, publish/return actions, filters, horizontally scrollable schedule, and fixed bottom navigation.
- No body-level horizontal overflow was found at 1024, 768, or 390 CSS pixels. The schedule itself scrolls inside its labeled region as intended.

## Responsive evidence

| Viewport | Capture | Result |
|---|---|---|
| 1440 × 900 | `qa/schedule-1440x900.png` | Pass |
| 1024 × 768 | `qa/schedule-1024x768.png` | Pass |
| 768 × 1024 | `qa/schedule-768x1024.png` | Pass |
| 390 × 844, inspector open | `qa/schedule-390x844.png` | Pass |
| 390 × 844, inspector closed | `qa/schedule-390x844-closed.png` | Pass |

## Rubric result

- Typography: compact sans-serif hierarchy, readable labels, deterministic truncation in dense cells — passed.
- Spacing/layout: source-like dense command workspace, stable shell, separate conflict inspector, internal grid scrolling — passed.
- Colors/tokens: ScopeIs blue, sparse orange accent, semantic red/green/amber, no gradients or glass effects — passed.
- Assets/icons: official local Scope logo, Tabler icon family, generated provider-neutral raster map; no handcrafted SVG/CSS art substitutes — passed.
- Content: fictional yet internally linked operational copy; authority and privacy language is explicit — passed.
- States/interactions: review transitions, required publication reason, assignment editor, closeable inspector, disabled authority states, role switching — passed.
- Accessibility: semantic controls/landmarks, labels, focus-visible styling, keyboard alternatives to drag-and-drop, mobile tap targets, RTL preview — passed.

Final status: **passed**.

