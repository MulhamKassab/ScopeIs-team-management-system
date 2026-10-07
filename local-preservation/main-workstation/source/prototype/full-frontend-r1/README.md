# ScopeIs Team Management — Review Command Prototype

Frontend-only, role-aware product prototype based on the selected **Review Command** visual direction. It uses linked fictional data and browser-local state; it does not call, replace, or modify the production backend.

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173/login`.

## Demo personas

- Nora Albright — Super Admin, organization-wide decisions and governance.
- Ava Mercer — Admin, Team Alpha scope.
- Ben Iqbal — Admin, Team Bravo scope.
- Cora Bell — Employee, Team Alpha field-engineering journey.
- Dan Rowan — Employee, Team Bravo cloud-operations journey.

The persona switcher changes navigation, data scope, sensitive-detail visibility, and decision authority. Use **Reset demo data** in the sidebar to restore the original fixtures.

## Core flows

- Draft → Proposed → Published schedule review, including warning override reason, notifications, and audit preview.
- Employee/client/project/location directory and detail navigation.
- Leave request and Super Admin decision paths with Admin privacy boundaries.
- Coverage diagnostics and advisory replacement ranking with explicit human decision authority.
- Published-only employee schedule, participant-scoped discussions, and role-aware notifications.
- Static provider-neutral planning map based on stored locations; no live tracking.
- Light/dark mode, RTL preview, responsive desktop/tablet/mobile shell, and keyboard-usable alternatives to drag-and-drop.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test:sites
```

See [ROUTE_INVENTORY.md](./ROUTE_INVENTORY.md), [QA_MATRIX.md](./QA_MATRIX.md), and [design-qa.md](./design-qa.md) for the implementation and visual verification record.

## Intentional limits

- Fictional browser-local demo state only; no API, authentication provider, database, live location, maps provider, email, or external notification integration.
- Ticket System remains a disabled **Phase 12** navigation item and explanatory future-integration screen.
- Half-days, leave balances, payroll language, holiday rules, certification policy, schedule lock rules, and finalized SLA/notification policies remain deliberately unimplemented.
