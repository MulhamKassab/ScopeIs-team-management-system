# Client outsource bookings, 16 October 2026

The owner authorized implementation, a bounded smoke check and immediate deployment, explicitly omitting full test suites. They confirmed every calendar day, including weekends, is reserved from the start through the end date.

Super Admin and Admin can book multiple active Employees to an existing active Client. Admin needs a current CLIENT grant and a current TEAM grant for each employee. This is a narrow exception to the previous schedule-writing restriction: ordinary project/location schedule editing, unpublished plans and publication remain Super Admin only. Employees see only their own bookings and cannot create or cancel them. Assignment arrangement labels remain descriptive and do not drive booking logic.

Use **Book employees to client** on the Timetable or a Client page. One submission reserves each selected employee for the inclusive date range; multiple employees may serve the same client. No fabricated Project, Location, work hours or GPS position is created. A booking is active immediately and appears in Month, People and Agenda views, including cross-month periods, as **Outsourced to client** and **All day**. Planning views retain active bookings as existing commitments, separate from unpublished assignments. A technical request limit permits 366 calendar days per submission and 100 employees.

Overlapping active client bookings, current Published assignments, Draft/Proposed work and approved leave prevent creation. Booking creation is atomic for the complete selection. Schedule creation, update, publication and cover selection also respect these bookings through existing employee/date and leave locking. Vacation review lists overlapping bookings and blocks approval until they are cancelled or revised; pending leave remains reviewable. A Client booking has no invented worksite, so it does not produce a coordinate marker or route on the work map.

Managers within current client/team scope can cancel a booking, releasing its complete period. Date changes use cancellation followed by a new booking. Cancellation retains the record and audit history, with version checks against stale requests. Roles, grants and employee/client records are never created or modified by booking.

Persistence is additive migration `0017_client_outsource_bookings`. The table records Client, Employee, inclusive dates, optional work note, creator, cancellation and version. Existing workforce and Ticket tables remain unchanged. Existing schedule revisions are neither rewritten nor automatically published by this feature.

Verification is bounded to compilation/build and smoke observations for this amendment. It must not be presented as a full regression, responsive, concurrency, accessibility or system-lock certification.
