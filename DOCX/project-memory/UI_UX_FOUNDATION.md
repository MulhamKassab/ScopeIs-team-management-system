# UI/UX Foundation

## Status

**Implemented in Phase 1**. This record is the canonical routing reference for the approved visual foundation. It does not implement or change later-phase workforce functionality.

## Identity and visual direction

ScopeIs Team Management is a light-first, professional internal operational workspace with balanced density and readable surfaces. The user-approved 2026-10-05 visual refinement extends the original quiet foundation with restrained gradients, static textures, layered shadows and short interaction animations. The official identity asset is the unchanged local copy of the official Scope Information Systems logo from `https://scopeis.com/wp-content/uploads/2021/06/SCOPE-IS-logo-min.png`; the app never hotlinks it at runtime. Its meaningful alt text is `SCOPE Information Systems`.

Primary brand color is ScopeIs blue `#163B99`; ScopeIs orange `#F26608` is a sparing accent. Light mode uses a soft neutral canvas (`#F6F7F9`), white surfaces, near-black text, accessible muted text, and cool-grey borders. Dark mode uses blue-charcoal canvas and surfaces, light text, and accessible lighter blue/orange interaction tints. Orange is not used as small body text on white or as the default button color.

## Shell and navigation

Desktop uses a collapsible left application sidebar, persistent top header, full-width work area, local collapse preference, notification shortcut, theme control, persona/role display and logout. A persistent Mock authentication marker is shown only when mock authentication is actually active. The original disabled Ticket placeholder is superseded for the authorized Company core by the 2026-10-08 requirements below.

Mobile uses a compact header plus bottom navigation of four role-specific primary destinations and `More`. The drawer exposes every remaining authorized destination; it is not a reduced-function mobile demo. Narrow layouts use full-width content and 44px-or-larger touch targets.

Navigation derives from centralized capability results on the server. Super Admin receives global management tools; Admin receives permitted scoped-management tools plus own leave/profile; Employee receives only personal, published and explicitly shared work. UI visibility is a usability aid only—the same server policy protects routes and APIs.

## Type, spacing, components, and accessibility

The application uses a local system-first readable sans-serif stack with an Arabic-compatible `Noto Sans Arabic` token and tabular-friendly system number behavior. It uses a 4px-based spacing rhythm, roughly 40px desktop controls, 44px mobile targets, 9–11px radii, and semantic primary, secondary, future-disabled, error, and state components.

The foundation targets WCAG 2.1 AA: semantic landmarks, visible focus, a skip link, keyboard controls, named icon buttons, selected navigation state, form labels, contrast-aware tokens, reduced-motion handling, and no color-only status. Empty shells explicitly identify their module, phase, purpose, and `Not implemented in Phase 1` status so later work is never misrepresented as complete.

## Theme and RTL readiness

Light is the default. Theme preference is local and non-security-sensitive; boot-time theme application prevents an incorrect-theme flash. The unchanged logo remains on a white neutral logo surface where required for dark-mode legibility.

English is the Phase 1 interface language. The root supports `dir=ltr` and `dir=rtl`; CSS uses logical inline/block properties, alignment follows direction, the sidebar direction adapts, and drawers retain logical reading order. No visible language selector or Arabic translation is included until localization is approved.

## Deferred design decisions

Detailed information architecture for employee data, schedule board density, map interactions, leave/coverage/replacement workflows, reporting visualizations, full notification centre behavior, content localization, and the final component library remain later-phase work. Their implementation must continue to follow the confirmed role, scope, privacy, and Phase 12 Ticket System boundaries.

## 2026-09-30 — Approved workflow clarity pass

The user authorized design, UI/UX, widgets, popups and workflow simplification in the existing application. This pass uses the current ScopeIs identity and working data; it does not reinterpret authorization, publication, leave policy, evidence eligibility, or the unresolved retained-history assignment-removal design.

- Group authorized navigation into daily work, people, client work, overview and administration. Keep role-specific mobile destinations and the complete More navigation. Use consistent library icons with text labels and preserve selected state on detail routes.
- Put decisions and next actions before secondary dashboard counts. Reuse existing authorized metrics and distinguish Published assignments from planning.
- Put records before creation forms. Use a focused, titled task dialog for short create/edit/request actions; keep errors and success feedback in that task context. Complex workspace navigation remains a full page.
- Dialogs must support Escape, keyboard focus containment, focus restoration, an explicit Close action and background inertness. Mobile dialogs use the available viewport with independently scrollable content.
- Make schedule month selection direct, keep lifecycle actions understandable and connect assignments to coverage without requiring users to copy internal IDs. Context remains authorized on the server.
- Use concise product language in headings and actions. Put explanatory/source details in secondary text or disclosures. Implementation phase labels are not primary navigation or task guidance.
- Keep settings honestly marked as unfinished and visually secondary. Preserve the disabled Ticket boundary until the integration is delivered.
- Preserve neutral surfaces, ScopeIs blue, restrained orange, logical CSS properties, responsive layouts, dark-mode contrast and 44px mobile controls.

