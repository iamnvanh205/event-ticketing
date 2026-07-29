# Overview

This document is the official UI/UX specification for the Event Ticketing product. It replaces all previous visual and interaction guidance for the frontend.

The specification combines the repository audit, the Aperture Design System, and the approved role-based UX redesign. It defines the target experience, not the current implementation. Frontend work MUST follow this document unless a later approved product decision explicitly supersedes it.

The product supports four fixed roles:

- `CUSTOMER`: discovers events, reserves tickets, confirms reservations, and presents QR tickets.
- `ORGANIZER`: creates and manages owned events, ticket types, gates, check-in staff, and live operations.
- `CHECKIN_STAFF`: validates tickets for the single event to which the account is assigned.
- `ADMIN`: manages platform users and has system-wide oversight.

Role authorization and ownership remain backend responsibilities. The interface MUST hide irrelevant actions, but hiding an action MUST NOT be treated as authorization.

## Specification language

- **MUST** indicates a non-negotiable requirement.
- **SHOULD** indicates the default implementation unless a documented constraint prevents it.
- **MAY** indicates an optional enhancement.

## Product and implementation boundary

The current MVP supports reservation and confirmation but does not integrate a real payment provider. All current tickets are confirmed without payment. The Payment screen in this specification defines the required future experience for paid transactions; it MUST remain unavailable until a payment API exists. A positive ticket price MUST NOT cause the frontend to simulate a completed payment.

Search, profile editing, user preferences, platform-wide admin metrics, and some aggregate organizer views may require backend endpoints not currently present. Their UX is specified so the product can grow coherently, but implementation MUST use real data and explicit unavailable states rather than fabricated results.

## Target route inventory

Routes are target information architecture. Existing routes may be migrated incrementally.

| Area | Route | Access | Current API readiness |
|---|---|---|---|
| Landing | `/` | Public | Content can be composed from published events |
| Discover | `/events` | Public | Available; public results MUST include only published, sale-eligible events |
| Search | `/search` | Public | Requires query/filter support for complete behavior |
| Event detail | `/events/:eventId` | Public | Available |
| Checkout | `/checkout/:ticketId` | Customer | Reservation and confirmation APIs available |
| Payment | `/checkout/:ticketId/payment` | Customer | Post-MVP; no real payment API |
| Confirmation | `/orders/:ticketId/confirmation` | Customer | Can use confirmed ticket data |
| My Tickets | `/tickets` | Customer | Available |
| Ticket detail | `/tickets/:ticketId` | Customer | Available |
| Authentication | `/auth` | Public | Login, registration, refresh, and Google OAuth available |
| Profile | `/account/profile` | Authenticated | Read available; editing may require API work |
| Settings | `/account/settings` | Authenticated | Requires preference/security endpoints |
| Organizer overview | `/organizer` | Organizer | Per-event dashboard available |
| Organizer events | `/organizer/events` | Organizer | CRUD available; ownership MUST be enforced |
| Event workspace | `/organizer/events/:eventId/:section?` | Organizer owner | Event, banner, ticket type, gate, and staff APIs available |
| Live operations | `/organizer/events/:eventId/live` | Organizer owner | Snapshot and WebSocket available |
| Check-in history | `/organizer/events/:eventId/check-ins` | Organizer owner | Check-in log API available |
| Staff scanner | `/checkin` | Assigned check-in staff | Available |
| Staff history | `/checkin/history` | Assigned check-in staff | Available |
| Admin overview | `/admin` | Admin | Partial; user administration available |
| Admin users | `/admin/users` | Admin | Available |
| System states | `/403`, `/404`, and inline recovery routes | Contextual | Frontend-owned |

## Global page-state contract

Every data-backed page MUST define and implement:

- Initial loading with layout-preserving skeletons.
- Background refresh without replacing valid content.
- Empty state that explains whether no data exists or filters removed all results.
- Recoverable error state that preserves user input, filters, and context.
- Success feedback proportional to the action.
- Session-expired recovery that returns the user to the intended route after authentication.
- A meaningful document title and a single page-level `h1`.

# Product Vision

Event Ticketing should feel like quiet, dependable infrastructure around memorable real-world experiences. Attendees should spend their attention on the event, organizers should understand operational health at a glance, and gate staff should process each person with speed and confidence.

The target visual character is a premium SaaS product in 2026:

- Calm neutral surfaces with intentional Iris actions and restrained Coral event accents.
- Dense enough for operational work without looking like an enterprise template.
- Editorial event imagery paired with precise product typography.
- Immediate, unambiguous feedback for reservation and check-in states.
- Consistent light and dark themes.
- No Bootstrap-like panels, oversized gradients, gratuitous glass effects, or decorative dashboard clutter.

The experience is successful when:

- A first-time visitor can understand the service and reach a relevant event immediately.
- An attendee can reserve a free ticket in the shortest safe path and open the next ticket in one action.
- An organizer can see what prevents publication before attempting to publish.
- Check-in staff can begin scanning without searching the complete event catalog.
- An administrator can find a user and complete a controlled status change without losing context.

# Design Principles

1. **Clarity before decoration.** Event identity, time, location, availability, ticket state, and next action are always explicit.
2. **One dominant action per decision.** A screen may contain many controls, but only one action receives primary visual emphasis in a region.
3. **Preserve intent.** Authentication, navigation, refresh, and recoverable errors retain query, filters, selected ticket, quantity, reservation, and return route.
4. **Progressive disclosure.** Show the information required for the current decision and reveal operational detail on demand.
5. **Role-specific simplicity.** Each role receives its own navigation and home surface. Users do not browse functions they cannot use.
6. **State is content.** Loading, empty, expired, sold out, disconnected, duplicate, and unauthorized states are designed outcomes, not generic messages.
7. **Accessible by default.** WCAG 2.2 AA is the minimum target. Keyboard access, visible focus, clear labels, and non-color status indicators are mandatory.
8. **Responsive by priority.** Mobile layouts reorder information around the task rather than merely stacking desktop columns.
9. **Fast, calm feedback.** Motion explains change and preserves orientation. It never delays scanning, checkout, or error recovery.
10. **Real data only.** The interface never implies payment, availability, success, or real-time freshness that the backend has not confirmed.

# User Personas

## First-time visitor

- **Context:** Arrives from a shared link, search engine, or social post and may not know the platform.
- **Primary needs:** Understand what the event is, whether it is legitimate, when and where it occurs, and how to get a ticket.
- **Risks:** Unclear event status, hidden ticket availability, forced registration before value is visible, and loss of context during sign-in.
- **Design response:** Search-led landing, complete public event detail, visible organizer identity, and intent-preserving authentication.

## Attendee

- **Context:** Usually uses a mobile device before and during the event.
- **Primary needs:** Reserve quickly, understand reservation expiry, find the next ticket, and display a reliable QR code.
- **Risks:** Accidental duplicate submission, expired reservations, ambiguous ticket status, inaccessible QR presentation, and sticky controls covering content.
- **Design response:** Short checkout, explicit timer, idempotent actions, ticket wallet organized by event, and QR-first ticket detail.

## Organizer

- **Context:** Configures events on desktop and monitors live operations on desktop or tablet.
- **Primary needs:** Create an event, configure inventory and access, publish confidently, manage staff, and understand live entry progress.
- **Risks:** Mixed setup forms, missing ownership context, unclear publish blockers, stale live metrics, and accidental destructive changes.
- **Design response:** Owned-event list, unified event workspace, completion checklist, controlled publication, and per-event live operations.

## Check-in staff

