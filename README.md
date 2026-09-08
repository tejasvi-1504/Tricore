# Krevol

Agency website with a career-consulting booking system — MongoDB storage,
Cashfree payments and email notifications, deployed on Vercel.

```
index.html            Main site
booking-status.html   Payment return page
script.js  styles.css Frontend
api/                  Vercel serverless functions
  _lib/               Shared backend modules
```

---

## 1. Install

```bash
npm install
```

## 2. Configure

Copy `.env.example` to `.env.local` for local work, and add the same keys under
**Vercel → Project → Settings → Environment Variables** for production.

### MongoDB

1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Add a database user (Database Access).
3. Under Network Access allow `0.0.0.0/0` — Vercel's IPs are dynamic.
4. Copy the connection string into `MONGODB_URI`.

Collections are created automatically on first write:

| Collection | Holds |
|---|---|
| `bookings` | Every consultation booking |
| `slots`    | One doc per reserved slot — the lock that prevents double-booking |
| `contacts` | Contact-form enquiries |

### Consultation pricing

```
PRICE_ONE_TO_ONE=499     # rupees
PRICE_GROUP=299
```

**Leave these empty or `0` and the session is free** — the payment step is
skipped entirely and the booking confirms straight away. Set a number and that
session routes through Cashfree. No code change either way.

### Cashfree

1. <https://merchant.cashfree.com> → **Developers → API Keys**.
2. Put the App ID and Secret Key in `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`.
3. Keep `CASHFREE_ENV=sandbox` until you have tested end to end, then switch to
   `production`.
4. Under **Developers → Webhooks**, add:
   `https://your-domain.com/api/payment-webhook`

The secret key is only ever read server-side; it never reaches the browser.

### Email

Notifications go to `BOOKING_EMAIL` (`itskanishka1202@gmail.com`).

Gmail needs an **App Password**, not your account password:
Google Account → Security → 2-Step Verification → App passwords. Paste the
16-character value into `SMTP_PASS`.

## 3. Run locally

```bash
npm i -g vercel
vercel dev
```

The static files alone can be served with `python -m http.server 5500`, but the
`/api` routes need `vercel dev`.

---

## Consultation hours

Set in `api/_lib/availability.js`:

| Days | Window | Slot starts |
|---|---|---|
| Mon – Fri | 8:00 PM – 10:00 PM IST | every 30 min |
| Sat & Sun | 10:00 AM – 10:00 PM IST | hourly |

A slot is only offered if the whole session fits inside the window, so a 45-min
1:1 on a weekday offers 8:00, 8:30 and 9:00 PM — never 9:30.

Other rules: bookings open up to **60 days** ahead, with **60 minutes**
minimum notice. 1:1 calls are 45 min (capacity 1); group calls are 60 min
(capacity 8).

> `script.js` keeps a mirrored copy of these rules so the calendar renders
> without waiting on the API. **Change both files together.** The server always
> re-validates, so the mirror can never let an invalid booking through — it can
> only show a wrong slot briefly.

---

## How a booking works

```
student picks slot + fills details
        │
        ▼
POST /api/bookings
   ├─ validate against availability rules
   ├─ atomically reserve the slot   ← blocks double-booking
   ├─ insert the booking
   ├─ free?  → confirm + email both sides
   └─ paid?  → create Cashfree link, return it (booking stays `pending`)
        │
        ▼
student pays on Cashfree → returns to /booking-status.html?id=KVX-XXXXXX
        │
        ├─ POST /api/payment-webhook   (Cashfree → us)
        └─ GET  /api/booking-status    (return page polls)
                 │
                 └─ both call settleBooking(), which asks Cashfree
                    directly whether the link is paid
```

**Why the direct lookup matters:** an incoming webhook is treated only as a
hint. We never mark a booking paid because a payload said so — we re-fetch the
order from Cashfree with our own credentials. A forged webhook can therefore
trigger a lookup but can never confirm an unpaid booking. The signature is also
verified whenever the raw body is recoverable.

It also means a booking still confirms if the webhook never arrives, because the
return page runs the same check.

### Double-booking

`slots` holds one document per slot, `_id = "<date>_<HH:mm>"`. Reserving does an
upsert filtered on `count < capacity` **and** the session type. If a slot is
full or held by the other session type, the upsert falls through to an insert on
an existing `_id`, Mongo rejects it with a duplicate-key error, and the request
returns `409 SLOT_TAKEN`. Atomic, no transaction needed.

Slots are released if the booking fails, the payment link expires, or the
payment is cancelled.

---

## API

| Route | Method | Purpose |
|---|---|---|
| `/api/slots?date=&session=` | GET | Slots for a date, each flagged available |
| `/api/bookings` | POST | Create a booking; returns a payment URL if priced |
| `/api/booking-status?id=` | GET | Verify + read a booking (used by the return page) |
| `/api/payment-webhook` | POST | Cashfree notifications |
| `/api/contact` | POST | Contact-form enquiries |

All routes rate-limit per IP and validate input server-side. The contact form
carries a honeypot field.