Implementation and verification are recorded in the live tracker, status log and [UI/UX implementation report](../phase-reports/SCOPEIS_UI_UX_WORKFLOW_CLARITY_2026_09_30.html). Completion feedback for actions that remove their own record is retained in a page-level live region, using only the actual successful server response. The employee skills drill-down is read-only and must never promise editing rights.

## 2026-10-05 — Application-wide responsive requirements

The user requested responsive text, buttons, forms and layouts throughout the application at mobile and other screen sizes. This extends the existing visual foundation without changing any role, scope or domain decision.

- Phones and tablets through 1024px use the compact header, role-specific bottom destinations and complete More navigation. Larger viewports retain the collapsible sidebar. Visible mobile destination labels are short; accessible names retain the complete destination names. Resizing to desktop closes More and restores focus to the active sidebar destination.
- Layouts respond to the actual workspace width, including sidebar space and enlarged text. Filters, record facts, cards and workflow sections reflow without hiding page overflow. Long names, email addresses, notes, statuses and button labels wrap. Account rows become labelled cards with every credential action preserved; report comparisons retain independently scrollable, keyboard-accessible tables.
- Touch controls and disclosures have at least 44px height on compact and touch-enabled layouts. Mobile text inputs use at least 16px text to avoid browser focus zoom. Secondary labels remain readable. Browser zoom stays enabled; the checks include doubled text size.
- Native task dialogs use the available visible viewport, including the onscreen keyboard when the browser exposes VisualViewport. Their content scrolls independently, Close remains reachable, and Escape and focus restoration are preserved. Pinch zoom remains under browser control.
- Safe-area insets, dynamic viewport height, RTL logical positioning, dark native controls and reduced-motion behavior are preserved. The narrow month picker reserves room for the full month and year and moves Previous/Next to a separate row when needed.

The reusable presentation gate is `npm run test:responsive`, which runs against a built isolated copy with no `.env*` files and one owned disposable loopback database populated with fictional edge cases. Screenshot evidence and the verification receipt are stored in `DOCX/phase-reports/evidence/mobile-responsive-2026-10-05/`. Its Chrome viewport checks are bounded evidence, not a claim of physical-device, Safari/Firefox, or exhaustive accessibility certification.

## 2026-10-05 — Approved visual refinement and interaction motion

The user requested a creative, simple and sophisticated finish throughout the working application, including buttons, text inputs and popups. This explicitly expands the original prohibition on gradients and decorative animation. ScopeIs identity, readable content, responsive behavior, role boundaries and native interaction semantics remain canonical.

- Use a textured deep-blue overview header, subtle static canvas lighting, layered card surfaces, restrained shadows and consistent control radii. ScopeIs orange remains a sparing accent; actual status labels and data remain authoritative.
- Give buttons a tactile hover/press response and inputs clear borders, a visible focus outline and a soft focus halo. Preserve native date/month/select/file controls, labels, validation, browser zoom and mobile touch dimensions.
- Use short entrance animations for pages, native task dialogs, navigation sheets, account popovers, disclosures and actual feedback. The theme icon has a short transition; a spinner is permitted only for an actual pending sign-in action. Decorative textures do not move continuously.
- Keep dialog centering, visible-viewport sizing, scroll containment, Escape, focus restoration and modal background inertness. Hover movement is restricted to devices with an accurate pointer; RTL icons and active accents follow direction.
- Disable animation, transitions and decorative hover movement with reduced motion. Forced-color mode retains system-color text, visible selected destinations and control boundaries. Maintain light and dark presentation and contrast-aware focused controls.

The visual layer is `src/app/visuals.css`, imported after responsive rules while preserving their reflow, touch-target and viewport behavior. Verification extends the existing disposable-database presentation gate with both-theme focus/contrast, native modal, reduced-motion, desktop hover and forced-color checks. The original responsive evidence remains a historical receipt; the new finish is recorded separately under `DOCX/phase-reports/evidence/visual-refinement-2026-10-05/`.

## 2026-10-05 — Approved task discovery and planning workspace