- **Context:** Uses a phone or tablet at a noisy, time-sensitive gate, potentially with unstable connectivity.
- **Primary needs:** Open the assigned event, select a valid gate, scan continuously, and distinguish success from duplicate or invalid tickets.
- **Risks:** Wrong event or gate, camera permission failure, unclear scan result, repeated submission, and reliance on color or sound alone.
- **Design response:** Assignment-first scanner, remembered gate, multimodal results, manual fallback, and visible connection status.

## Administrator

- **Context:** Performs occasional high-impact account and system operations.
- **Primary needs:** Find users, understand current role and account state, and apply status changes safely.
- **Risks:** Broad unfiltered lists, ambiguous authority, hidden consequences, and no audit context.
- **Design response:** Search-first user management, explicit role/status, confirmation for consequential actions, and persistent action history.

# Information Architecture

## Public and attendee hierarchy

```text
Public
├── Landing
├── Discover
├── Search
├── Event Detail
└── Authentication

Customer
├── Discover
├── My Tickets
│   └── Ticket Detail
├── Checkout
│   ├── Payment (post-MVP)
│   └── Confirmation
└── Account
    ├── Profile
    └── Settings
```

## Organizer hierarchy

```text
Organizer
├── Overview
├── Events
│   └── Event Workspace
│       ├── Overview
│       ├── Details
│       ├── Tickets
│       ├── Gates
│       ├── Staff
│       └── Publishing
├── Live Operations
├── Check-in History
└── Account
```

## Check-in staff hierarchy

```text
Check-in Staff
├── Scanner
├── History
└── Account
```

## Administrator hierarchy

```text
Administrator
├── Overview
├── Users
├── Events (read-only oversight when API support exists)
├── System Activity (when API support exists)
└── Account
```

## Content priority

Event content MUST be ordered consistently:

1. Event name and publication/availability state.
2. Start date, time, timezone, and location.
3. Ticket types, price, sale window, and remaining availability.
4. Description, organizer, access details, and policies.

Ticket content MUST be ordered consistently:

1. Current ticket status.
2. Event identity.
3. Event date, time, and venue.
4. Ticket type and quantity.
5. QR code or status-specific next action.
6. Reservation, confirmation, and check-in timestamps.

# Navigation

## Public navbar

The public navbar contains:

- Product logo linked to Landing.
- Discover.
- Search.
- “For organizers,” linked to the organizer value section or authentication.
- Sign in.
- Create account.

On mobile, the logo, Search, and menu trigger remain visible. The remaining links move into a modal navigation drawer.

## Customer navigation

Desktop:

- Discover.
- My Tickets.
- Search.
- Account menu.

Mobile bottom navigation:

- Discover.
- Search.
- Tickets.
- Account.

The bottom navigation MUST reserve safe-area space and MUST NOT cover page content or sticky checkout controls.

## Organizer navigation

Desktop uses a persistent left sidebar:

- Overview.
- Events.
- Live Operations.
- Check-ins.
- Account and Settings at the bottom.

Tablet uses a collapsible sidebar. Mobile uses a navigation drawer; event-context actions remain inside the page header.

## Check-in staff navigation

- Scan.
- History.
- Assigned event context.
- Account.

The scanner is the default route after sign-in. Staff MUST NOT be shown the full public event selector as an operational control.

## Admin navigation

- Overview.
- Users.
- Events when system-wide event APIs are available.
- System Activity when audit APIs are available.
- Account and Settings.

## Navigation behavior

- Active destinations MUST be indicated with text and shape or weight, not color alone.
- Browser Back and Forward MUST work; route state must not depend only on in-memory component state.
- Search query, filters, sort, and pagination SHOULD be represented in the URL.
- Returning from Event Detail or a detail drawer MUST restore the previous collection position.
- Breadcrumbs appear on nested organizer, administrator, checkout, and account screens. They are optional on mobile when a labelled Back action provides equivalent context.
- Unauthorized routes render Access Denied; unknown routes render Not Found. They MUST never render an empty application shell.
- After login, route users to the preserved intended destination. Without an intended destination, route by role: Customer to Discover, Organizer to Overview, Check-in Staff to Scanner, and Admin to Admin Overview.

# User Flows

## Discover and reserve a free ticket

```text
Landing or Discover
→ Search or browse
→ Event Detail
→ Select ticket type and quantity
→ Authenticate if required, preserving selection
→ Create RESERVED ticket
→ Checkout with visible expiry
→ Confirm
→ Confirmation
→ Ticket Detail
```

Rules:

- Public pages display only `PUBLISHED` events.
- Ticket selection MUST enforce sale window and remaining quantity before presenting an enabled reserve action.
- The reservation countdown starts from backend `expiresAt`, never from a newly created client timer.
- The warning threshold is two minutes remaining; announce it once without repeated screen-reader interruption.
- Confirm and reserve actions MUST prevent duplicate submission and reuse the same idempotency key for retries.
- Expired reservations direct the attendee back to the same Event Detail and selected ticket type where still available.

## Paid ticket flow

```text
Event Detail
→ Checkout
→ Payment
→ Provider processing
→ Server-confirmed success
→ Confirmation
```

This flow is post-MVP. The frontend MUST NOT mark a ticket paid or confirmed from a client-only success callback. Unknown payment outcomes require a neutral pending state and server reconciliation.

## Open an event ticket

```text
My Tickets
→ Upcoming
→ Next event
→ Show Ticket
→ Ticket Detail with QR
```

The nearest upcoming `CONFIRMED` ticket receives the primary position. A `CHECKED_IN` ticket remains readable but no longer presents itself as ready for entry.

## Create and publish an event

```text
Organizer Overview
→ Create Event
→ Details
→ Ticket Types
→ Gates and Staff (optional until operationally required)
→ Publishing Review
→ Publish
```

Rules:

- New events begin as `DRAFT`.
- Forms autosave only after valid changes and MUST expose saved, saving, and save-failed states.
- Ticket type price becomes immutable after `salesStartAt`.
- `quantityTotal` cannot be reduced below sold or reserved inventory.
- Publish review consolidates all blockers and links to the exact section and field.
- Organizer lists and selectors MUST contain only owned events.

## Check in an attendee

```text
Staff sign-in
→ Assigned event loads
→ Select or restore gate
→ Scan QR
→ Validate
├── Success → automatic reset for next scan
├── Duplicate → show previous check-in context
├── Invalid → explain reason and manual recovery
└── Connection failure → retain scan and retry safely
```

Rules:

- The gate must belong to the assigned event.
- The valid check-in window is from one hour before event start through event end.
- Only `CONFIRMED` tickets can transition to `CHECKED_IN`.
- Success, duplicate, and invalid outcomes use distinct text, icon, color, optional sound, and optional haptic feedback.
- A result MUST remain visible long enough to understand. Success may reset automatically; errors require explicit dismissal or a new scan action.

## Manage a user

```text
Admin Overview or Users
→ Search/filter
→ Open user detail
→ Choose status action
→ Review consequence
→ Confirm
→ Updated status and audit feedback
```

Filters and table position remain intact after the detail drawer closes or the status update completes.

# Design System

The system name is **Aperture**. Its visual direction is “quiet infrastructure, expressive moments.”

Tokens use three layers:

1. **Primitive tokens:** raw color, spacing, type, radius, shadow, and duration values.
2. **Semantic tokens:** purpose-driven values such as page background, primary action, danger, or muted text.
3. **Component tokens:** button, field, card, dialog, table, and navigation-specific aliases.

Components MUST consume semantic or component tokens. Raw color values MUST NOT appear inside feature components.

## Colors

### Primitive palette

