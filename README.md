# TicketHub — Ticket Booking System

TicketHub is a full-stack ticket booking platform for **movies and concerts**. It provides customers with a visual seat-booking experience, temporary seat holds, secure booking, QR-code e-tickets, and waitlist management.

The system supports three user roles:

- **Customer** — Browse events, select seats, book tickets, and manage bookings
- *Organiser** — Create and manage events, pricing, and view booking/revenue statistics
- **Admin** — Manage venues, seats, organisers, events, and system-wide statistics

---

## Features

### Customer

- Register and login
- Browse movies and concerts
- Search and filter events
- View event details
- Interactive visual seat map
- View seat availability in real time
- Temporarily hold selected seats
- Live countdown timer for seat holds
- Simulated payment/checkout
- Generate QR-code e-tickets
- Receive booking confirmation by email
- View booking history
- View upcoming and past bookings
- Cancel bookings
- Join event/category waitlists
- Receive time-limited waitlist offers when seats become available

### Organiser

- Register as an organiser
- Login securely
- Create events
- Edit events
- Delete events
- Select venue, date and time
- Configure pricing for seat categories
- View organiser dashboard
- View total events
- View upcoming events
- View total bookings
- View total revenue
- View event-level ticket sales
- View available seats and revenue

### Admin

- Secure admin access
- Create venues
- Edit venues
- Delete venues
- Create seat categories
- Configure seat categories
- Generate complete venue seat layouts
- Assign seat rows to categories
- Manage organisers
- View system-wide statistics
- View customers, organisers, events, venues, bookings and revenue

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| UI | Tailwind CSS |
| Routing | React Router |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Database Driver | mysql2 |
| Authentication | JWT, bcryptjs |
| QR Code | qrcode |
| Email | Nodemailer |
| Scheduler | node-cron |
| Deployment | Vercel + Railway |

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │      Customer        │
                    │      Organiser       │
                    │       Admin          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React + Vite SPA   │
                    │   Tailwind CSS       │
                    │   React Router       │
                    └──────────┬───────────┘
                               │
                         REST / JSON
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Express.js API     │
                    │      Node.js         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │   Routes   │   │Controllers │   │  Services  │
       └────────────┘   └────────────┘   └─────┬──────┘
                                                │
                                                ▼
                                         ┌────────────┐
                                         │   Models   │
                                         │  Raw SQL   │
                                         └─────┬──────┘
                                               │
                                               ▼
                                         ┌────────────┐
                                         │   MySQL    │
                                         └────────────┘

                    ┌──────────────────────┐
                    │  Scheduler Service    │
                    │      node-cron        │
                    └──────────────────────┘
```

- **Routes** define endpoints and role guards.
- **Controllers** parse/validate requests and shape responses.
- **Services** hold business logic — most importantly `seatHoldService`, `bookingService`, and `waitlistService`, which coordinate multi-table transactions.
- **Models** are thin, raw-SQL data-access modules — no ORM.
- **Scheduler Service** runs independently via `node-cron`, periodically sweeping expired seat holds and waitlist offers.

---


## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list. Notably:

| Variable | Purpose |
|---|---|
| `SEAT_HOLD_TTL_MINUTES` | How long a seat stays held during checkout (default 10) |
| `WAITLIST_OFFER_TTL_MINUTES` | How long a waitlist offer stays valid (default 10) |
| `SCHEDULER_INTERVAL_SECONDS` | How often expired holds/offers are swept (default 30) |
| `SMTP_*`, `EMAIL_FROM` | Email delivery configuration |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth token signing |

---

## API Documentation

All endpoints are prefixed `/api`. Protected endpoints require `Authorization: Bearer <token>`.

**Auth**
- `POST /auth/register` — `{ name, email, password, role? }`
- `POST /auth/login` — `{ email, password }`
- `POST /auth/logout`
- `GET /auth/me`

**Events**
- `GET /events?type=&search=&dateFrom=&dateTo=&venueId=&maxPrice=&sort=`
- `GET /events/:id`
- `GET /events/:id/seats` — full seat map
- `GET /events/:id/bookings` — organiser/admin only
- `POST /events` — organiser only, `{ venueId, title, eventType, eventDate, eventTime, prices: [{categoryId, price}], ... }`
- `PUT /events/:id`, `DELETE /events/:id` — organiser (own events) / admin
- `GET /events/mine/list`, `GET /events/mine/revenue` — organiser dashboard

**Seats**
- `POST /seats/hold` — `{ eventId, seatCodes: [...] }` (customer only)
- `POST /seats/release` — `{ holdToken }`

**Bookings**
- `POST /bookings` — `{ eventId, holdToken }` (confirms a held cart)
- `GET /bookings` — the caller's bookings
- `GET /bookings/:id`
- `DELETE /bookings/:id` — cancel (releases seats, triggers waitlist)

**Waitlist**
- `POST /waitlist` — `{ eventId, categoryId, quantity? }`
- `GET /waitlist/mine`
- `GET /waitlist/offer/:token` — resolve a time-limited offer link
- `GET /waitlist/:eventId` — availability by category (organiser/admin)

**Venues (admin)**
- `GET /venues`, `GET /venues/:id`
- `POST /venues`, `PUT /venues/:id`, `DELETE /venues/:id`
- `POST /venues/:id/categories`
- `POST /venues/:id/seats/generate` — `{ rowCategoryMap: { "A": categoryId, ... } }`

**Admin**
- `GET /admin/stats`, `/admin/organisers`, `/admin/events`, `/admin/bookings`

---

## Seat Hold, Concurrency & Waitlist Mechanisms

Covered in depth in [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md): TTL enforcement, `SELECT ... FOR UPDATE` transactional locking, FIFO waitlist auto-assignment, and the cascading time-limited offer flow.

---

## QR Code Generation

Generated with the `qrcode` package at booking-confirmation time, encoding the booking reference. Returned as a base64 PNG data URL to the frontend and embedded (`cid:qrcode`) in the confirmation email.

## 📧 Email Configuration

`backend/src/utils/mailer.js` uses Nodemailer against any standard SMTP provider, configured entirely through environment variables — no credentials are hard-coded, and `.env` is git-ignored. If SMTP variables are unset, emails are logged to the console instead of sent, so local development works without a mail account. Every send attempt (success or failure) is recorded in the `email_notifications` table.

---

## Deployment

- **Backend**: any Node host (Render, Railway, Fly.io, etc.) — set the same env vars as `.env.example`, point `DB_HOST`/etc. at a managed MySQL instance (PlanetScale, Railway MySQL, RDS, etc.), and set `CLIENT_URL` to your deployed frontend origin (used for CORS and waitlist-offer links).
- **Frontend**: any static host (Vercel, Netlify, Render static site) — set `VITE_API_URL` to your deployed backend's `/api` URL at build time.
- Run `backend/database/schema.sql` against your production MySQL instance once before first boot.

---

## Testing Checklist

The following flows were validated during development (see `SYSTEM_DESIGN.md` for the mechanisms behind each):

1. Selecting an available seat marks it `Held`.
2. Abandoning checkout → seat returns to `Available` after the TTL (via the scheduler sweep).
3. Two simultaneous hold requests for the same seat → exactly one succeeds, the other receives a clear "just been selected" error.
4. Successful booking → seat becomes `Booked`, QR ticket is generated.
5. Cancelling a booking → seat becomes `Available` again.
6. Joining a waitlist places the customer in correct FIFO queue order.
7. Cancelling a booking offers the freed seat to the first waitlisted customer.
8. An unanswered waitlist offer expires and cascades to the next customer.
9. A confirmed booking triggers a confirmation email with QR code.
