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
