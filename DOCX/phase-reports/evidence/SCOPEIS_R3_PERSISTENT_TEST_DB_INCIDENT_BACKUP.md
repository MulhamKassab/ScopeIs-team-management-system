# ScopeIs R3 persistent-test database incident backup

Extraction time: 2026-08-31 (UTC record timestamps retained below)  
Database identity: approved loopback `.env.test` target; credential omitted  
Purpose: exact, narrowly authorized cleanup manifest for the failed R2 route-runner attempt.

## Security handling

No database URL, cookie, session token, or token hash is included. All listed sessions were already expired before extraction. Their primary keys, actor identities, timestamps, and paired immutable audit rows are retained so the non-secret audit state can be reconstructed if required.

## Proven R2 manifest

Each pair is classified `PROVEN_R2`: all ten were created in the 54 ms failed-run window beginning `2026-08-29T17:40:51.083Z`; the actor sequence exactly matches the route suite's ten login calls before its first assertion failure; each session has exactly one paired `auth.mock_session.started` audit event; there are no additional audit events for any listed session; and no foreign-key child references exist.

| Session ID | User | Created / expires (UTC) | Audit ID | Audit action / timestamp (UTC) |
| --- | --- | --- | --- | --- |
| bfca64c0-582c-4db0-b024-941e0a6898fa | mock-super-admin-nora | 2026-08-29T17:40:51.083Z / 2026-08-29T18:40:51.083Z | 4ec55d7e-0b76-4089-9fa8-d24ed90078b9 | auth.mock_session.started / 2026-08-29T17:40:51.083Z |
| e69644b6-eb4d-40ea-9ce2-742f89393a2a | mock-admin-ava | 2026-08-29T17:40:51.107Z / 2026-08-29T18:40:51.107Z | af281eb9-cc3e-44d5-ad0d-cacce748a61c | auth.mock_session.started / 2026-08-29T17:40:51.107Z |
| 5b1701f2-5d6d-4991-b319-bb769107be18 | mock-admin-ben | 2026-08-29T17:40:51.111Z / 2026-08-29T18:40:51.110Z | e1f6a674-459f-427a-8037-8d3f78340999 | auth.mock_session.started / 2026-08-29T17:40:51.111Z |
| 1ccaaad0-047d-49e8-abb0-354f2dbc498e | mock-employee-cora | 2026-08-29T17:40:51.115Z / 2026-08-29T18:40:51.115Z | 5faade5e-360a-4900-92db-4cea8a3e2bc3 | auth.mock_session.started / 2026-08-29T17:40:51.115Z |
| f34b809c-308c-4c5c-b0d8-d490b9cde531 | mock-employee-dan | 2026-08-29T17:40:51.118Z / 2026-08-29T18:40:51.118Z | c603ca33-3b40-4261-8549-e67f8443a3e4 | auth.mock_session.started / 2026-08-29T17:40:51.118Z |
| 206b9522-f0be-4367-b160-ef40e2c3221b | mock-super-admin-nora | 2026-08-29T17:40:51.122Z / 2026-08-29T18:40:51.122Z | 4142a69c-4320-466f-ab90-22bebf4364c8 | auth.mock_session.started / 2026-08-29T17:40:51.122Z |
| 20b7a2e2-bea2-497b-a289-a9b564043d36 | mock-employee-cora | 2026-08-29T17:40:51.128Z / 2026-08-29T18:40:51.128Z | 0a53da22-040d-4bb9-a987-3e82b151d26e | auth.mock_session.started / 2026-08-29T17:40:51.128Z |
| 4033762b-9204-4729-8544-883bcf069700 | mock-admin-ava | 2026-08-29T17:40:51.132Z / 2026-08-29T18:40:51.132Z | e763f027-4aee-4fc9-90df-0132e1ad940c | auth.mock_session.started / 2026-08-29T17:40:51.132Z |
| 4105b995-efbf-4bb7-a4cd-b833a95ebc81 | mock-admin-ben | 2026-08-29T17:40:51.136Z / 2026-08-29T18:40:51.136Z | c9cf1821-4145-4ecc-8408-f11d4e2a7838 | auth.mock_session.started / 2026-08-29T17:40:51.136Z |
| 70324aef-aad7-43d7-939a-8e88ec86e647 | mock-admin-ava | 2026-08-29T17:40:51.137Z / 2026-08-29T18:40:51.137Z | e289b857-7783-4de2-aeb4-4472d8dde57d | auth.mock_session.started / 2026-08-29T17:40:51.137Z |

Artifact SHA-256 is recorded in the R3 closure report after finalization.
