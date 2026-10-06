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
- Component suite: 108 passing tests before the additional Skills regression;
  final profile/Skills component rerun: 6/6 passing tests.
- Final desktop/mobile account journey rerun: 4/4 passing, including missing and
  completed Profile/Skills, directory detail, editing and no horizontal overflow.
  The isolated optimized production build passed.
- Final lint, types, scenario registration and whitespace checks pass. All 15
  changed source/test files match the tested clean clone byte for byte.

## Production closure

Deployment, five explicit profile completions and the final route/browser audit
are pending. This report does not claim production closure yet. Role-forbidden
resources must continue to return their expected non-enumerating refusal.