| Family | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Neutral | `#FAFAFB` | `#F4F3F6` | `#E8E6EC` | `#D5D1DB` | `#AAA4B2` | `#7D7586` | `#615A69` | `#443E4B` | `#2A252F` | `#19151D` | `#0E0B11` |
| Iris | `#F6F4FF` | `#EEEAFF` | `#DED7FF` | `#C7BCFF` | `#A99BFF` | `#8875FF` | `#6D4AFF` | `#5A36D6` | `#4828AA` | `#392284` | `#221552` |
| Coral | `#FFF5F2` | `#FFE8E2` | `#FFCEC3` | `#FAA99A` | `#F6806D` | `#ED604C` | `#D94835` | `#B93628` | `#922C24` | `#762821` | `#40120F` |

Status primitives:

| Purpose | Light surface | Strong | Dark surface |
|---|---|---|---|
| Success | `#EAF8F1` | `#137A50` | `#123A2B` |
| Warning | `#FFF7E6` | `#A65A08` | `#402A12` |
| Error | `#FFF0EE` | `#C6382D` | `#431C1A` |
| Information | `#EDF5FF` | `#2563A9` | `#172E4D` |

### Light semantic colors

| Token | Value | Use |
|---|---|---|
| Page background | Neutral 50 | Main canvas |
| Surface | `#FFFFFF` | Cards, fields, navigation |
| Elevated surface | `#FFFFFF` | Popovers, drawers, dialogs |
| Primary text | Neutral 900 | Headings and body |
| Secondary text | Neutral 600 | Supporting information |
| Muted text | Neutral 500 | Metadata; never for essential instructions |
| Border | Neutral 200 | Standard boundaries |
| Strong border | Neutral 300 | Hover and selected boundaries |
| Primary action | Iris 600 | Primary buttons, selected navigation, links |
| Primary hover | Iris 700 | Hover |
| Primary active | Iris 800 | Pressed |
| Focus ring | Iris 500 | Global focus indicator |
| Event accent | Coral 500 | Restrained highlights and editorial accents |
| Scrim | `rgba(14, 11, 17, 0.56)` | Modal overlay |

### Dark semantic colors

| Token | Value |
|---|---|
| Page background | Neutral 950 |
| Surface | Neutral 900 |
| Elevated surface | Neutral 800 |
| Primary text | Neutral 50 |
| Secondary text | Neutral 300 |
| Muted text | Neutral 400 |
| Border | Neutral 800 |
| Strong border | Neutral 700 |
| Primary action | Iris 400 |
| Primary action text | Neutral 950 |
| Primary hover | Iris 300 |
| Focus ring | Iris 400 |
| Event accent | Coral 400 |
| Scrim | `rgba(0, 0, 0, 0.72)` |

### Color rules

- Normal text MUST achieve at least 4.5:1 contrast; large text and UI boundaries MUST achieve at least 3:1.
- Coral is an accent, not the default action color.
- Status colors MUST always be paired with text and, where space allows, an icon.
- Event photography may not sit directly behind essential body text without a tested opaque or gradient treatment.
- Dark mode changes semantic tokens, not component structure.
- User theme choices are System, Light, and Dark. System is the default.

## Typography

### Families

| Role | Family | Fallback | Use |
|---|---|---|---|
| Display | Instrument Sans | Inter, system UI, sans-serif | Marketing hero and expressive event headings |
| UI and body | Inter | system UI, sans-serif | Navigation, forms, body, tables |
| Data | Geist Mono | ui-monospace, monospace | Timers, ticket identifiers, operational counts where alignment matters |

Only these three families are permitted. Instrument Sans MUST be used selectively; operational screens primarily use Inter.

### Type scale

| Token | Desktop size / line | Mobile size / line | Weight | Use |
|---|---|---|---|---|
| Display XL | 64 / 68px | 44 / 48px | 600 | Landing hero |
| Display L | 48 / 52px | 36 / 40px | 600 | Major marketing statements |
| H1 | 40 / 44px | 32 / 36px | 600 | Page title or event title |
| H2 | 32 / 38px | 28 / 34px | 600 | Major section |
| H3 | 24 / 30px | 22 / 28px | 600 | Card group or panel title |
| H4 | 20 / 26px | 18 / 24px | 600 | Card title |
| Body L | 18 / 28px | 18 / 28px | 400 | Introductory copy |
| Body | 16 / 24px | 16 / 24px | 400 | Default reading text |
| Body S | 14 / 20px | 14 / 20px | 400 | Dense UI and metadata |
| Label | 14 / 20px | 14 / 20px | 600 | Form and control labels |
| Caption | 12 / 16px | 12 / 16px | 500 | Timestamps and secondary metadata |
| Metric | 36 / 40px | 30 / 34px | 600 | Dashboard values |

Headings use slightly negative tracking from `-0.01em` to `-0.025em`. Body text uses normal tracking. Uppercase is reserved for short technical identifiers; it MUST NOT be used for paragraphs, buttons, or navigation.

Reading content is limited to 68–75 characters per line. Numeric table columns use tabular figures.

## Spacing

The base unit is 4px with 2px and 6px available only for optical adjustment.

| Token | Value | Typical use |
|---|---:|---|
| `0` | 0 | Reset |
| `0.5` | 2px | Optical alignment |
| `1` | 4px | Tight icon detail |
| `1.5` | 6px | Compact internal gap |
| `2` | 8px | Icon-to-label, tight stack |
| `3` | 12px | Related controls |
| `4` | 16px | Standard component gap |
| `5` | 20px | Mobile page inset |
| `6` | 24px | Card padding, desktop gutter |
| `8` | 32px | Section group |
| `10` | 40px | Large component separation |
| `12` | 48px | Standard section gap |
| `16` | 64px | Large page section |
| `20` | 80px | Marketing section |
| `24` | 96px | Large marketing rhythm |
| `32` | 128px | Maximum hero spacing |

Rules:

- Mobile page inset: 16px below 480px and 20px from 480–767px.
- Tablet page inset: 24px.
- Desktop page inset: 32px, constrained by the selected container.
- Form fields use 16px vertical separation; distinct field groups use 24–32px.
- Card padding is 16px mobile, 20px compact, or 24px standard desktop.
- Section spacing is 32px mobile, 48px application desktop, and 64–96px marketing desktop.

## Radius

| Token | Value | Use |
|---|---:|---|
| XS | 6px | Small badges and compact controls |
| S | 8px | Inputs, buttons, table controls |
| M | 12px | Menus, popovers, compact cards |
| L | 16px | Standard cards and drawers |
| XL | 24px | Hero media and large marketing panels |
| Full | 999px | Chips, avatars, status pills |

Nested surfaces MUST use an equal or smaller radius than their parent. Radius communicates containment, not decoration.

## Elevation

Elevation is expressed through surface, border, and shadow together.

| Level | Shadow | Use |
|---|---|---|
| 0 | None; 1px border | Page sections, standard cards |
| 1 | `0 1px 2px rgba(14,11,17,.06), 0 4px 12px rgba(14,11,17,.04)` | Interactive card hover, sticky controls |
| 2 | `0 8px 24px rgba(14,11,17,.10), 0 2px 6px rgba(14,11,17,.06)` | Menus, popovers, tooltips |
| 3 | `0 18px 48px rgba(14,11,17,.16), 0 4px 12px rgba(14,11,17,.08)` | Dialogs and drawers |
| 4 | `0 24px 64px rgba(14,11,17,.22)` | Exceptional full-screen overlays |

Dark mode uses stronger borders and lower-opacity shadows. Static cards SHOULD remain at Level 0. Elevation MUST NOT be used to imply clickability when a surface is not interactive.

## Icons

