# ScopeIs preview design QA

## Reference and method

- Approved source: `prototype/full-frontend-r1` in the original repository, treated as read-only.
- Reference captures: `DOCX/phase-reports/assets/scopeis-preview-r1/prototype-*.png`.
- Integrated application captures: `DOCX/phase-reports/assets/scopeis-preview-r1/app-*.png`.
- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844.
- The approved login reference and integrated real login were reviewed together at the same desktop viewport. The real application intentionally substitutes accurate Phase 1–2 copy and server-backed behavior for prototype-only claims.

## QA passes

| Surface | Result | Evidence |
| --- | --- | --- |
| Typography and hierarchy | Passed | Dense system typography, uppercase group labels, compact card/table hierarchy, and readable form labels match the approved direction. |
| Layout and spacing | Passed | 260 px desktop sidebar, 60 px top bar, neutral canvas, compact cards, 10 px radii, and dense table/form spacing are consistent across working routes. |
| Color and contrast | Passed | ScopeIs blue `#163B99`, sparse orange `#F26608`, neutral surfaces, semantic success/danger states, visible focus rings, and dark tokens were inspected. |
| Icons and assets | Passed | Official local Scope logo and one consistent Tabler outline-icon family; no text glyphs, fake SVGs, or decorative controls remain. |
| Desktop resilience | Passed | Login, dashboard, employee directory, create panel, management detail, scoped Admin detail, self profile, and Schedule placeholder show no horizontal overflow at 1440 px. |
| Mobile resilience | Passed | 390 px shell, bottom navigation, More sheet, cards, employee journeys, light/dark, and RTL have no horizontal overflow or clipped actions. |
| Role boundaries | Passed | Super Admin controls remain discoverable; Admin has no management controls or protected contact/location data; Employee has no employee-directory navigation. |
| Honest later modules | Passed | Later-phase routes contain no persistence controls or fake success actions and explicitly state that they are preview-only/unimplemented. |
| Interactions and states | Passed | Persona selection, search/filter, create/manage/profile forms, responsive navigation, theme, direction, validation, success/error, empty, not-found, and confirmation paths were exercised or covered by tests. |
| Accessibility | Passed | Semantic landmarks, labels, headings, keyboard focus indicators, skip link, touch targets, reduced-motion handling, and logical RTL styles are present. |

## Corrections made during QA

1. Removed a route-level loading boundary after it changed unauthorized streamed `notFound()` responses from HTTP 404 to 200.
2. Reworked the employee-creation panel into labelled field groups with a two-column desktop and one-column mobile layout.
3. Matched the approved desktop persona chooser with five dense persona cards.
4. Restored the full official logo at mobile size instead of cropping it.
5. Added bidi plaintext handling for English QA copy under RTL while preserving logical layout mirroring.
6. Updated the E2E logout helper to execute in the page context so the browser cookie jar receives the real logout response.

## Known intentional differences

- Prototype Schedule and later-module screens use browser-only mocked interactions. The integrated application replaces those with honest planned-phase shells because those backends are outside Phase 1–2.
- The real login copy describes the guarded disposable environment and actual server authorization rather than claiming a frontend-only concept.
- Mock authentication remains the existing temporary Phase 1 mechanism; no production authentication or credentials were introduced.

final result: passed

## Follow-up: busy fixture week and map routes

- The same schedule surface now derives 82 additional deterministic fixture assignments across 14–18 September 2026. The global board contains 89 assignments in total; this adds density without adding a second data graph or a persistence claim.
- Every active planning employee now has an approximate fictional planning-area coordinate. The map deduplicates worksite markers, so a busy date remains selectable instead of drawing inaccessible, stacked location pins.
- Each visible worksite popup presents the location, client, project, and Published assignment count, then provides fixture-route links to that project and location for the current persona. The route links are created only after the shared map selector applies role and TEAM scope.
- Verification after the update: TypeScript, ESLint, 7 Preview fixture tests, production build, `git diff --check`, and both local `/schedule?persona=nora` and `/map?persona=nora` route responses passed. The running Preview server is `http://[::1]:3201`.

final result: passed

---

# Schedule planning board update — design QA

## Comparison target and evidence

