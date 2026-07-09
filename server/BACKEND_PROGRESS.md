# Event Management API — Continuation Notes

This documents what was added and fixed to complete the backend, continuing from the existing auth/events/tickets modules.

## What was already there (kept as-is)

- **Auth** — signup, email verification, login, refresh-token rotation with reuse detection, forgot/reset password, logout.
- **Events** — CRUD, filtering/search, publish/cancel, organizer-scoped access.
- **Tickets** — QR generation, check-in, transfer, per-event stats.

## What was added

### Payments module (`modules/payments`) — Khalti + eSewa

Nepal payment gateways, no external SDK required (uses global `fetch` + HMAC).

- `POST /api/v1/payments/initiate` *(auth)* — body `{ bookingId, provider }` where `provider` is `"khalti"` or `"esewa"`.
  - **Khalti** → returns `{ method: "redirect", paymentUrl, pidx }`; redirect the browser to `paymentUrl`.
  - **eSewa** → returns `{ method: "POST", formUrl, fields }`; the client auto-submits a form with those fields to `formUrl`.
- `GET /api/v1/payments/khalti/callback` — Khalti return URL. Verifies via server-side lookup, confirms the booking, redirects to `CLIENT_URL/payment/success|failure`.
- `GET /api/v1/payments/esewa/callback` — eSewa success URL. Decodes the `data` payload, checks the signature, re-verifies against eSewa's status API, confirms the booking, redirects.

Both callbacks verify the paid amount against the booking total before confirming (anti-tampering), and booking confirmation is idempotent.

### Organizer onboarding (`modules/organizers`)

- `POST /api/v1/organizers` *(auth)* — create an organizer profile and promote the user to `org_owner` (required before creating events).
- `GET /api/v1/organizers/me`, `PATCH /api/v1/organizers/me`.

### Booking flow (`modules/bookings`)

- Extracted a shared `BookingService` (seat reservation, ticket issuance, confirmation, expiry).
- Rewrote `createBooking`: atomic per-ticket-type seat reservation with rollback on contention, free events auto-confirm, paid events return `requiresPayment: true` and await payment.
- Ticket issuance now actually runs (was previously commented out).
- Added a background sweeper that releases seats from pending bookings whose 15-minute hold lapses.

## Bugs fixed

- Booking model: status enum typos (`Conifirmed`, lowercase `pending`) and wrong `ref`s (`user` → `User`, `Organization` → `Organizer`) that broke `.populate()`.
- Booking flow: inverted "event already started" check; nested-loop scoping.
- Roles are now embedded in the access token and set on `req.user`, so `authorize()` works for org staff.
- Global error handler + 404 handler mounted (controllers throwing `ApiError` now return proper responses).
- Cookie parsing middleware added (dependency-free) so the refresh-token flow can read cookies.
- `Event` model: added `isActive` on ticket types and `totalBookings`.
- `env.ts` now validates the variables actually used.
- All routers (organizers, bookings, tickets, payments) wired into `app.ts`.

## New environment variables

See `.env`. Set `KHALTI_SECRET_KEY` to your Khalti sandbox/live key. eSewa defaults to public test credentials (`EPAYTEST`). Set `SERVER_URL` to the public base URL of this API so providers can reach the callbacks.

## Build

`npm run build` (tsc) compiles cleanly. No new npm dependencies were introduced.