- Use Lucide icons exclusively for interface actions and statuses.
- Default optical size is 20px with 1.75–2px stroke.
- Sizes: 16px compact, 20px default, 24px prominent, 32px empty states.
- Icons use `currentColor`.
- Action icons MUST have a text label or accessible name.
- Decorative icons are hidden from assistive technology.
- Filled and outline styles MUST NOT be mixed in the same control family.
- Emoji MUST NOT replace product icons.
- Event imagery and illustrations may be expressive, but operational status icons remain literal and recognizable.

## Components

### Global component states

Every interactive component defines default, hover, active, focus-visible, disabled, loading, error where applicable, and selected where applicable.

- Focus ring: 2px Iris ring with 2px surface-colored offset.
- Disabled controls remain legible and explain unavailable high-value actions where necessary.
- Loading controls retain their label where possible, expose `aria-busy`, and prevent duplicate submission.
- Hover MUST NOT be the only way to discover an action.
- Minimum touch target is 44×44px.

### Buttons

**Variants**

| Variant | Use |
|---|---|
| Primary | One dominant action in a region |
| Secondary | Supporting action with similar importance |
| Outline | Tertiary action on a surface |
| Ghost | Toolbar, row, and low-emphasis action |
| Destructive | Confirmed destructive action only |
| Link | Navigation embedded in text |

**Sizes**

| Size | Height | Horizontal padding | Text | Icon |
|---|---:|---:|---:|---:|
| Small | 36px visual; 44px target | 12px | 14px | 16px |
| Default | 44px | 16px | 14px | 18–20px |
| Large | 52px | 24px | 16px | 20px |
| Icon | 44×44px | 0 | N/A | 20px |

Buttons use Radius S. Loading replaces a leading icon with a spinner and keeps a stable width. Destructive actions require confirmation when they cannot be undone. Button labels use verbs and specific objects, such as “Publish event” rather than “Submit.”

### Forms

Forms include text input, textarea, select, combobox, search, checkbox, radio, switch, date/time fields, file upload, and quantity controls.

**Field anatomy**

1. Visible label.
2. Optional required or optional indicator.
3. Control.
4. Helper text or constraint.
5. Error message.

Default control height is 44px; large search and checkout controls may use 48–52px. Textareas have a minimum height of 120px. Inputs use Radius S, a 1px border, 12px horizontal padding, and 14–16px text.

Rules:

- Placeholder text is an example, never the only label.
- Required state is expressed in text and programmatically.
- Validate on blur after interaction and again on submission; do not show errors before a user has had a chance to enter data.
- Submission presents a linked error summary and focuses the first invalid field.
- Server errors remain visible until corrected or dismissed.
- Selects MUST have labels and a defined empty option.
- Checkbox and radio controls are 20px within a 44px label target.
- Switches are used only for immediate binary settings, never for submitting a form.
- Date/time inputs display timezone and use locale-aware formatting.
- Quantity controls include decrement, current value, increment, remaining availability, and direct keyboard entry.
- File upload specifies accepted type, maximum 5MB banner size, crop guidance, progress, preview, replacement, and failure recovery.

### Cards

Variants are standard, interactive, event, ticket, metric, and callout.

- Standard card: Level 0, 1px border, Radius L, 24px desktop or 16px mobile padding.
- Interactive card: one primary link target, Level 1 on hover, strong border on focus.
- Event card: 16:9 image, date, title, location, and price/availability summary.
- Ticket card: status, event, date, venue, ticket type, and direct ticket action.
- Metric card: label, value, unit, trend text, and timestamp when freshness matters.

Cards MUST NOT contain nested competing click targets across the complete surface. If several actions exist, the card itself is not a single link.

### Tables

Tables are used only when users compare repeated records.

- Header height: 44px.
- Row height: 48px compact or 56px default.
- Cell padding: 12px vertical and 16px horizontal.
- Text aligns left, numeric values right, statuses consistently, and actions right.
- Headers remain visible in long desktop tables.
- Sorting is explicit and keyboard operable.
- Row selection and row action are distinct.
- Pagination, result count, and active filters appear outside the table.
- Loading uses row skeletons; errors preserve headers and controls.
- Mobile converts tables to labelled cards unless horizontal comparison is essential. Purposeful horizontal scrolling requires a visible cue and sticky identifier column.

### Navigation

Navigation components include navbar, sidebar, bottom navigation, tabs, breadcrumbs, and in-page anchors.

- Active state uses a shape or indicator plus text contrast.
- Tabs are used for peer views within the same context; navigation links are used for routes.
- Tabs support arrow-key navigation when implemented as an ARIA tab set.
- Breadcrumbs begin with the nearest meaningful parent, not necessarily the marketing homepage.
- Back actions never replace breadcrumbs on desktop when hierarchy matters.
- Navigation does not disappear during loading.

### Dialogs

Dialogs include modal, confirmation dialog, drawer, bottom sheet, popover, and tooltip.

| Size | Max width | Use |
|---|---:|---|
| Small | 384px | Simple confirmation |
| Medium | 512px | Standard form or decision |
| Large | 720px | Complex details |
| Full mobile | Viewport minus 16px | Mobile or camera-related task |

Requirements:

- Focus moves inside, remains trapped, and returns to the trigger.
- Escape closes non-destructive dialogs.
- Destructive confirmations name the affected object and consequence.
- Primary and secondary actions remain visible when content scrolls.
- Drawers are used for contextual detail or filters, not primary multi-step creation.
- Mobile filters use a bottom sheet with explicit Apply and Clear actions.
- Tooltips supplement an accessible name; they never contain essential instructions or interactive content.

### Toast

Toasts acknowledge completed background or non-blocking actions.

- Variants: success, information, warning, error.
- Desktop placement: top-right below the navbar.
- Mobile placement: bottom above bottom navigation and safe area.
- Success and informational toasts dismiss after 4–6 seconds.
- Error toasts remain until dismissed when the user must read or act.
- Toasts MUST NOT replace inline form errors, payment status, reservation expiry, or scanner results.
- New toast content is announced politely; critical failure uses an assertive announcement sparingly.

### Loading

- Initial page load uses skeletons shaped like final content.
- Button actions use inline progress and stable button width.
- Background refresh retains current data with a subtle freshness indicator.
- Long operations exceeding one second include a text label.
- Full-page spinners are reserved for session bootstrap or route-level transitions where no stable shell exists.
- Loading indicators expose an accessible status and do not repeatedly announce minor refreshes.

### Empty State

Every empty state contains:

1. Specific heading.
2. One-sentence explanation.
3. One primary recovery or creation action where applicable.
4. Optional restrained illustration.

Differentiate:

- No data exists.
- Filters produced no results.
- Data is unavailable because setup is incomplete.
- Access is intentionally restricted.

### Skeleton

- Match the final component dimensions and hierarchy.
- Use neutral surfaces with a subtle 1.5-second opacity pulse.
- Avoid wave motion on large regions.
- Disable animation under reduced motion.
- Do not skeletonize stable navigation, page titles known locally, or existing refreshed content.

### Badges

Badges communicate status or compact classification.

| Size | Height | Text |
|---|---:|---:|
| Small | 20px | 11–12px |
| Default | 24px | 12px |
| Large | 28px | 14px |

Ticket labels:

- `RESERVED`: “Held” with expiry context.
- `CONFIRMED`: “Ready for entry.”
- `CHECKED_IN`: “Checked in.”
- `EXPIRED`: “Expired.”
- `CANCELLED`: “Cancelled.”

Event labels:

- `DRAFT`: “Draft.”
- `PUBLISHED`: “Published.”
- `CANCELLED`: “Cancelled.”

Status badges use text, icon where useful, and accessible contrast. Internal enum values are not shown directly to end users.

### Pagination

