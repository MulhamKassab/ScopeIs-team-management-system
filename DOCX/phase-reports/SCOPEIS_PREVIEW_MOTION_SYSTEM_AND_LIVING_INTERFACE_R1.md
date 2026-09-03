# ScopeIs Preview — Complete Motion System and Living Interface R1

## Classification

Preview-only frontend presentation work. It is not a real-product phase, persistence implementation, authentication implementation, or evidence that deferred backend work is complete.

## Custody and synchronization

- Starting Preview HEAD: `ca0e1f86d78bd1a158cd904547d819ac3867f0d1` (`docs(preview): record R2 deployment check`).
- Starting `origin/preview`: the same commit.
- Starting `origin/main`: `99199353f92057184cb7bd2ea97b010915a7f40d`.
- The rich operational R2 prerequisite was already committed in `7ed0b346138daa6f2f088bf627c9bf54d71a3072`; no obsolete-screen motion pass was made.
- `origin/main` did not need a new synchronization merge: the Preview history already contained the documented compatible synchronization point.
- Five unrelated untracked duplicate UI files in the Preview worktree were preserved, unedited, and unstaged. The dirty `main` worktree was not opened for edits.

## Motion decision and tokens

The only added runtime dependency is [Motion for React](https://motion.dev/) `13.2.0`. It supplies coordinated route, overlay, schedule-view, and counter transitions without a second animation framework. The central Preview-only module is `src/preview/motion-system.tsx`.

| Token | Value | Use |
| --- | ---: | --- |
| Immediate | 100 ms | immediate feedback |
| Fast | 160 ms | hover, press, active state |
| Normal | 240 ms | route and grouped reveal |
| Expressive | 380 ms | persona entrance and overlays |
| Distance | 8 px | restrained content reveal |
| Press scale | 0.98 | enabled controls only |

`MotionProvider` uses Motion's user reduced-motion mode. `PageTransition`, `AnimatedCounter`, and `LoadingSkeleton` are reusable primitives. `src/app/motion.css` is the shared CSS companion: it intentionally enumerates transitioned properties and never uses `transition: all`.

## Motion and loading inventory

- Persona selection: staggered card reveal plus focused hover/press feedback; interaction remains immediate.
- Shell/navigation: route-keyed content transition, active navigation underline/accent, theme and header-control transitions.
- Dashboard: capped KPI/card group reveal and counts that animate once to their actual fixture value.
- Dense cards/tables: grouped, capped reveal; rows/cards have selected and press feedback without animating individual cells.
- Schedule 1/2/3: restrained keyed layout transition, selected-state elevation, warning-once treatment, button and tab feedback; the grid geometry remains stable.
- Rich operational overlays: backdrop fade and dialog scale/fade entry with retained Escape close, focus trap, and close-button focus behavior.
- Map: no marker movement. The dynamic Leaflet boundary now uses a map-shaped skeleton, fades into the ready map, gives markers a one-time entry and selected ring, and retains list/marker selection, fit/reset, tile fallback, OpenStreetMap attribution, and route links.
- Loading: replaces the previous plain Preview/map loading paragraphs with labelled skeletons; there are no artificial delays or fake server-request messages.

## Accessibility and reduced motion

- `prefers-reduced-motion: reduce` disables CSS reveal/shimmer/warning/marker motion, removes transition effects where appropriate, removes overlay blur, and keeps static final content visible.
- Motion for React uses `reducedMotion="user"`; animated counters directly render their final values in that mode.
- Disabled demonstration controls are not lifted, pressed, or presented as successful operations.
- Dialogs remain labelled, modal, Escape-closeable, focus-trapped, and initially focus their Close control. Page content has a skip-link target.

## Verification

| Command / check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test:preview` | Passed: 2 files, 12 tests |
| `npm run build` | Passed |
| credential-free `npm run build` with all PostgreSQL, Neon, Blob, mock-auth, E2E, and Preview-bootstrap variables removed | Passed |
| `git diff --check` | Passed |
| Preview-source scan for database client/repository/Drizzle/Neon/Blob/fetch/geolocation references | No matches in the active Preview/app tree |

The motion test covers centralized timing/reduced motion, skeleton/route transition wiring, no `transition: all`, overlay keyboard semantics, schedule transition wiring, and map presentation-only boundaries. Existing fixture tests retain the role, scope, privacy, route, fixture, and persistence-boundary assertions.

## Bundle observation

The local `.next/static/chunks` directory changed from 912 KiB blocks before the library install to 1072 KiB blocks after the build: approximately **+160 KiB blocks**. This is a coarse emitted-directory comparison, not a gzip or route-specific transfer metric. Map code remains dynamically imported and Motion uses `LazyMotion` with `domAnimation`.

## Browser interaction QA

The selected Codex in-app Browser exercised the local Preview at `http://localhost:3201` at its available 1280 × 720 viewport. The existing R2 1440 × 900 and 390 × 844 visual evidence remains recorded in `design-qa.md`; this phase additionally checked live interaction, not only screenshots.

- Nora: Dashboard/schedule navigation; Schedule 1 → 2 → 3 → 1, week navigation, state/filter controls, and disabled publication controls behaved without errors.
- Map: dynamic map reached ready state; OSM attribution, Leaflet zoom controls, markers, worksite popup, project/location links, fit/reset controls, and the non-live wording were present. Browser logs contained only expected React/Next development messages and no errors.
- Scope: Ava's map DOM contained no Team Bravo label; Cora's navigation omitted Planning map. Direct Cora map navigation did not expose map content.
- Overlay: employee detail dialog opened with focus on Close; Escape removed the dialog (`role="dialog"` count changed from 1 to 0).
- Theme: dark-theme switch updated the document theme; no horizontal overflow at the tested width.

The in-app Browser API did not expose viewport resizing in this run, so the prior mobile capture remains the mobile evidence while reduced-motion behavior is covered by the media-query implementation and automated checks. This is a QA limitation, not a claim of a fresh 390 px motion capture.

## Files changed

- `package.json`, `package-lock.json`
- `src/app/layout.tsx`, `src/app/motion.css`
- `src/preview/motion-system.tsx`
- `src/preview/preview-app.tsx`
- `src/preview/schedule-workspace.tsx`
- `src/preview/rich-operational-workspaces.tsx`
- `src/preview/interactive-planning-map.tsx`
- `test/unit/preview-motion.test.ts`
- `design-qa.md`

## Boundaries and limitations

- Preview remains typed-fixture driven, database-free, storage-free, credential-free, and non-persistent.
- No API, database, Neon, Blob, authentication provider, analytics provider, GPS, browser geolocation, geocoding, routing, or live tracking was added. OpenStreetMap tiles remain the sole permitted external map request.
- No Production resource, Vercel Production configuration, Neon project, Blob store, main branch, or production deployment was accessed or changed.
- Chart-level choreography is constrained to the current fixture dashboards, whose existing progress/chart-like elements retain native rendering rather than receiving an additional chart library.
- Overlay exit definitions are provided for Motion coordination; the existing role/privacy selectors and focus-trap logic were preserved without turning presentation dialogs into persistent workflows.
