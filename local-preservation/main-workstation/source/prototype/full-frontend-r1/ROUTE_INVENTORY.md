# Route inventory

| Route | Purpose | Super Admin | Admin | Employee |
|---|---|:---:|:---:|:---:|
| `/login` | Fictional persona entry | Yes | Yes | Yes |
| `/`, `/dashboard` | Role-aware operational dashboard | Org | Team | Self |
| `/employees`, `/employees/new`, `/employees/:id` | Workforce directory, create form, profile tabs | Full | Scoped | Denied |
| `/profile`, `/evidence` | Personal profile and qualification evidence | Self | Self | Self |
| `/skills` | Skill catalogue and coverage context | Full | Scoped | Denied |
| `/clients`, `/clients/new`, `/clients/:id` | Client coordination, create form, detail tabs | Manage | Manage | Read |
| `/projects`, `/projects/new`, `/projects/:id` | Project context, requirements, team, schedule | Manage | Scoped manage | Read |
| `/locations`, `/locations/new`, `/locations/:id` | Work location context and schedule | Full detail | Scoped/restricted detail | Read/restricted detail |
| `/schedule`, `/my-schedule` | Review Command schedule / Published self schedule | Publish | Draft and propose | Published self only |
| `/leave` | Leave request, availability, decision flow | Decide/private reason | Scoped availability/no reason | Own requests |
| `/coverage`, `/coverage/:skill` | Explainable coverage and gap detail | Full | Scoped | Denied |
| `/replacements`, `/replacements/:id` | Advisory candidates and human decision | Final decision | Submit/view | Denied |
| `/map` | Stored-location planning map | Full | Scoped | Denied |
| `/requests`, `/requests/:id` | Assignment request discussions | All in scope | Team scope | Participant only |
| `/notifications` | In-app notification centre | Own/affected | Own/affected | Own/affected |
| `/reports` | Operational summary cards | Organization | Team | Denied |
| `/audit` | Filtered audit preview | Full | Denied | Denied |
| `/settings` | Prototype settings and boundaries | Full | Denied | Denied |
| `/ticket-system`, `/tickets` | Phase 12 explanatory future state | Explanatory | Explanatory | Explanatory |
| Any unknown route | Styled 404 with recovery | Yes | Yes | Yes |

`/new` routes are protected by the same role checks as their parent management areas. All persistence is simulated with `localStorage`.