- Use server-backed pagination for event lists, users, logs, and large ticket collections.
- Show Previous, Next, current page, nearby pages, and total result count.
- Page buttons have 44px targets.
- Disabled boundaries remain visible.
- On mobile, show Previous, “Page X of Y,” and Next.
- Changing page moves focus to the results heading and scrolls to the results start.
- Pagination state belongs in the URL.

### Footer

Public footer:

- Product identity.
- Discover and organizer links.
- Help, privacy, and terms placeholders only when destinations exist.
- Copyright and locale context.

Application shells use a minimal footer or no footer when persistent side navigation is present. Mobile content MUST include enough bottom padding for sticky actions and bottom navigation.

### Sidebar

- Expanded width: 256px.
- Collapsed desktop width: 72px.
- Item height: 44px.
- Icon: 20px.
- Group gap: 24px.
- Account and Settings anchor to the bottom.
- Event context appears above event-scoped destinations.
- Collapsed icons require accessible names and tooltips.
- Sidebar state may persist per device but MUST NOT alter route hierarchy.

### Navbar

- Public/attendee desktop height: 64px.
- Mobile height: 56px.
- Maximum public container: 1280px.
- Sticky navigation uses a solid or sufficiently opaque surface with Level 1 separation after scrolling.
- Logo is the first navigation item after the skip link.
- Search remains directly available for public and attendee experiences.
- User menu includes identity, role, Profile, Settings, and Sign out.
- Sign out is immediate but MUST not be triggered by editing profile fields or changing display name.

# Responsive Design

## Breakpoints

| Name | Width | Intent |
|---|---:|---|
| XS | 0–479px | Small phones |
| SM | 480–767px | Large phones |
| MD | 768–1023px | Tablets |
| LG | 1024–1279px | Small desktop |
| XL | 1280–1439px | Standard desktop |
| 2XL | 1440px and above | Large operational displays |

Breakpoints are chosen by content behavior, not device names. Components MUST remain valid between breakpoints.

## Containers and grid

| Context | Maximum width |
|---|---:|
| Public and attendee content | 1280px |
| Organizer/admin application | 1440px |
| Reading content | 720px |
| Standard form | 640px |
| Dialog | 384–720px by variant |

- Desktop uses a 12-column grid with 24px gutters.
- Tablet uses an 8-column grid with 20px gutters.
- Mobile uses a 4-column grid with 16px gutters.
- No page may introduce horizontal viewport scrolling.

## Responsive transformations

- Public event grids: four columns at XL, three at LG, two at MD, one at SM/XS.
- Desktop filter rails become modal drawers below LG.
- Organizer/admin sidebars collapse at MD and become drawers below MD.
- Tables remove secondary columns at MD and convert to cards below MD unless comparison requires a table.
- Sticky ticket and checkout actions use safe-area insets and include matching page-bottom padding.
- Multi-column forms become one column below MD while retaining group order.
- Dialogs become near-full-width or bottom sheets below SM.
- QR and scanner content prioritize the first viewport on mobile.
- Hover-specific affordances receive equivalent persistent mobile and keyboard treatment.

# Accessibility

The product targets WCAG 2.2 AA.

## Structure and navigation

- Every page has one `h1` and a logical heading hierarchy.
- A skip link targets the main content.
- Landmarks identify header, navigation, main content, complementary regions, and footer.
- Route changes update the document title and move focus to the page heading unless a more specific recovery target is required.
- Browser zoom to 200% and text spacing overrides MUST not break content or function.

## Keyboard and focus

- All actions are usable with keyboard alone.
- Focus order matches visual and task order.
- `focus-visible` is never removed without an equivalent.
- Modal, drawer, menu, tabs, tooltip, and combobox keyboard behavior follows WAI-ARIA Authoring Practices.
- Sticky content does not obscure focused controls.

## Forms and errors

- Inputs have persistent labels.
- Instructions precede the field they govern.
- Errors identify the problem and correction, link to their field, and do not rely on color.
- Required, invalid, disabled, busy, expanded, selected, and pressed states are programmatically exposed.
- Authentication fields use correct autocomplete values.
- Reservation expiry warnings are announced once at meaningful thresholds.

## Images, QR, and scanner

- Event images have meaningful alternative text when informative and empty alternatives when decorative.
- QR codes include a human-readable ticket identifier and staff fallback.
- Scanner status combines visible text, icon, color, optional audio, and optional haptic feedback.
- Audio feedback can be muted and never carries unique information.
- Camera permission errors provide manual ticket-code entry.

## Dynamic data

- Background dashboard updates use polite live regions only for significant status changes.
- Rapid numerical updates are not announced continuously.
- Scanner results and blocking transaction errors use an assertive announcement.
- Users can pause or ignore auto-refresh without losing access to current data.
- Connectivity and stale-data states include the last successful update time.

## Targets and contrast

- Touch targets are at least 44×44px.
- Text contrast is at least 4.5:1; large text and UI components at least 3:1.
- Focus indicators achieve at least 3:1 against adjacent colors.
- Status, selected state, and chart values are not differentiated by color alone.

# Motion

Motion is functional, restrained, and interruptible.

## Duration tokens

| Token | Duration | Use |
|---|---:|---|
| Instant | 80ms | Press feedback |
| Fast | 120ms | Hover and focus color |
| Standard | 180ms | Small component transition |
| Deliberate | 240ms | Popover, menu, tab content |
| Enter | 320ms | Drawer or dialog entrance |
| Emphasis | 420ms | Rare confirmation or marketing reveal |

## Easing

- Standard UI: `cubic-bezier(0.2, 0, 0, 1)`.
- Enter: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Exit: `cubic-bezier(0.4, 0, 1, 1)`.

## Principles

- Animate opacity and transform; avoid layout-shifting properties.
- Hover translation is limited to 2px.
- No parallax, scroll-jacking, looping decorative motion, or animated dashboard counters.
- Scanner success feedback MUST not delay the next scan.
- Skeleton pulse is subtle and stops under reduced motion.
- Under `prefers-reduced-motion: reduce`, remove non-essential transform and entrance motion, use immediate state changes, and preserve progress indicators without continuous animation where possible.

# Screen Specifications

## Landing

**Purpose:** Explain the platform to first-time visitors and move them directly into event discovery or organizer conversion.

**Layout:** Public navbar; search-led hero; featured events; categories; upcoming or nearby events; trust and organizer section; public footer. Desktop uses a 7/5 hero split and four-column event rows. The hero has one `h1`.

**Components:** Navbar, large search field, category chips, event cards, collection headers, trust callout, organizer CTA card, footer, event-card skeletons.

**Interactions:** Search submits to `/search` with the query in the URL. Categories open filtered Search. Event cards open Event Detail. “For organizers” moves to the organizer proposition or authentication. Returning from an event restores scroll position.

**Validation:** Search trims whitespace and requires a meaningful query only when explicitly submitted. Unavailable recommendation modules fail independently and offer Retry. Only published events are displayed.

**Responsive Behaviour:** Four event columns become two on tablet and one on mobile. Hero stacks with Search before supporting media. Mobile collections may use horizontal snap scrolling only when a visible “View all” alternative exists.

**Accessibility:** Search is the first meaningful focus after the skip link. Carousels are keyboard operable and do not auto-advance. Event links include event name and date. Decorative hero art is hidden from assistive technology.

## Home / Discover

**Purpose:** Provide the primary browsing experience for visitors and returning customers.

**Layout:** Attendee/public navbar; page heading; persistent search; quick date, location, and category filters; contextual collections; result pagination or View All actions.

**Components:** Search, filter chips, event cards, collection sections, badges, skeletons, localized retry states, pagination.

**Interactions:** Filters update results and URL state without losing scroll context. A selected filter can be removed in one action. Opening and returning from an event restores the collection and position.