The user requested a simpler, more powerful experience, proper presentation of every delivered feature, and a useful planning map before pushing the accumulated work to `main`. This authorizes presentation and navigation improvements over the existing workflows. It does not resolve retained-history assignment omission, evidence eligibility, Ticket integration, or production rollout.

- Give each role three direct dashboard starting points with a short explanation of the outcome. Employee guidance leads to their own Published workday, leave and professional profile. Management guidance leads to planning, the selected-day map and authorized team records. Publishing and leave decisions remain Super Admin-only.
- Provide a globally reachable **Find a feature** dialog. Search matches module names and everyday tasks such as CVs, certifications, notes, staffing and CSV exports. Results derive only from the server-authorized navigation already supplied to the shell; every delivered authorized destination remains discoverable, and unfinished settings or Ticket entries are not advertised as working tools.
- Keep discovery search focused on opening, support a clear no-results reset, and close the native dialog on actual navigation while restoring page scrolling. Long feature descriptions wrap at phone widths and enlarged text. Search, result links and Close remain keyboard accessible.
- Make the planning map the primary workspace after selecting a date. Disclose secondary filters on demand; keep date navigation, attention counts, fit controls and the selected assignment understandable on compact screens.
- Fit all authorized coordinates initially and on demand. Group coincident planning markers with a visible count and cycle the associated assignments without concealing them. Keep a searchable assignment list, selectable layers, clear geographic associations and actionable selected-assignment details.
- On touch screens, page scrolling is the default over the map. An explicit interaction control enables map pan and pinch; locking it restores page scrolling. Keyboard pan, zoom and fit remain available. Provider failure preserves the list and details, explains the failure and offers retry.
- Show Published status, assignment times, coordinate precision and provider attribution. Selected records link to their real schedule period and coverage review; every destination re-authorizes the request. Exact/coarse privacy and strict TEAM × operational scope stay unchanged.

`src/app/experience.css` extends the visual and responsive layers with the task guide, dashboard shortcuts and map workspace. It preserves readable mobile controls, 44px targets, logical positioning, both themes, reduced motion and forced-color boundaries. The [experience review](../phase-reports/SCOPEIS_UI_EXPERIENCE_AND_PLANNING_MAP_2026_10_05.md) and its separate evidence folder record the implemented journeys and verification scope.

## 2026-10-05 — Approved expressive motion across the application

The user requested a smooth, visibly animated and professional experience for buttons, popups, windows and text on mobile and desktop, including upward, downward and sideways movement. This extends the earlier short entrance effects while preserving a simple operational interface and every existing responsive, accessibility and authorization boundary.

- Use a shared finite motion vocabulary: content rises into place, menus drop into place, navigation and selected content enter from the logical inline direction, and dialogs or sheets return out of view when dismissed. Move headings and readable content as complete elements; never fragment operational text into animated letters or delay access to its meaning.
- Stagger content entrances over a short capped interval. The implemented content timing is 400–500ms with at most 175ms stagger; route transitions use the installed Next.js/React ViewTransition support with a 320ms directional transition and a normal navigation fallback where browser support is unavailable. Navigation must not depend on animation support or reset a task's form state for a visual effect.
- Give actual pointer and keyboard activation finite press feedback, with the implemented ripple lasting 520ms. Keep buttons and links immediately actionable; animation does not simulate a pending operation or success. Focused input labels, inline icons, account menus and disclosures share the same restrained timing language. Preserve native date/month/select/file behavior and readable labels.
- Native task dialogs and mobile navigation sheets enter in 320–360ms and exit in 180ms. During a dismiss animation, retain modal focus containment, background inertness and the existing scroll lock until the actual close; restore focus when closing finishes. Navigation dismissal remains immediate. A bounded close fallback must cover reduced motion, absent animation support and interrupted events.
- Keep content present when JavaScript, IntersectionObserver or transition APIs are unavailable. Motion observation registers new content without continually animating static data, basemap tiles or entire tables. Preserve map marker coordinates and anchoring; only inner marker icons or halos may animate.
- Retain light and dark themes, logical RTL direction, text wrapping and at least 44px compact touch targets. Do not shrink the outside hit area of a control for press feedback. Disable animation and transitions, including pseudo-elements and dialog backdrops, when reduced motion is requested; JavaScript motion registration and press feedback also respect that preference. Forced colors retain semantic boundaries and selected state.

