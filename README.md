# TicketHub — Ticket Booking System

A full-stack ticket booking platform for movies and concerts, with a
real-time visual seat map, concurrency-safe seat holds, a FIFO waitlist with
automatic seat re-assignment, QR-code e-tickets, and email delivery.

Three roles are supported: **Customer**, **Organiser**, and **Admin**.

---

## Features

**Customer**
- Register / login, browse & filter/search movies and concerts
- Visual seat map with live status (available / held / booked)
- Select seats → temporary hold with a live countdown timer
- Checkout with a simulated payment step → QR-code e-ticket by email
- Booking history (upcoming / past / cancelled), cancel a booking
- Join a waitlist for sold-out categories; get a time-limited offer link by
  email when a seat frees up

**Organiser**
- Register / login, create/edit/delete events (movie or concert)
- Choose venue, date/time, and set per-seat-category pricing
- Dashboard: total events, upcoming events, total bookings, total revenue
- Per-event table of tickets sold, seats available, and revenue

**Admin**
- Create/edit/delete venues; define seat categories (e.g. Premium, Standard)
- Generate a venue's full seat layout (rows × seats), assigning each row to
  a category
- Manage organisers; system-wide stats (customers, organisers, events,
  venues, bookings, revenue)

---

## Technology Stack

| Layer          | Technology                                   |
|----------------|-----------------------------------------------|
| Frontend       | React 18 (Vite), React Router, Tailwind CSS, Axios |
| Backend        | Node.js, Express.js                          |
| Database       | MySQL (raw SQL via `mysql2`, no ORM)         |
| Auth           | JWT (`jsonwebtoken`) + `bcryptjs`            |
| QR Codes       | `qrcode`                                     |
| Email          | `nodemailer` (any SMTP provider)             |
| Scheduling     | `node-cron` (seat-hold / offer expiry sweep) |

---

## System Architecture

```
frontend/  (React SPA, Vite)
   │  REST/JSON over HTTPS, JWT bearer auth
   ▼
backend/   (Express API)
   ├─ routes/        → controllers/  → services/  → models/  → MySQL
   └─ services/schedulerService.js   (node-cron: expiry sweep)
```

- **routes** define endpoints and role guards.
- **controllers** parse/validate requests and shape responses.
- **services** hold business logic — most importantly `seatHoldService`,
  `bookingService`, and `waitlistService`, which coordinate multi-table
  transactions (see `SYSTEM_DESIGN.md` for the concurrency/TTL/waitlist
  mechanisms in detail).
- **models** are thin, raw-SQL data-access modules — no ORM.

---

## Database Schema

See [`backend/database/schema.sql`](backend/database/schema.sql) for the full
DDL. Key tables:

`users`, `venues`, `seat_categories`, `seats`, `events`, `event_prices`,
`event_seats` (the per-show seat map), `seat_holds`, `bookings`,
`booking_seats`, `waitlists`, `waitlist_offers`, `email_notifications`.

Key relationships: `User → Bookings`, `Organiser → Events`, `Venue → Seats`,
`Event → Event Seats`, `Booking → Booking Seats`,
`Event + Seat → Seat Status (event_seats)`,
`Event + Seat Category → Waitlist`.

---

## Installation

### Prerequisites
- Node.js 18+
- MySQL 8+ (or compatible, e.g. MariaDB 10.6+)
- An SMTP account for email (Gmail App Password, SendGrid, Mailtrap, etc.) —
  optional for local dev; emails are logged to the console if unset.

### 1. Database Setup

```bash
mysql -u root -p < backend/database/schema.sql
```

This creates the `tickethub` database and all tables.

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# edit .env: DB credentials, JWT_SECRET, SMTP settings, CLIENT_URL, etc.
npm install
npm run dev        # nodemon, auto-restart
# or: npm start
```

The API starts on `http://localhost:5000` (configurable via `PORT`), and logs
`TicketHub API listening on http://localhost:<port>` plus a scheduler
start-up message.

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# edit .env: VITE_API_URL (defaults to http://localhost:5000/api)
npm install
npm run dev
```

The app starts on `http://localhost:5173`.

### 4. First-time data

- Register an account choosing **"Sell tickets (Organiser)"** to get an
  organiser account.
- Admin accounts are **not** self-registrable (by design — see
  `authController.js`). Seed one directly in the database, e.g.:
  ```sql
  INSERT INTO users (name, email, password_hash, role)
  VALUES ('Admin', 'admin@tickethub.com', '$2a$10$<bcrypt-hash>', 'admin');
  ```
  Generate a bcrypt hash with `node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`
  from inside `backend/`.