**Validation:** Invalid or unsupported URL filters are ignored and removed from canonical state. Result count updates only after confirmed data. Draft, cancelled, out-of-window, and unauthorized events are excluded.

**Responsive Behaviour:** Four/three/two/one-column card grid by viewport. Filters remain inline at desktop and move into a drawer below LG; active filters remain visible as removable chips.

**Accessibility:** Filter chips expose pressed state. Result changes are announced politely. Each event card provides a unique link name including date. Loading does not remove the results heading.

## Search

**Purpose:** Support high-intent discovery across event name, location, date, category, availability, and sort order.

**Layout:** Search header; result summary; desktop filter rail; active filter chips; sort control; event results; pagination. Search query is repeated in the page heading.

**Components:** Search input, combobox suggestions when API support exists, filter groups, date controls, chips, select, event cards/list rows, filter drawer, pagination.

**Interactions:** Query, filter, sort, and page state live in the URL. Desktop filters update immediately; mobile filters use Apply and Clear. Escape closes suggestions or filters and returns focus to the trigger.

**Validation:** Date ranges require start not after end. Empty query is permitted when filters are active. Unknown sort values fall back to relevance/upcoming. Errors preserve query and filters.

**Responsive Behaviour:** A 3/9 filter-results split at LG and above. Below LG, Filter and Sort become sticky controls and filters open in a bottom sheet. Results become a single-column list on mobile.

**Accessibility:** Filter groups use fieldsets and legends. The result area is labelled and result totals are announced. Focus returns to the results heading after pagination.

## Event Detail

**Purpose:** Give enough information to decide whether to attend and begin ticket selection.

**Layout:** Breadcrumb; 16:9 event media; status, title, date, time, timezone, and location; event narrative; organizer; ticket selector; policies. Desktop uses an 8/4 layout with a sticky selector.

**Components:** Breadcrumb, responsive image, event badges, fact list, ticket-type radio cards, quantity control, price summary, primary reserve button, organizer card, related events.

**Interactions:** Selecting a ticket and quantity updates total and availability immediately. Reserve requires authentication; after sign-in, selection and return route are preserved. Sold-out or unavailable ticket types remain visible with reasons.

**Validation:** Reserve is enabled only for a published event, active sale window, valid quantity, remaining inventory, and customer role. Maximum purchase is 100 active tickets per customer per ticket type. Server availability overrides displayed availability.

**Responsive Behaviour:** Sticky selector becomes an in-flow panel below MD. Mobile places a compact, safe-area-aware ticket CTA at the bottom with enough content padding to prevent overlap.

**Accessibility:** Ticket types use radio semantics. Date, location, availability, and price are text, not icon-only. Disabled ticket choices expose why they cannot be selected. Quantity changes are announced.

## Checkout

**Purpose:** Let a customer review a held reservation and confirm it before expiry.

**Layout:** Breadcrumb/progress; reservation-status banner and timer; attendee summary; ticket summary; price; policy acknowledgement when required; primary confirmation. Desktop uses a 7/5 form-summary split.

**Components:** Progress indicator, timer, alert, attendee fields where required, order card, policy checkbox, Confirm button, Cancel reservation action, error summary.

**Interactions:** Authentication returns to the same reservation. Confirm submits once and routes to Confirmation. Cancel is available only while `RESERVED` and returns inventory. Free tickets skip Payment.

**Validation:** Backend `expiresAt` controls the timer. Expired reservations cannot confirm. Required attendee information and policy acknowledgement validate inline and on submit. Confirm retries remain idempotent.

**Responsive Behaviour:** Summary stacks below the heading on tablet. Mobile uses one column and a compact sticky total/action region above safe-area and bottom navigation.

**Accessibility:** Timer warnings are announced at meaningful thresholds, not every second. Errors link to fields. Focus moves to the first invalid control or expiry alert. The timer uses Geist Mono visually but includes accessible text.

## Payment

**Purpose:** Collect payment for a paid reservation after a payment provider is implemented.

**Layout:** Checkout progress; amount due; payment-method choice; provider-hosted payment fields; billing details; sticky order summary; security and support information.

**Components:** Payment method cards, provider fields, billing form, reservation timer, order summary, Pay button, pending status panel, decline recovery.

**Interactions:** Payment fields validate inline. Submission locks the action until the server returns a definitive state. Success routes to Confirmation. Decline permits correction or another method. Unknown outcome displays Pending and prevents blind retry.

**Validation:** Client validation supplements but never replaces provider/server validation. Sensitive payment data is never stored by the application frontend. The reservation must remain valid. The amount displayed must match the server-created payment intent.

**Responsive Behaviour:** Desktop uses 7/5 columns. Tablet places an expandable summary above payment. Mobile keeps total and timer visible without covering provider fields.

**Accessibility:** Provider-hosted fields must match visible labels and focus treatment. Payment status uses live announcements. Error content describes a correction and never relies on provider color alone.

## Order Confirmation

**Purpose:** Prove that confirmation succeeded and give immediate ticket access.

**Layout:** Centered success heading; event and ticket summary; primary View Ticket action; Add to Calendar; order reference; help or receipt details.

**Components:** Success status, event card, ticket preview, buttons, order metadata, optional issuance progress.

**Interactions:** View Ticket opens Ticket Detail. Add to Calendar downloads or opens a valid event calendar item. Return to Discover is tertiary. Issuance status may refresh automatically.

**Validation:** Display success only after the server returns `CONFIRMED`. If confirmation succeeded but QR generation is delayed, show an issuance-pending state with ticket reference. Unknown references link to My Tickets.

**Responsive Behaviour:** Desktop may place preview beside order details. Tablet and mobile use one centered column with View Ticket above secondary metadata.

**Accessibility:** Focus moves to the confirmation heading. Success is expressed in text. Celebratory motion respects reduced motion. Order and ticket identifiers are selectable text.

## My Tickets

**Purpose:** Act as the customer’s ticket wallet.

**Layout:** Heading; Upcoming, Held, and Past/Inactive views; optional search; featured next ticket; ticket grid/list; pagination.

**Components:** Tabs, search, featured ticket card, ticket cards, badges, empty state, skeletons, pagination.

**Interactions:** The next valid ticket opens in one action. Held tickets link to Checkout. Confirmed tickets link to Ticket Detail. Tabs and search preserve URL state.

**Validation:** Group by ticket status and event time: Held for active `RESERVED`; Upcoming for future `CONFIRMED`; Past/Inactive for `CHECKED_IN`, `EXPIRED`, `CANCELLED`, or past events. Expired held tickets refresh to their server state.

**Responsive Behaviour:** Desktop uses a featured card and two-column grid. Mobile uses a single-column list and keeps Show Ticket visible on the nearest upcoming ticket.

**Accessibility:** Tabs use correct semantics. Cards include event, date, venue, type, quantity, and status in their accessible name or content. QR is never the only way to identify a ticket.

## Ticket Detail

**Purpose:** Present one ticket’s current validity and QR code for entry.

**Layout:** Back/breadcrumb; status; QR ticket card; event, date, venue, type, quantity, and holder; entry instructions; timestamps and order details.

**Components:** Status badge, QR code, ticket identifier, event facts, Add to Calendar/Wallet future actions, expandable metadata, error state.

**Interactions:** Confirmed tickets display QR. Checked-in tickets show check-in time and gate. Reserved tickets route to Checkout. Users may copy the human-readable identifier.

**Validation:** QR appears only when the ticket is `CONFIRMED` and `qrCode` exists. `CHECKED_IN`, `EXPIRED`, and `CANCELLED` remain viewable but cannot be presented as valid. Server state refreshes on page open.

