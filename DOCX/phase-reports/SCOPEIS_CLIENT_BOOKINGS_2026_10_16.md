# Client outsource bookings, 16 October 2026

The owner requested a quick implementation and deployment with smoke verification only, explicitly omitting full test suites. They confirmed every calendar day, including weekends.

## Delivered behavior

Timetable and Client pages expose **Book employees to client**. Managers select a Client, multiple Employees, inclusive start/end dates and an optional work note. Creation is atomic and active immediately. Client names and all-day booking labels appear in Month, People and Agenda, including cross-month periods. Current Super Admin or scoped Admin may cancel, preserving the booking record and audit. Existing ordinary schedule editing and publication stay Super Admin only. Admin requires both CLIENT and employee TEAM scope; Employee reads remain own-only.

Booking creation refuses overlapping bookings, current Published assignments, Draft/Proposed work and approved leave. Schedule writes/publication and cover eligibility also account for booked dates. Vacation review shows bookings and blocks approval until those commitments are released. No Project, Location, working hours, coordinates, account, system-role or scope-grant record is fabricated or modified.

## Bounded verification

The smoke journey in [smoke.json](evidence/client-bookings-2026-10-16/smoke.json) passed twelve observations: two-employee scoped Admin creation, inclusive weekend/cross-month timetable projection, own-only Employee projection, overlap/Employee/out-of-scope refusals, compilation/build, normal Admin sign-in, actual form creation, Agenda display, cancellation and retained cancelled record. The runner creates and drops an owned loopback database. [Build log](evidence/client-bookings-2026-10-16/build-smoke.log), [booking dialog](evidence/client-bookings-2026-10-16/admin-booking-form.png), and [timetable](evidence/client-bookings-2026-10-16/admin-timetable.png) are retained. A final display-only correction excludes bookings from Project choices and physical site counts; it changes no persistence, permission or action behavior. Changed-code lint and TypeScript compilation pass. The deployment builds the final source.

Earlier smoke diagnostics found a Drizzle array parameter serialization issue, then a checker using an overly exact select label, then a real View timetable link leaving its dialog open. Those were corrected before the successful final smoke. Cancellation completion now persists outside the disappearing record. No unit, integration, regression, responsive, concurrency or full-system test suites were run for this request.

## Production database

[Migration receipt](evidence/client-bookings-2026-10-16/production-migration.json): additive migration `0017_client_outsource_bookings` is applied. Canonical state is D, 18 migrations and 42 tables. All **838 existing rows**, all 41 existing table schemas and the historical 17-entry ledger are preserved. A fresh complete row/schema/ledger backup was saved privately and read back before applying the transaction. No production business record was created. Existing application-role SELECT/INSERT/UPDATE privileges cover the new table without changing grants.

The existing GitHub/Vercel integration publishes the final `main` commit. Exact post-push deployment and ordinary production-page observations are recorded in the private release receipt at `C:/Users/m.kassab/.codex/backups/scopeis/client-bookings-2026-10-16/release.json`, so no extra documentation commit is needed merely to name its own hash. No production booking form is submitted during the read-only deployment check. Existing unrelated `test.py` remains untouched and excluded.
