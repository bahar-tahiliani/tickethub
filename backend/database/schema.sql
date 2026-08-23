-- =====================================================================
-- TicketHub - Ticket Booking System
-- MySQL Database Schema
-- =====================================================================
-- Run with:  mysql -u <user> -p < schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS tickethub
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tickethub;

-- ---------------------------------------------------------------------
-- users  (customers, organisers, admins all live here, distinguished by role)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer', 'organiser', 'admin') NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------
CREATE TABLE venues (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(190) NOT NULL,
  location        VARCHAR(255) NOT NULL,
  num_rows        INT NOT NULL,
  seats_per_row   INT NOT NULL,
  created_by      INT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_venues_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- seat_categories (e.g. Premium, Standard) - per venue
-- ---------------------------------------------------------------------
CREATE TABLE seat_categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  venue_id    INT NOT NULL,
  name        VARCHAR(80) NOT NULL,
  color_code  VARCHAR(20) DEFAULT '#6b7280',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seatcat_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  UNIQUE KEY uq_venue_category (venue_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- seats - physical seat layout belonging to a venue
-- ---------------------------------------------------------------------
CREATE TABLE seats (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  venue_id      INT NOT NULL,
  category_id   INT NOT NULL,
  row_label     VARCHAR(5) NOT NULL,
  seat_number   INT NOT NULL,
  seat_code     VARCHAR(10) NOT NULL,          -- e.g. A1, B12
  is_active     BOOLEAN NOT NULL DEFAULT TRUE, -- false = permanently unavailable (e.g. broken seat)
  CONSTRAINT fk_seats_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  CONSTRAINT fk_seats_category FOREIGN KEY (category_id) REFERENCES seat_categories(id),
  UNIQUE KEY uq_venue_seat_code (venue_id, seat_code)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- events (movies / concerts) - owned by an organiser, held at a venue
-- ---------------------------------------------------------------------
CREATE TABLE events (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  organiser_id    INT NOT NULL,
  venue_id        INT NOT NULL,
  title           VARCHAR(190) NOT NULL,
  description     TEXT,
  event_type      ENUM('movie', 'concert') NOT NULL,
  poster_url      VARCHAR(500),
  event_date      DATE NOT NULL,
  event_time      TIME NOT NULL,
  status          ENUM('draft', 'published', 'cancelled') NOT NULL DEFAULT 'published',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_organiser FOREIGN KEY (organiser_id) REFERENCES users(id),
  CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id),
  INDEX idx_events_date (event_date),
  INDEX idx_events_type (event_type)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- event_prices - price per seat category for a given event
-- ---------------------------------------------------------------------
CREATE TABLE event_prices (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  category_id   INT NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_eventprices_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_eventprices_category FOREIGN KEY (category_id) REFERENCES seat_categories(id),
  UNIQUE KEY uq_event_category (event_id, category_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- event_seats - per-show status of every physical seat (the "seat map")
-- This is the single source of truth for seat availability for an event.
-- ---------------------------------------------------------------------
CREATE TABLE event_seats (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  seat_id       INT NOT NULL,
  status        ENUM('available', 'held', 'booked', 'unavailable') NOT NULL DEFAULT 'available',
  version       INT NOT NULL DEFAULT 0,   -- optimistic-locking guard, incremented on every status change
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_eventseats_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_eventseats_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
  UNIQUE KEY uq_event_seat (event_id, seat_id),
  INDEX idx_eventseats_status (event_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- seat_holds - temporary holds placed while a customer is checking out
-- TTL enforced both by expires_at (checked on every read) and by the
-- scheduler service which sweeps expired holds and releases seats.
-- ---------------------------------------------------------------------
CREATE TABLE seat_holds (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  event_seat_id   INT NOT NULL,
  user_id         INT NOT NULL,
  hold_token      VARCHAR(64) NOT NULL,
  status          ENUM('active', 'converted', 'released', 'expired') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME NOT NULL,
  CONSTRAINT fk_seatholds_eventseat FOREIGN KEY (event_seat_id) REFERENCES event_seats(id) ON DELETE CASCADE,
  CONSTRAINT fk_seatholds_user FOREIGN KEY (user_id) REFERENCES users(id),
  -- hold_token is shared by every seat in the same checkout "cart", so it is
  -- intentionally NOT unique - indexed instead for fast lookup by token.
  INDEX idx_seatholds_token (hold_token),
  INDEX idx_seatholds_expiry (status, expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference   VARCHAR(20) NOT NULL,
  user_id             INT NOT NULL,
  event_id            INT NOT NULL,
  total_amount        DECIMAL(10,2) NOT NULL,
  status              ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  qr_code_data        TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at        TIMESTAMP NULL,
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(id),
  UNIQUE KEY uq_booking_reference (booking_reference)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- booking_seats - line items linking a booking to specific event seats
-- ---------------------------------------------------------------------
CREATE TABLE booking_seats (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  booking_id      INT NOT NULL,
  event_seat_id   INT NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_bookingseats_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookingseats_eventseat FOREIGN KEY (event_seat_id) REFERENCES event_seats(id),
  UNIQUE KEY uq_booking_eventseat (event_seat_id)
  -- Note: the row for a given event_seat_id is deleted when its booking is
  -- cancelled (see bookingService.cancelBooking), which is what allows that
  -- seat to be legitimately re-booked later while this uniqueness constraint
  -- still guarantees a *currently active* seat can never back two bookings.
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- waitlists - a customer's place in line for a sold-out seat category
-- ---------------------------------------------------------------------
CREATE TABLE waitlists (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  category_id   INT NOT NULL,
  user_id       INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  status        ENUM('waiting', 'offered', 'fulfilled', 'cancelled', 'expired') NOT NULL DEFAULT 'waiting',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_waitlist_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_category FOREIGN KEY (category_id) REFERENCES seat_categories(id),
  CONSTRAINT fk_waitlist_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_waitlist_queue (event_id, category_id, status, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- waitlist_offers - time-limited offer of a specific freed-up seat
-- ---------------------------------------------------------------------
CREATE TABLE waitlist_offers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  waitlist_id     INT NOT NULL,
  event_seat_id   INT NOT NULL,
  offer_token     VARCHAR(64) NOT NULL,
  status          ENUM('pending', 'accepted', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  offered_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME NOT NULL,
  CONSTRAINT fk_waitlistoffer_waitlist FOREIGN KEY (waitlist_id) REFERENCES waitlists(id) ON DELETE CASCADE,
  CONSTRAINT fk_waitlistoffer_eventseat FOREIGN KEY (event_seat_id) REFERENCES event_seats(id),
  UNIQUE KEY uq_offer_token (offer_token),
  INDEX idx_waitlistoffer_expiry (status, expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- email_notifications - audit log of every email the system has sent/attempted
-- ---------------------------------------------------------------------
CREATE TABLE email_notifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  type          ENUM('booking_confirmation', 'waitlist_offer', 'waitlist_expired', 'booking_cancellation') NOT NULL,
  recipient     VARCHAR(190) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  status        ENUM('sent', 'failed') NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emailnotif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