**Responsive Behaviour:** Desktop centers the ticket card beside supporting details. Mobile puts validity and QR in the first viewport and avoids low-contrast overlays.

**Accessibility:** QR includes descriptive alternative text and a readable identifier. Status uses text, icon, and color. Copy feedback is announced. Screen brightness advice is optional and not blocking.

## Authentication

**Purpose:** Sign in or create an account while preserving the user’s intended task.

**Layout:** Minimal brand header; focused auth card; contextual reason; Sign In/Register modes; Google customer action; recovery link when supported; optional checkout summary.

**Components:** Tabs or segmented mode control, labelled fields, password reveal, primary button, Google button, error summary, contextual order card.

**Interactions:** Successful login returns to the intended route. Mode switching retains compatible input. Customer Google login and email/password actions remain visually distinct. Sign out clears the session and routes safely.

**Validation:** Email is normalized and validated. Password rules follow authentication documentation. Invalid credentials do not clear email. Rate-limit and locked-account errors provide specific recovery without revealing sensitive account existence.

**Responsive Behaviour:** Desktop centers a 420–480px card and may show checkout context beside it. Mobile uses a full-width form with 16px inset and no competing decorative column.

**Accessibility:** Correct autocomplete attributes, persistent labels, accessible password reveal, linked errors, and no forced autofocus that unexpectedly opens the mobile keyboard.

## Profile

**Purpose:** Display and, when API support exists, update personal identity and contact information.

**Layout:** Account navigation; profile heading; avatar/initial; identity and contact form; role and read-only account metadata; save action.

**Components:** Breadcrumb, account tabs/sidebar, avatar upload future control, fields, role badge, Save button, unsaved-change dialog.

**Interactions:** Edit and save once. Successful save updates the navbar identity without signing the user out. Leaving with unsaved changes triggers a warning.

**Validation:** Full name is required and trimmed. Email changes require backend verification before replacing the current identity. Unsupported fields remain read-only rather than pretending to save.

**Responsive Behaviour:** Desktop uses account sidebar plus a 640px form. Tablet uses top tabs. Mobile uses one column and shows a sticky Save action only when changes exist.

**Accessibility:** Persistent labels, explicit read-only state, field-linked errors, keyboard-operable file upload, and stable focus after save.

## Settings

**Purpose:** Manage theme, notifications, security, sessions, and account-level preferences as corresponding APIs become available.

**Layout:** Account navigation; grouped Preferences, Notifications, Security, Sessions, and Account Actions sections; destructive zone last.

**Components:** Selects, switches, buttons, session list, confirmation dialogs, inline save status.

**Interactions:** Theme applies immediately and persists. Other immediate switches optimistically update only when safe and roll back on failure. Password/session/account actions require explicit confirmation.

**Validation:** Unavailable preferences are omitted. Sensitive changes require current authentication and backend confirmation. Destructive action dialogs state exact consequences.

**Responsive Behaviour:** Desktop uses sidebar and narrow content. Tablet uses tabs or section index. Mobile stacks setting rows with 44px controls and separates destructive actions.

**Accessibility:** Switch labels and state are announced. Theme control supports System, Light, and Dark. Dialog focus returns to the triggering setting.

## Organizer Dashboard

**Purpose:** Summarize owned-event health and surface the organizer’s next action.

**Layout:** Organizer sidebar; page heading and Create Event; alerts; owned-event selector; per-event metrics; upcoming events; recent operational activity.

**Components:** Sidebar, event selector, alert stack, metric cards, event table/cards, activity list, real-time freshness indicator, empty-state checklist.

**Interactions:** Selecting an event updates contextual metrics. Create Event opens the new Event Workspace. Event rows open the appropriate workspace section. Live data updates without moving focus.

**Validation:** Event selectors include only owned events. Metrics show server values and last-update time. Disconnected WebSocket state retains the last snapshot and labels it stale.

**Responsive Behaviour:** Desktop uses sidebar, four metrics, and a main/activity split. Tablet uses two-column metrics and stacked panels. Mobile prioritizes alerts and next actions before metrics.

**Accessibility:** Metrics include full text labels and units. Trends and freshness are textual. Significant connection changes are announced politely; numerical WebSocket changes are not announced continuously.

## Organizer Events

**Purpose:** Find, create, and manage all events owned by the organizer.

**Layout:** Heading and Create Event; search; Draft, Published, and Cancelled tabs; filters; event table; pagination.

**Components:** Search, status tabs, date filter, event table/cards, badges, overflow menu, pagination, empty states.

**Interactions:** Selecting a row opens Event Workspace. Drafts resume at the first incomplete section. Status filters and pagination use URL state. Consequential event actions require confirmation.

**Validation:** Only owned events appear. Unknown filters fall back safely. Cancelled events cannot be edited as active without an explicitly supported restore operation.

**Responsive Behaviour:** Desktop table shows event, date, publication, sales, inventory, and actions. Tablet removes secondary columns. Mobile uses labelled event cards with one primary action and visible overflow.

**Accessibility:** Table headers are programmatic. Overflow actions are always reachable. Badges expose user-friendly status text. No row action is hover-only.

## Event Workspace

**Purpose:** Create and manage one event through a unified, autosaving workspace.

**Layout:** Organizer shell; event breadcrumb and status; autosave state; section navigation for Overview, Details, Tickets, Gates, Staff, and Publishing; main form; contextual preview or completion panel.

**Components:** Tabs/navigation, completion checklist, form groups, banner upload, ticket-type cards/table, gate list, staff list, dialogs, alerts, preview, Publish button.

**Interactions:** Users move between sections without losing valid changes. Add, edit, and remove ticket types, gates, and staff in their section. Publishing runs one consolidated review and links each blocker to its field.

**Validation:** Event end must follow start. Ticket sale end must follow sale start and fall within a meaningful event window. Price locks after sales start. Quantity cannot fall below active inventory. Banner accepts JPG/PNG up to 5MB. Gate names are non-empty. Staff email/password follow authentication rules. Ownership is revalidated server-side for every operation.

**Responsive Behaviour:** Desktop uses section navigation and an 8/4 form-preview split. Tablet uses scrollable top navigation and moves preview below. Mobile presents sections as a clear step sequence without hiding the ability to return.

**Accessibility:** Autosave states are announced only on failure or explicit completion. Error summary links across sections. Tabs/navigation follow correct semantics. Any reordering action has a keyboard alternative.

## Live Operations

**Purpose:** Monitor real-time admission progress and gate health for one owned event.

**Layout:** Event context; Live/Disconnected status; last updated time; sold, checked-in, and remaining metrics; gate breakdown; recent exceptions or activity when supported.

**Components:** Event selector, connection badge, metric cards, accessible chart or progress display, gate table, exception list, refresh action.

**Interactions:** Event selection changes the subscribed dashboard topic. Users may open gate or history detail without losing context. Manual refresh is available when disconnected.

**Validation:** Subscribe only to owned events. Preserve and label the last valid snapshot during reconnect. Do not derive sold or remaining totals differently from the dashboard API.

**Responsive Behaviour:** Desktop uses top metrics and a main/gate split. Tablet stacks operational panels. Mobile places alerts, connection status, and total check-ins before charts; non-essential visualization becomes text summary.

**Accessibility:** Every visualization has a text equivalent. Live updates do not steal focus. Auto-refresh can be ignored or paused. Stale data includes a readable timestamp.

## Check-in Scanner

**Purpose:** Validate consecutive tickets quickly at the assigned event and selected gate.

**Layout:** Minimal staff navbar; assigned event and gate context; camera viewport; result panel; torch and camera controls; manual code fallback; session count.

