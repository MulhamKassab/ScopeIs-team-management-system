# Production workforce profile and page-access repair — 2026-10-06

## User request and diagnosis

The user reported that Nora's directory showed only Mulham Kassab and pages such
as My Profile displayed the generic error page. Live checks reproduced My Profile
HTTP 500 for all five demo accounts and Employee Skills HTTP 500 for Cora and Dan.
The previous sign-in check covered login/dashboard/logout, not these pages.

The five login accounts existed without `employee_profiles` rows. The directory
correctly reads workforce profiles and therefore contained only the existing
Mulham record. An account count had incorrectly been treated as proof of a
workforce count. No extra employee data is assumed from the login fixtures.

## Repair

- My Profile and Employee Skills render actionable setup states for the specific
  missing-profile domain error; unexpected failures are not concealed.
- Super Admin can explicitly complete an active account's missing workforce link.
  The service reauthorizes against the database, locks the target, allocates the
  normal employee code and atomically creates the profile and one audit event.
- Repeated/concurrent completion preserves an existing profile. Credentials,
  roles, scopes, sessions and Mulham's existing record remain untouched.
- No migration, production fixture seed, invented team, job, contact or skill.

The authorized production target remains Vercel `mu-ka7` /
`scopeis-team-management-system` and Neon `morning-flower-68935124` /
`br-empty-fog-avl4wjxn`. The prior cutover recovery receipt is preserved separately.
This repair uses the authenticated application service, without schema changes.

## Verification before deployment

Clean clone based on `76557eb34d35daf56f45d71165746fe95974e713` with the exact
changed source copied from the user's checkout; only `.env.test` supplied to
strict disposable database runners. Production environment files were excluded.

- Account service: 30 passing tests, including completion concurrency,
  idempotence, rollback, stale actors and role/input refusals.
- Employee core service: 13 passing tests.
- Unit suite: 137 passing tests.
- Final component suite: 110 passing tests, including six profile/Skills
  missing-setup and unexpected-error regressions.
- Final desktop/mobile account journey rerun: 4/4 passing, including missing and
  completed Profile/Skills, directory detail, editing and no horizontal overflow.
  The isolated optimized production build passed.
- Final lint, types, scenario registration and whitespace checks pass. All 15
  changed source/test files match the tested clean clone byte for byte.

These checks total 294 unique automated cases; focused reruns are not counted
twice. The full historical motion system lock was not rerun for this bounded
functional repair.

## Production closure

Implementation commit `ba8dc69aaa38cc7ff78eeb034df26ced4c36d5b6` was pushed and
verified on `origin/main`. Vercel production deployment
`dpl_73zKVXZBz4ybqmoQ5Kec2v5mJmfG` is Ready with that exact source commit and the
production alias, verified in the authenticated deployment detail page.

Nora explicitly completed the five profiles through the deployed application:
Nora `0001`, Ava `0002`, Ben `0003`, Cora `0004`, Dan `0005`. Mulham's existing
record and employee code `123` remain intact. The audit interface shows exactly
one profile-creation event for each repaired target. The directory now shows six
people, including Mulham and all five demo personas. No team scopes were granted;
Admin directories can therefore remain empty until deliberate scope assignment.

The final authenticated scan passed **104/104 permitted page checks**: Nora 38,
Ava 25, Ben 25, Cora 8 and Dan 8. This covers every role-permitted top-level module,
password page, every linked authorized report, and all six directory detail pages
for Nora. All five My Profile pages and both Employee Skills pages return 200 with
normal headings. All **18 expected forbidden-page checks** return 404. Fresh login
and logout succeed for every account using its existing credentials.

Native live browser verification confirms the six-row directory and opening /
cancelling the profile editor. Desktop and 390px phone completion/editing/Skills
journeys passed in the disposable browser runner. The native Chrome phone
viewport override did not apply and was reset; no live phone screenshot is claimed.

See [verification](evidence/profile-page-repair-2026-10-06/verification.json),
[before](evidence/profile-page-repair-2026-10-06/pages-before.json),
[after](evidence/profile-page-repair-2026-10-06/pages-after.json),
[creation audit](evidence/profile-page-repair-2026-10-06/audit.json) and
[live directory](evidence/profile-page-repair-2026-10-06/live-directory-desktop.png).
This closes the reported account/profile page-access issue. Empty-state routes
were checked; this does not certify every future data mutation, file-provider
configuration, deferred Settings/Ticket work or separate Phase 13 rollout.