The implementation adds `src/app/route-motion.css` and `src/app/motion.css` after the existing experience layer and a shared client motion runtime, with native dialog and shell dismissal lifecycle updates. `UI-03` in the scenario manifest registers the finite-motion, modal-focus and desktop/phone browser journey in `test/e2e/responsive.spec.ts`. The final full system lock passed 14/14 gates with all 12 presentation checks and 523 unique automated cases; all 369 frozen source/test/config inputs match. The [motion report, recording and verification receipt](../phase-reports/SCOPEIS_EXPRESSIVE_MOTION_2026_10_05.md) retain the repaired initial red attempt separately from the final green run. Earlier evidence remains unchanged.

## Confirmed monthly timetable and people catalogues — 2026-10-06

The user requested a monthly timetable showing who is where and what they are doing. Month is the default view, with People (person by day) and Agenda alternatives. Day details include employee, times, client, project, location and shared work instruction. Published work and unpublished planning have separate views; historical Published revisions are excluded from the current timetable. Employees receive only their own current Published assignments. Admin timetable reads require both current TEAM membership scope and a matching Client, Project or Location scope; Super Admin is global. No new recurrence, shift, attendance or automatic publication rules are introduced.

Teams are managed records with stable `team:` references and editable display names. The additive `0014_team_catalogue` migration backfills existing profile and scope references without moving people or changing grants. Super Admin can create and rename teams and add, move or remove members. Each profile retains its existing single team and single designation. Dedicated Designations management reuses the existing job catalogue and permits the same membership operations. Roles, job designations, membership and explicit Admin access grants remain separate. Removing membership clears only the selected assignment field and preserves the person and their history.

Employee assignments use Team and Designation dropdowns linked to their management pages. Coverage starts with visible monthly assignments, explains staffing versus qualification gaps, and separates replacing a person from adding someone alongside them. Super Admin requests say “Choose during review” and link to their own decision surface; approval still prepares a Draft and never publishes automatically. Development phase labels are removed from product copy. Native dialogs, touch targets, internal calendar/table scrolling, RTL, both themes and reduced motion remain required.

## Confirmed application-wide user journeys — 2026-10-06

The user requested a simpler, clearer story for every tab. [USER_JOURNEYS.md](USER_JOURNEYS.md) defines the purpose, audience, path and result for all 20 pages. Navigation uses everyday labels and task groups; optional native help gives two or three role-specific steps and authorized related tools. Home prioritizes decisions and core published-plan figures; supporting information remains available through disclosure. Skills has one selected-person context, coverage work is searchable and grouped by day, conversations show request identity before messages, reports have task search, and technical audit references are secondary. Job titles is the UI name for Designations; neither label changes role or access semantics. New request work context uses current database role and scope checks and is never projected to Employees. The existing accessibility, mobile, RTL, theme, privacy and finite-motion foundations remain binding.

## 2026-10-08 — Authorized Company ticket workspace

The product owner authorized the [core Company ticket workflow](PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md). The approved core is implemented and locally verified; see [the delivery report](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md). The earlier disabled-ticket guidance is historical for this delivered slice; unfinished settings remain secondary and clearly labelled.

- Employees land on Tickets after sign-in and root visits, subject to the existing required-password-change gate. Their four primary destinations are Tickets, Schedule, Vacations and My profile. My profile includes their own recorded skills; the standalone Skills destination is no longer a primary Employee tab. Home, Notifications and authorized My requests remain discoverable through secondary navigation.
- Managers retain their existing primary destinations and full authorized tools, with Tickets added. Ticket access never removes a management tool or widens a workforce capability.
- Keep Company Overview and operational Tickets in one workspace. Search, workspace, board, status and priority filters are retained when changing views. List and Board show the same authorized records. Employees default to operational Tickets; managers can begin with the overview.
- Use focused task dialogs for creation, membership, board lifecycle and ticket edits. Detail pages bring ticket content, people, work logs and private files together with permission-specific actions. Status and priority use readable text; On hold explains its required reason.
- A read-only observer sees the ticket and its permitted history without edit, work-log, upload, participation or archive actions. Creator and assignee actions follow the server's current permissions. Membership and participant removal immediately change subsequent access.
- Show stale-write feedback in the task context with an explicit reload of the current record. Retain history through Archive and Restore. Do not silently overwrite a newer edit or promise permanent deletion.
- Filters, ticket facts, cards, board columns and actions must reflow or provide a labelled internal scroll region at narrow widths. Preserve 44px compact controls, keyboard-operable dialogs, focus restoration, RTL logical properties, both themes and reduced motion.

Daily work lists, flowchart editing, cost/PDF reports, reminders and future schedule/coverage handoffs are outside this first delivery. Ticket work logs represent recorded ticket effort; they do not replace the authoritative schedule or attendance policy.