**Components:** Gate select, scanner viewport, permission prompt, manual input, Validate button, result sheet, connection indicator, optional sound/haptic controls.

**Interactions:** Assigned event loads automatically. Previously selected valid gate is restored. Scanning pauses during validation. Success resets automatically; duplicate and invalid results require acknowledgement or a new scan. Manual entry follows the same validation path.

**Validation:** Gate must belong to assigned event. QR must resolve to a `CONFIRMED` ticket for that event and be within the check-in window. Duplicate, invalid state, wrong event/gate, outside window, permission failure, and network failure have distinct messages.

**Responsive Behaviour:** Mobile-first full-width camera with thumb-accessible controls and safe-area result sheet. Tablet supports portrait and landscape. Desktop centers the scanner with result and session information beside it.

**Accessibility:** Outcomes combine text, icon, color, optional sound, and optional haptic feedback. Camera permission failure exposes manual entry. Focus moves to actionable error recovery, not to transient success.

## Check-in History

**Purpose:** Review scan activity and resolve entry disputes.

**Layout:** Role-specific shell; event context; gate, date, staff, and result filters as authorized; search; log table/cards; detail drawer; pagination.

**Components:** Search, filters, result chips, table, status badges, detail drawer, timestamp display, pagination, live-update pause.

**Interactions:** Open a record for ticket, gate, staff, time, and outcome detail. Closing returns focus and scroll to the originating row. New results may appear at the top only when live updates are enabled.

**Validation:** Organizer may access only owned events; staff may access only the assigned event. Date range and gate must be valid. Duplicate and invalid outcomes remain distinct from successful check-ins.

**Responsive Behaviour:** Desktop table exposes comparison columns. Tablet removes secondary columns into the drawer. Mobile uses timeline cards and a filter bottom sheet.

**Accessibility:** Result text never relies on color. Timestamps use semantic time data. Auto-updates can be paused and do not interrupt record review.

## Admin Dashboard

**Purpose:** Provide system-level awareness and direct administrators to users or events requiring attention.

**Layout:** Admin sidebar; critical alerts; user and event summary modules where APIs exist; recent administrative activity; clear links to management surfaces.

**Components:** Sidebar, alerts, metric cards, user-health panel, event-health panel, activity table, module skeletons and errors.

**Interactions:** Alerts deep-link to a filtered User Management or future event-oversight view. Returning restores dashboard context. Modules refresh independently.

**Validation:** Display only server-backed metrics. Missing aggregate APIs produce an intentional unavailable module or omit the module; they never show zero as a substitute.

**Responsive Behaviour:** Desktop uses four metrics and two-column operational panels. Tablet stacks panels after two-column metrics. Mobile places critical alerts before all summaries.

**Accessibility:** Alerts are first after the heading. Charts have text summaries. Severity uses text and icon. Independent module failures do not hide the entire page.

## User Management

**Purpose:** Search platform users and manage account status safely.

**Layout:** Admin shell; search; role and status filters; user table/cards; detail drawer; status confirmation dialog; pagination.

**Components:** Search, selects/chips, user table, role/status badges, drawer, destructive or restorative dialog, toast, pagination.

**Interactions:** Search and filter, open user, review identity/role/status, choose lock or unlock, confirm consequence, and return to the same result position.

**Validation:** User identifiers come from the selected record, never editable route text. Status action is disabled when it would make no change. Server response is authoritative. High-impact actions require confirmation and should include a reason when audit support exists.

**Responsive Behaviour:** Desktop table shows identity, role, status, activity, creation date, and actions. Tablet hides metadata in the drawer. Mobile uses user cards with explicit overflow actions.

**Accessibility:** Action labels include the user’s name. Confirmation heading names the action. Focus initially lands on the least destructive choice and returns to the trigger.

## Access Denied

**Purpose:** Explain an authenticated authorization or ownership failure and return the user to a valid role destination.

**Layout:** Existing safe shell; centered status panel; explanation; primary return action; optional sign-in-as-different-account action.

**Components:** Status icon, heading, explanatory text, primary button, secondary link.

**Interactions:** Return routes by role. Sign-in-as-different-account performs explicit sign-out and then authentication.

**Validation:** Do not reveal protected object details. Distinguish 403 from expired session.

**Responsive Behaviour:** Narrow centered content on all viewports with full-width mobile actions.

**Accessibility:** Focus moves to the heading. The icon is decorative. The message names the permission issue without exposing sensitive data.

## Not Found

**Purpose:** Recover from an unknown route or missing public object.

**Layout:** Minimal safe shell; heading; explanation; primary role-appropriate home action; optional Search.

**Components:** Restrained illustration, heading, buttons, search entry when useful.

**Interactions:** Return to Discover for guests/customers or the role home for authenticated operational users.

**Validation:** Invalid numeric identifiers and unknown routes both resolve here without rendering partial page content.

**Responsive Behaviour:** Centered single column; actions stack on small mobile.

**Accessibility:** Focus moves to the heading. Illustration is decorative. The page title clearly states “Page not found.”

## Session Expired

**Purpose:** Re-authenticate without losing a protected task.

**Layout:** Inline blocking panel or Authentication page with an explicit “Your session expired” context and preserved destination.

**Components:** Alert, authentication form, retry or sign-in action.

**Interactions:** Successful authentication retries the safe read request or returns to the preserved route. Mutating requests are not replayed automatically unless their idempotency behavior makes replay safe.

**Validation:** Refresh failure must be definitive before showing the state. Sensitive form fields are not preserved.

**Responsive Behaviour:** Uses the Authentication responsive layout.

**Accessibility:** Expiry is announced once. Focus moves to the alert heading or first authentication field as appropriate.

## Offline / Connection Lost

**Purpose:** Preserve context and provide safe recovery during network loss.

**Layout:** Non-blocking banner when cached content remains usable; full recovery state when the task requires a connection.

**Components:** Connection banner, last-updated time, Retry, retained content, pending-action explanation.

**Interactions:** Retry in place. Scanner retains the scanned value until a definitive response. Checkout does not assume confirmation. Dashboard shows stale data.

**Validation:** Browser online status is advisory; successful API communication determines recovery. Unknown transaction outcomes remain pending.

**Responsive Behaviour:** Banner spans the content area without covering sticky navigation or actions.

**Accessibility:** Connection changes are announced politely. Repeated retry failures do not generate repeated intrusive announcements.

# Future Improvements

Future work must be validated against user research and backend readiness before implementation.

1. **Real payments:** Integrate a payment provider, server-created payment intents, reconciliation, receipts, refunds, and paid-order states. Until then, Payment remains unavailable.
2. **Search service:** Add server-side query, location, date, category, availability, and relevance sorting to support the specified Search experience at scale.
3. **Profile and preferences APIs:** Support verified email change, notification preferences, theme sync, password change, and session management.
4. **Native ticket wallet:** Add Apple Wallet and Google Wallet passes after ticket-security and update behavior are defined.
5. **Organizer analytics:** Add sales over time, conversion, capacity forecasting, and downloadable reports only when trustworthy aggregate APIs exist.
6. **Admin oversight and audit trail:** Add platform event oversight, administrative action logs, reasons, and system health endpoints.
7. **Multi-event and multi-gate staffing:** Replace the MVP single assigned event model with explicit event and gate assignments when operational research demonstrates the need.
8. **Offline check-in:** Explore signed offline ticket validation and conflict reconciliation only after security, clock drift, revocation, and duplicate-entry risks are solved.
9. **Localization:** Add locale-aware content, date/time, currency, and timezone selection. Vietnamese and English are the first expected locales.
10. **Event recommendations:** Add personalization only with transparent controls, sufficient event inventory, and measurable discovery value.