- As admin: create a venue → add seat categories → generate the seat layout.
- As organiser: create an event against that venue and set prices per
  category.

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list.
Notably:

| Variable | Purpose |
|---|---|
| `SEAT_HOLD_TTL_MINUTES` | How long a seat stays held during checkout (default 10) |
| `WAITLIST_OFFER_TTL_MINUTES` | How long a waitlist offer stays valid (default 10) |
| `SCHEDULER_INTERVAL_SECONDS` | How often expired holds/offers are swept (default 30) |
| `SMTP_*`, `EMAIL_FROM` | Email delivery configuration |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth token signing |

---

## API Documentation

All endpoints are prefixed `/api`. Protected endpoints require
`Authorization: Bearer <token>`.

**Auth**
- `POST /auth/register` `{ name, email, password, role? }`
- `POST /auth/login` `{ email, password }`
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
- `POST /seats/hold` `{ eventId, seatCodes: [...] }` — customer only
- `POST /seats/release` `{ holdToken }`

**Bookings**
- `POST /bookings` `{ eventId, holdToken }` — confirms a held cart
- `GET /bookings` — the caller's bookings
- `GET /bookings/:id`
- `DELETE /bookings/:id` — cancel (releases seats, triggers waitlist)

**Waitlist**
- `POST /waitlist` `{ eventId, categoryId, quantity? }`
- `GET /waitlist/mine`
- `GET /waitlist/offer/:token` — resolve a time-limited offer link
- `GET /waitlist/:eventId` — availability-by-category (organiser/admin)

**Venues (admin)**
- `GET /venues`, `GET /venues/:id`
- `POST /venues`, `PUT /venues/:id`, `DELETE /venues/:id`
- `POST /venues/:id/categories`
- `POST /venues/:id/seats/generate` `{ rowCategoryMap: { "A": categoryId, ... } }`

**Admin**
- `GET /admin/stats`, `/admin/organisers`, `/admin/events`, `/admin/bookings`

---

## Seat Hold, Concurrency, and Waitlist Mechanisms

Covered in depth in [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) (≤800 words):
TTL enforcement, `SELECT ... FOR UPDATE` transactional locking, FIFO
waitlist auto-assignment, and the cascading time-limited offer flow.

---

## QR Code Generation

Generated with the `qrcode` package at booking-confirmation time, encoding
the booking reference. Returned as a base64 PNG data URL to the frontend and
embedded (`cid:qrcode`) in the confirmation email.

## Email Configuration

`backend/src/utils/mailer.js` uses Nodemailer against any standard SMTP
provider, configured entirely through environment variables — no
credentials are hard-coded, and `.env` is git-ignored. If SMTP variables are
unset, emails are logged to the console instead of sent, so local
development works without a mail account. Every send attempt (success or
failure) is recorded in the `email_notifications` table.

---

## Running Locally (quick reference)

```bash
# terminal 1
mysql -u root -p < backend/database/schema.sql
cd backend && cp .env.example .env && npm install && npm run dev

# terminal 2
cd frontend && cp .env.example .env && npm install && npm run dev
```

Visit `http://localhost:5173`.

---

## Deployment

- **Backend**: any Node host (Render, Railway, Fly.io, etc.) — set the same
  env vars as `.env.example`, point `DB_HOST`/etc. at a managed MySQL
  instance (PlanetScale, Railway MySQL, RDS, etc.), and set `CLIENT_URL` to
  your deployed frontend origin (used for CORS and waitlist-offer links).
- **Frontend**: any static host (Vercel, Netlify, Render static site) — set
  `VITE_API_URL` to your deployed backend's `/api` URL at build time.
- Run `backend/database/schema.sql` against your production MySQL instance
  once before first boot.

---

## Testing Checklist

The following flows were validated during development (see
`SYSTEM_DESIGN.md` for the mechanisms behind each):

1. Selecting an available seat marks it `Held`.
2. Abandoning checkout → seat returns to `Available` after the TTL (via the
   scheduler sweep).
3. Two simultaneous hold requests for the same seat → exactly one succeeds,
   the other receives a clear "just been selected" error.
4. Successful booking → seat becomes `Booked`, QR ticket is generated.
5. Cancelling a booking → seat becomes `Available` again.
6. Joining a waitlist places the customer in correct FIFO queue order.
7. Cancelling a booking offers the freed seat to the first waitlisted
   customer.
8. An unanswered waitlist offer expires and cascades to the next customer.
9. A confirmed booking triggers a confirmation email with QR code.