- Source visual truth: `/var/folders/ws/m1w7xm2s489c8q298j6z43s00000gn/T/codex-clipboard-d2aed03b-df4c-479f-af0e-e5ae630804ff.png` (1487 × 1058 pixels).
- Rendered implementation: `http://localhost:3201/schedule?persona=nora`, captured and inspected in the Codex in-app Browser at 1440 × 900 CSS pixels, device scale factor 1. The in-app Browser capture is ephemeral and has no exported filesystem path.
- State normalized for comparison: light theme, Super Admin, September 2026 weekly planning board, populated assignments, default filter state, detail rail visible. The source contains different fictional records and a 1487-pixel-wide browser crop; the comparison used the shared planning content area rather than browser chrome.
- Responsive evidence: the same route was also inspected at 390 × 844 for Cora Bell. No horizontal overflow occurred; employee state controls exposed Published only, and the weekly grid remained usable in its scroll container.

## Findings and comparison history

- [P1, fixed] Filtered employee rows did not consistently reflect Client and Location filter choices.
  - Location: `src/preview/schedule-workspace.tsx`, displayed-person selector.
  - Evidence: a filtered assignment set could narrow the cards while unrelated employees stayed visible in the grid.
  - Fix: made the displayed-person selector derive Client and Location results from the shared filtered assignment graph. Team Alpha plus Published now shows 10 rows and no Team Bravo employee.
  - Post-fix evidence: the assignment detail for Cora Bell remained accurate; Super Admin publication actions remained visibly disabled; the in-app Browser reported zero console errors.

- No actionable P0/P1/P2 visual differences remain. Intentional product differences are that the board uses ScopeIs Preview fixture names and keeps every mutation visibly disabled, rather than presenting mock persistence.

## Fidelity surfaces

| Surface | Result |
| --- | --- |
| Fonts and typography | Passed — compact system sans typography, strong page hierarchy, small table metadata, and readable assignment labels preserve the reference’s dense operational rhythm. |
| Spacing and layout rhythm | Passed — period controls, state tabs, segmented filters, attention bar, weekly employee-by-day grid, and 285 px detail rail follow the reference’s composition while preserving the existing Preview shell. |
| Colors and visual tokens | Passed — the existing ScopeIs blue, neutral surfaces, pale assignment-state fills, and restrained warning treatment give states enough distinction without introducing a competing theme. |
| Image and asset fidelity | Passed — this schedule surface contains no source imagery needing replacement; the existing branded shell is retained. |
| Copy and content | Passed — copy accurately calls out the read-only fixture demonstration, and disabled mutation controls explicitly avoid persistence claims. |

## Interaction and accessibility checks

- Week navigation, state tabs, five fixture-backed filters, clear filters, assignment selection, and responsive detail presentation were exercised.
- Selected assignment content is exposed through a labelled detail region; control labels and visible focus treatment come from the existing Preview design system.
- At 390 px, the controls stack without horizontal page overflow; the intentional grid scroll remains confined to the schedule grid.

## Implementation checklist

- [x] Replace the former simple assignment list with a weekly employee planning board.
- [x] Add fixture-backed period, state, employee, team, skill, client, and location controls.
- [x] Add an assignment detail rail and make business mutations clearly non-persistent.
- [x] Verify desktop and mobile rendering, filtering, persona limits, build, lint, typecheck, unit tests, and diff whitespace.

final result: passed

---

# R2 rich operational demonstration — design QA

## Source and method

- Visual baseline: the existing ScopeIs Preview design system and the approved Schedule planning-board reference recorded above.
- Desktop QA: 1440 × 900 in the Codex in-app Browser.
- Mobile QA: 390 × 844 in the Codex in-app Browser.
- Tested source: local `preview` worktree at `http://localhost:3201`, using only fictional fixture personas.

## Results

| Surface | Result |
| --- | --- |
| Rich data hierarchy | Passed — concise cards, dense tables, overview metrics, and large drill-down overlays reuse the existing ScopeIs visual language. |
| Employee capability overlay | Passed — skills, certification, portfolio, schedule, leave, and authorized management sections are grouped in an Escape-closeable dialog. |
| Client/project drill-down | Passed — project details open above client context and expose Back to client. |
| Schedule alternatives | Passed — Schedule 1, 2, and 3 are visually distinct while preserving filters and fixture state. |
| Desktop density | Passed — the 1440 px planner retains dense rows, visible detail rail, and non-persistent action explanation without clipping. |
| Mobile resilience | Passed — 390 px Cora schedule measured 375 px document width, stacked controls, and no page-level horizontal overflow. |
| Role/privacy presentation | Passed — Cora and Dan are rejected from direct management URLs; Ava’s inspected skill detail omits Ben; opposite-team map labels are absent. |
| Console | Passed — no browser console errors on exercised schedule, overlay, map, or role views. |

No P0, P1, or P2 visual issues remained in the exercised R2 flows. The intentional constraint is that all mutations remain non-persistent Preview demonstrations.

final result: passed
