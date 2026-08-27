# UI/UX Foundation

## Status

**Implemented in Phase 1**. This record is the canonical routing reference for the approved visual foundation. It does not implement or change later-phase workforce functionality.

## Identity and visual direction

ScopeIs Team Management is a light-first, professional internal operational workspace: balanced density, predominantly neutral surfaces, minimal shadows, quiet borders, and no marketing-style decoration, gradients, glassmorphism, or gratuitous animation. The official identity asset is the unchanged local copy of the official Scope Information Systems logo from `https://scopeis.com/wp-content/uploads/2021/06/SCOPE-IS-logo-min.png`; the app never hotlinks it at runtime. Its meaningful alt text is `SCOPE Information Systems`.

Primary brand color is ScopeIs blue `#163B99`; ScopeIs orange `#F26608` is a sparing accent. Light mode uses a soft neutral canvas (`#F6F7F9`), white surfaces, near-black text, accessible muted text, and cool-grey borders. Dark mode uses blue-charcoal canvas and surfaces, light text, and accessible lighter blue/orange interaction tints. Orange is not used as small body text on white or as the default button color.

## Shell and navigation

Desktop uses a collapsible left application sidebar, persistent top header, full-width work area, local collapse preference, notification shortcut, theme control, persona/role display, logout, and a persistent Mock authentication marker. The sidebar preserves room for later schedule and map workspaces. A disabled `Ticket System — Phase 9` entry is deliberately non-functional.

Mobile uses a compact header plus bottom navigation of four role-specific primary destinations and `More`. The drawer exposes every remaining authorized destination; it is not a reduced-function mobile demo. Narrow layouts use full-width content and 44px-or-larger touch targets.

Navigation derives from centralized capability results on the server. Super Admin receives global empty shells; Admin receives only permitted scoped-management shells plus own leave/profile; Employee receives only personal/published/shared-work shells. UI visibility is a usability aid only—the same server policy protects routes and APIs.

## Type, spacing, components, and accessibility

The application uses a local system-first readable sans-serif stack with an Arabic-compatible `Noto Sans Arabic` token and tabular-friendly system number behavior. It uses a 4px-based spacing rhythm, roughly 40px desktop controls, 44px mobile targets, 9–11px radii, and semantic primary, secondary, future-disabled, error, and state components.

The foundation targets WCAG 2.1 AA: semantic landmarks, visible focus, a skip link, keyboard controls, named icon buttons, selected navigation state, form labels, contrast-aware tokens, reduced-motion handling, and no color-only status. Empty shells explicitly identify their module, phase, purpose, and `Not implemented in Phase 1` status so later work is never misrepresented as complete.

## Theme and RTL readiness

Light is the default. Theme preference is local and non-security-sensitive; boot-time theme application prevents an incorrect-theme flash. The unchanged logo remains on a white neutral logo surface where required for dark-mode legibility.

English is the Phase 1 interface language. The root supports `dir=ltr` and `dir=rtl`; CSS uses logical inline/block properties, alignment follows direction, the sidebar direction adapts, and drawers retain logical reading order. No visible language selector or Arabic translation is included until localization is approved.

## Deferred design decisions

Detailed information architecture for employee data, schedule board density, map interactions, leave/coverage/replacement workflows, reporting visualizations, full notification centre behavior, content localization, and the final component library remain later-phase work. Their implementation must continue to follow the confirmed role, scope, privacy, and Phase 9 Ticket System boundaries.
