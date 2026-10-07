# QA matrix

## Role and privacy checks

| Scenario | Expected result | Status |
|---|---|:---:|
| Nora publishes Proposed schedule | Override reason required; state, notifications, and audit preview update | Pass |
| Ava/Ben review schedule | Team scope; may draft/propose; publish control disabled | Pass |
| Maya/Omar open schedule | Only own Published assignments; no Draft/Proposed planning | Pass |
| Admin opens leave | Scoped unavailability shown; private reason hidden; no approve/reject controls | Pass |
| Employee opens leave | Own requests only; can submit full-date request | Pass |
| Admin opens replacement | May submit/view; cannot make final decision | Pass |
| Employee opens `/map`, `/employees`, `/coverage`, `/reports` | Access denied screen | Pass |
| Admin opens `/audit` or `/settings` | Access denied screen | Pass |
| Employee opens requests | Participant-scoped list and discussion | Pass |
| Any persona changes role in switcher | Navigation and route scope update; returns to dashboard | Pass |

## Workflow checks

| Workflow | Expected result | Status |
|---|---|:---:|
| Schedule filters and conflict-only view | Grid filters without page reload | Pass |
| Assignment select/edit/duplicate/remove | Inspector and drawer update local demo state | Pass |
| Draft → Proposed | State rail and actions update | Pass |
| Proposed → Published | Mandatory reason, notification, and audit event | Pass |
| Leave request/decision | Request status and notification/audit state update | Pass |
| Replacement decision | Candidate remains advisory; Super Admin confirms outcome | Pass |
| Shared notes/discussions | New fictional entry appears immediately | Pass |
| Notifications | Mark read/unread and archive update local state | Pass |
| Reset demo | Restores linked seed fixtures | Pass |
| Theme and RTL preview | Shell and content switch without reload | Pass |

## Automated checks

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm run build` | Pass |
| `npm run test:sites` | Pass, 4/4 tests |

Responsive and source-comparison findings are recorded in [design-qa.md](./design-qa.md).

