# TicketHub — System Design Write-up

## 1. Seat Hold and TTL Mechanism

Every physical seat in a venue is snapshotted per event into `event_seats`,
which is the single source of truth for seat status (`available`, `held`,
`booked`, `unavailable`). When a customer selects seats, `POST /api/seats/hold`
opens a database transaction, locks the target rows, and — if they're all
`available` — flips them to `held` and inserts one `seat_holds` row per seat,
all sharing one `hold_token` (the "cart" for that checkout attempt). Each hold
row carries an `expires_at` timestamp set to `NOW() + SEAT_HOLD_TTL_MINUTES`
(default 10, configurable via `.env`). The frontend receives `expiresAt` and
renders a live countdown from it.

TTL enforcement is layered, not just client-side trust:
1. **Inline checks** — `convertHoldsToBooked` (called at checkout) and
   `releaseHold` re-verify a hold is still `active` before acting on it, so a
   hold that has technically expired but hasn't been swept yet can never be
   converted into a booking.
2. **Scheduler sweep** — a `node-cron` job (`schedulerService.js`) runs every
   `SCHEDULER_INTERVAL_SECONDS` (default 30s), finds every `active` hold
   whose `expires_at <= NOW()`, and — inside a transaction — flips the seat
   back to `available` and marks the hold `expired`. This guarantees release
   even if the customer's browser is closed and no further API calls happen.

## 2. Concurrency Prevention

The seat-hold and booking-confirmation code paths never read a seat's status
and then write to it in two separate steps. Instead, every mutation happens
inside a single MySQL transaction that first runs
`SELECT ... FOR UPDATE` on the target `event_seats` rows. InnoDB's row-level
locking means that if Customer A and Customer B both try to hold seat A5 at
the same instant, whichever transaction's `SELECT ... FOR UPDATE` executes
first acquires an exclusive lock on that row; the second transaction blocks
until the first commits (or rolls back). When it resumes, it re-reads the
row's *current* status — which is now `held` — and is correctly rejected with
"Sorry, this seat has just been selected by another customer." This removes
the classic read-then-write race condition entirely; no application-level
mutex or distributed lock is needed, since the guarantee comes from the
database engine itself. The same pattern (`lockEventSeatsById` /
`lockEventSeatsByCode` before writing) is reused for hold conversion,
release, cancellation, and waitlist offer creation, so every path that
touches seat status is equally protected.

## 3. Waitlist Auto-Assignment

`waitlists` rows are strictly FIFO per `(event_id, category_id)`, ordered by
`created_at`. When a booking is cancelled, `bookingService.cancelBooking`
releases the seat(s) and then calls `waitlistService.offerSeatToNextInQueue`
for each freed `event_seat_id`. That function opens its own transaction,
locks the seat, confirms it's genuinely `available`, and locks the
longest-waiting customer row with `SELECT ... FOR UPDATE ... LIMIT 1` — so
even if two seats in the same category free up simultaneously, each
transaction claims a distinct customer instead of racing for the same one.

## 4. Time-Limited Waitlist Offer

Offering a seat reuses the seat-hold machinery: the function marks the seat
`held`, inserts a `seat_holds` row owned by the offered customer, and inserts
a matching `waitlist_offers` row — both sharing one token
(`offer_token = hold_token`). The customer receives an email with a link
containing that token. Visiting the link resolves the offer and hands the
same token to the normal checkout flow as if it were an ordinary hold, so no
separate "waitlist checkout" code path is needed. If the offer's TTL
(`WAITLIST_OFFER_TTL_MINUTES`, default 10) expires before checkout, the same
scheduler sweep that expires normal holds detects that the expired hold's
token matches a pending `waitlist_offers` row and routes it through
`waitlistService.expireOffer` instead of a plain release: the seat is freed,
the offer and waitlist entry are marked `expired`, and
`offerSeatToNextInQueue` is immediately called again for that seat —
cascading the offer to the next person in line.

## 5. Seat Status Management

`event_seats.status` is the only place seat availability is stored per show;
`seats` describes the physical venue layout once and is reused across every
event held there. A `version` column is incremented on every status change
as a lightweight audit/optimistic-locking aid.

## 6. QR-Code Ticket Generation

On booking confirmation, the `qrcode` package encodes the booking reference
(e.g. `TKT-7F3K9C2A`) into a PNG data URL, returned to the frontend for
immediate display and also attached (as an embedded `cid:qrcode` image) to
the confirmation email.

## 7. Email Notification Flow

`utils/mailer.js` wraps Nodemailer with a single `sendEmail` helper.
Booking confirmations and waitlist offers are sent asynchronously,
best-effort, and every attempt (sent or failed) is logged to
`email_notifications` for auditability — a failed email never blocks or
rolls back the underlying booking/offer transaction.
