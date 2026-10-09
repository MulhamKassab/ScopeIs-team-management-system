# UI clarity review — 2026-10-09

Status: review completed. The Admin schedule restriction and inaccurate help corrections are implemented in the accompanying amendment. The recommendations below are proposed improvements, not delivered features.

## Assessment

The application already has a useful employee starting point: Tickets, Schedule, Vacations and My profile. Preserve these four primary destinations and the managers’ complete operational navigation. The most valuable simplification is to make each page answer three questions immediately: what needs my attention, what can I do, and what happened after I did it?

Review evidence combines current source, the canonical UI foundation/user journeys, and normal signed-in browsing of the separate fictional local demo. The employee ticket list/create/edit form was inspected on desktop and phone; ticket details and profile were inspected at 390 × 844. This is a focused usability review, not a full accessibility audit or authenticated production verification.

## Changes included now

- Admin has read-only access to schedules within existing scope. Create, assignment edits/removal, skill-requirement changes, proposals, return, revisions and publication are reserved for Super Admin and enforced on the server.
- Admin schedule entry points say **View schedules**, **Schedule details** or **View team schedules**. Lifecycle help explains the current state without asking Admin to modify it.
- Admin help says **View approved team leave**. Phase 5 permits Employee vacation submission; Admin cannot submit a personal request or view employee private reasons/balances.
- Ticket help uses **workspace → dashboard → ticket** consistently.

## Recommended next changes

| Order | Action | Concrete change | Why / evidence |
|---|---|---|---|
| 1 | Fix | Give the workspace-access picker its own server-derived eligible people list; label it **Workspace access**. | `src/modules/tickets/workspace.tsx` feeds all company people into membership management, while `service.ts`/`policy.ts` correctly reject out-of-scope choices. The ticket assignee/mention picker must stay company-wide. |
| 2 | Fix | After creation, show **Ticket created** and **Open ticket**; make **Create another** secondary. | `workspace.tsx` ignores the returned ticket ID and `forms.tsx` resets the form but keeps the dialog open with generic “Saved”. Existing filters may hide the result. Preserve failed form data and prevent double submission. |
| 3 | Change | On phone, show subject, status and task instructions first; move compact metadata and People below or into disclosures. | Browser screenshot confirms **At a glance** precedes the actual task description. `src/app/tickets.css` places the detail aside in the first grid row, while its DOM order follows the task. Align visual and reading order. |
| 4 | Add | A focused **Change status** action, with a reason when choosing On hold. Keep **Edit details** secondary. | Starting or finishing work currently requires opening the full edit form with subject, dates, priority and summary. Reuse server validation and optimistic version checks. |
| 5 | Remove clutter | Keep destination, subject/description and assignees prominent in creation. Put dates, priority and extra narratives in **More options** where safe defaults already exist. | The create dialog has several controls before the work description and two large people lists. Keep required validation and visible selected-person counts; do not hide a required decision. |
| 6 | Add | **Assigned to me / Created by me / Mentioned in / All accessible** shortcuts and relationship labels on cards. | “My tickets” combines all relationships. The local list shows editable and read-only work together. Add a minimal server-derived relationship field; do not fetch every ticket detail to infer it. |
| 7 | Change | Clickable **Workspace → Dashboard → Ticket** breadcrumbs and a return link preserving filters/layout. | Details currently show plain-text hierarchy and always return to `/tickets`. Keep a safe fallback for direct links and validate return destinations. |
| 8 | Remove clutter | Keep search/destination visible; disclose status/priority filters. Show active filter chips and **Clear filters**, including empty states. | Five filters precede results on phone. Filters survive hierarchy navigation but become hidden in Workspaces, making an empty result hard to explain. Preserve the approved persistence behavior. |
| 9 | Change | Keep ticket Overview secondary; add **Tickets** to employee Home shortcuts. Use Schedule and Vacations consistently. | Employee Home, Tickets and ticket Overview overlap. Home shortcuts omit the main ticket workflow. Managers retain operational Home and reporting. |
| 10 | Remove clutter | Keep skills prominent in My profile. Replace five full document categories with compact counts and one **Add document or experience** chooser. Guide saved items directly to Attach file. | The local profile expands Certifications, Portfolio, Project examples, CV and Supporting documents into a long phone page. Preserve each evidence type, review state, archive history and private-file boundary. |
| 11 | Change / add | Use **My vacations / Apply for vacation** consistently; preview working days and projected balance before submission. | Navigation says Vacations while the page uses My leave/Request leave. Reuse confirmed Monday–Friday and Dubai-year counting. Server checks remain authoritative. |

## Suggested delivery sequence

First fix the workspace picker and ticket success feedback. Next improve phone detail order, direct status changes and contextual navigation. Then add relationship shortcuts and simplify filters/forms. Profile consolidation and vacation previews can follow.

Avoid removing functionality merely to shorten a page. Use progressive disclosure for supporting details. Maintain keyboard access, 44px touch controls, native dialog focus/Escape behavior, responsive layouts, both themes, reduced motion and RTL logical properties. Job titles and team arrangements remain separate from system roles and ticket participation.

## Local visual evidence

Ignored review screenshots live under `test-results/ui-clarity-review-2026-10-09/`:

- `employee-ticket-phone.png`: task metadata above instructions on phone.
- `employee-profile-phone.png`: profile and all five document categories.

The accompanying permission amendment records automated checks and Admin desktop/phone screenshots. These review images contain only fictional demonstration data.
