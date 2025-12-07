# Developer Handbook - Lupe's Barber Control Panel

## Table of Contents

1. [System Overview](#system-overview)
2. [Local Development](#local-development)
3. [Database Schema](#database-schema)
4. [Row Level Security & Public Access](#row-level-security--public-access)
5. [Booking Flow Details](#booking-flow-details)
6. [Test Mode Implementation](#test-mode-implementation)
7. [SMS Reminder System](#sms-reminder-system)
8. [Image Storage](#image-storage)
9. [Known TODOs & Future Enhancements](#known-todos--future-enhancements)

---

## System Overview

### Architecture

This is a full-stack barber shop management system built with:

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Storage + Edge Functions)
- **Authentication:** Supabase Auth (email/password)
- **SMS:** Twilio integration via Edge Functions
- **Payments:** Stripe integration (stub, needs completion)
- **PWA:** Progressive Web App with offline support

### Main Domains

1. **Auth & Users:** Role-based access (Owner, Barber, Client)
2. **Barbers:** Profiles, schedules, time-off, permissions
3. **Services & Products:** Catalog with images, pricing
4. **Appointments:** Booking, rescheduling, cancellation
5. **Reminders:** Automated SMS notifications with scheduling
6. **Time Tracking:** Clock in/out, breaks, commission tracking
7. **Images:** Supabase Storage for barber photos, service/product images
8. **Test Mode:** Safe testing environment for bookings

### Tech Stack Details

- **React Router v6:** Client-side routing
- **Day.js:** Date/time manipulation
- **Supabase JS Client:** Database queries, auth, storage
- **Vite PWA Plugin:** Service worker, offline support
- **Edge Functions:** Deno runtime for serverless functions

---

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Supabase account with project created
- (Optional) Twilio account for SMS testing
- (Optional) Stripe account for payment testing

### Setup Steps

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd project
   npm install
   ```

2. **Environment variables:**

   Copy `.env.example` to `.env` and fill in:

   ```env
   # Required - Supabase
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key

   # Optional - SMS (via Twilio)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_FROM_NUMBER=+1234567890
   SMS_ENABLED=true

   # Optional - Payments (via Stripe)
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Run migrations:**

   All migrations are in `/supabase/migrations/`. Apply them via Supabase dashboard or CLI:
   ```bash
   supabase db push
   ```

4. **Run dev server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

### Project Structure

```
src/
  components/       # Reusable UI components (modals, headers, etc.)
  contexts/         # React contexts (Auth, Language)
  hooks/            # Custom React hooks (PWA install prompt)
  lib/              # Utilities and helpers
    - supabase.ts   # Supabase client initialization
    - bookingRules.ts # Booking slot generation & validation
    - notificationHelper.ts # SMS notification wrappers
    - uploadHelper.ts # Image upload/delete utilities
    - translations.ts # i18n strings
  pages/            # Route components
    - Owner*.tsx    # Owner dashboard pages
    - Barber*.tsx   # Barber-specific pages
    - Client*.tsx   # Client-facing pages
  utils/            # Pure utility functions
    - dateTime.ts   # Date formatting helpers
  App.tsx           # Root component with routing
  main.tsx          # Entry point

supabase/
  migrations/       # Database schema migrations (SQL)
  functions/        # Edge Functions (Deno/TypeScript)
    - send-sms/
    - send-notification/
    - send-reminders/
    - create-checkout/ (Stripe)
    - confirm-payment/ (Stripe)
    - client-otp/ (future feature)
```

---

## Database Schema

### Key Tables

#### `users`
Core user table with role-based access.

- **id:** UUID primary key
- **auth_user_id:** References Supabase auth.users
- **email, name, phone:** Contact info
- **role:** `OWNER | BARBER | CLIENT` (enum)
- **active:** Boolean - inactive users can't log in
- **commission_rate:** Decimal - barber commission percentage
- **photo_url, public_display_name, bio:** Public profile data
- **show_on_client_site:** Boolean - appear in public barber list
- **accept_online_bookings:** Boolean - allow client bookings
- **can_book_appointments, can_send_sms:** Permissions
- **created_at, updated_at:** Timestamps

**Important:** When a user is created, a trigger syncs `role` to `auth.users.raw_app_metadata`.

#### `barber_schedules`
Weekly recurring schedules for barbers.

- **barber_id:** FK to users
- **day_of_week:** 0-6 (Sunday-Saturday)
- **start_time, end_time:** Time ranges
- **is_working:** Boolean - if false, barber off that day

#### `barber_time_off`
One-time time-off periods (vacations, sick days).

- **barber_id:** FK to users
- **start_date, end_date:** Date range
- **reason:** Optional note
- **status:** `pending | approved | denied`

#### `services`
Services offered by the shop.

- **id, name_en, name_es:** Bilingual names
- **base_price:** Decimal
- **duration_minutes:** Integer
- **image_url:** Optional Supabase Storage URL
- **active:** Boolean

#### `products`
Retail products sold.

- Similar to services
- **stock_quantity:** Integer - inventory tracking
- **sku:** Optional stock keeping unit

#### `clients`
Client contact information.

- **first_name, last_name, phone, email:** Contact
- **language:** `en | es` - preferred language
- **notes:** Internal notes
- **last_visit:** Timestamp

#### `appointments`
Core bookings table.

- **id:** UUID
- **barber_id, client_id, service_id:** FKs
- **scheduled_start, scheduled_end:** Timestamps
- **status:** `booked | completed | cancelled | no_show`
- **source:** `owner_manual | barber_manual | client_web | ...`
- **payment_status:** `unpaid | paid | partial | refunded`
- **amount_due, amount_paid:** Decimals
- **is_test:** Boolean - **TEST MODE FLAG**
- **notes:** Optional appointment notes
- **cancelled_at, cancelled_by:** Audit trail

#### `booking_reminders`
Scheduled reminders for appointments.

- **appointment_id:** FK to appointments
- **reminder_type:** `primary | secondary`
- **reminder_offset_hours:** How many hours before appointment
- **scheduled_for:** When to send (calculated)
- **status:** `pending | sent | sent_test | skipped | cancelled | failed`
- **sent_at:** Actual send time
- **error_message:** If failed

#### `client_messages`
Log of all SMS/communications sent.

- **client_id, appointment_id:** FKs
- **phone_number, message:** Content
- **channel:** `sms | email | ...`
- **source:** `confirmation_auto | reminder_auto | engage_manual | ...`
- **notification_type:** `confirmation | reminder | cancellation | reschedule`
- **status:** `sent | sent_test | error`
- **twilio_sid:** Twilio message ID (if sent)
- **sent_by_user_id:** Who triggered (null for auto)

#### `barber_time_entries`
Time tracking for payroll.

- **barber_id:** FK to users
- **clock_in, clock_out:** Timestamps
- **break_start, break_end:** Break times
- **total_hours, break_hours, billable_hours:** Calculated
- **notes:** Optional

#### `shop_config`
Single-row configuration table.

- **id:** Always 1
- **shop_name, phone, address, timezone:** Basic info
- **days_bookable_in_advance, min_book_ahead_hours, min_cancel_ahead_hours, client_booking_interval_minutes:** Booking rules
- **enable_reminders, reminder_hours_before, reminder_hours_before_secondary:** SMS settings
- **test_mode_enabled:** Boolean - **TEST MODE MASTER SWITCH**
- **enable_tips, tip_percentage_presets, tip_flat_presets:** Payment features

### Important Flags & Columns

- **users.active:** If false, user cannot log in
- **users.show_on_client_site:** If false, barber hidden from public site
- **users.accept_online_bookings:** If false, clients can't book this barber online
- **appointments.is_test:** If true, this is test data (safe to delete)
- **shop_config.test_mode_enabled:** Master switch for test mode
- **booking_reminders.status = 'sent_test':** Reminder was "sent" in test mode

---

## Row Level Security & Public Access

### RLS Policies Overview

All tables have RLS enabled. Policies are restrictive by default (deny all) with explicit grants.

### Key Policies

#### `users` table:
- **SELECT:**
  - Authenticated users can read own record
  - Authenticated users can read barbers if `active=true`
  - **PUBLIC can read barbers** if `role=BARBER AND active=true` (for client booking site)
- **UPDATE:**
  - Owners can update any user
  - Users can update own profile (limited fields)
  - Owners can toggle `active` status
- **INSERT:** Owner only
- **DELETE:** Owner only (but soft-delete via `active=false` preferred)

#### `appointments` table:
- **SELECT:** Owner sees all, barbers see own, clients see own
- **INSERT:** Owner and barbers with `can_book_appointments`, clients via web
- **UPDATE:** Owner and assigned barber, clients can cancel own
- **DELETE:** Owner only

#### `services` and `products` tables:
- **SELECT:** Everyone (public) can read if `active=true`
- **INSERT/UPDATE/DELETE:** Owner only

#### `booking_reminders` table:
- **SELECT:** Owner and assigned barber
- **INSERT:** Service role (auto-created by triggers/functions)
- **UPDATE:** Service role (reminder system updates status)

### Public Access for Client Booking

The client booking flow (`/book`) runs **without authentication**. It relies on:

1. Public read access to `users` where `role='BARBER' AND active=true`
2. Public read access to `services` and `products` where `active=true`
3. Unauthenticated users can **INSERT** into `appointments` and `clients` (with RLS allowing `source='client_web'`)

This is intentional - clients don't need accounts to book.

### Storage Buckets

Three buckets with public read access:

- **barber-photos:** Publicly readable, authenticated upload only
- **service-images:** Publicly readable, authenticated upload only
- **product-images:** Publicly readable, authenticated upload only

Policies:
- **SELECT/DOWNLOAD:** Anyone can read
- **INSERT/UPLOAD:** Authenticated users only
- **UPDATE/DELETE:** Authenticated users can manage own uploads

---

## Booking Flow Details

### Step-by-Step: ClientBook.tsx

The client booking flow (`/book`) is a 5-step wizard:

1. **Select Barber**
2. **Select Service**
3. **Select Date & Time**
4. **Enter Contact Info**
5. **Confirm & Pay (or Pay in Shop)**

### Slot Generation Logic

Located in: `src/lib/bookingRules.ts`

Function: `generateAvailableSlotsForBarber()`

**Algorithm:**

1. Load shop config (booking rules)
2. Load barber's weekly schedule for the target date
3. Check if barber has time-off on that date
4. Generate candidate slots at `client_booking_interval_minutes` intervals
5. For each slot:
   - Check if it's within barber's working hours
   - Check if it meets `min_book_ahead_hours` from now
   - Check if it's within `days_bookable_in_advance`
   - Query existing appointments for conflicts
   - Exclude slot if it overlaps with existing appointment or time-off
6. Return list of available slots

### Booking Rules Enforcement

- **days_bookable_in_advance:** Client can't book beyond this many days from today
- **min_book_ahead_hours:** Client must book at least this far in advance (prevents last-minute bookings)
- **min_cancel_ahead_hours:** Client must cancel at least this far ahead (enforced in cancellation flow)
- **client_booking_interval_minutes:** Slots offered to clients (e.g., every 30 min even if service is 45 min)

### Rescheduling

When a client reschedules:

1. Find the existing appointment
2. Validate cancellation notice (must meet `min_cancel_ahead_hours`)
3. Mark original appointment as `cancelled`
4. Create new appointment with new date/time
5. Cancel old reminders, create new reminders for new appointment
6. Send confirmation SMS (if enabled)

**Note:** Rescheduling is essentially a cancel + new booking in one transaction.

### Test Mode in Booking

When `shop_config.test_mode_enabled = true`:

- **Step 5:** Shows prominent warning banner
- **Payment:** Forces "pay in shop" mode (no Stripe)
- **Button text:** "Confirm Test Booking" instead of "Confirm Booking"
- **On submit:** Sets `appointments.is_test = true`
- **SMS:** Not sent (see SMS section)

---

## Test Mode Implementation

### Purpose

Test Mode allows safe testing of the booking system without:
- Sending real SMS to phone numbers
- Processing real payments via Stripe
- Polluting production data

### How It Works

#### Master Switch

`shop_config.test_mode_enabled` (boolean) controls the entire system.

#### Booking Flow (`ClientBook.tsx`)

- Loads `test_mode_enabled` from database on mount
- If ON:
  - Shows warning banner on step 5
  - Sets `stripeEnabled = false` (forces pay-in-shop mode)
  - Changes button text to "Confirm Test Booking"
  - Sets `is_test = true` when creating appointment

#### SMS Functions

All three SMS functions check test mode:

**`send-sms` (manual SMS):**
```typescript
const { data: shopConfig } = await supabase
  .from("shop_config")
  .select("test_mode_enabled")
  .single();

if (shopConfig?.test_mode_enabled) {
  console.log(`[SMS TEST MODE] Would send to ${maskedPhone}: "${message}..."`);
  await supabase.from("client_messages").insert({ ...fields, status: "sent_test" });
  return { status: "sent_test" };
}
// Otherwise, actually call Twilio
```

**`send-notification` (automatic confirmations/cancellations):**
- Same check before calling Twilio
- Logs intent, records with `status = 'sent_test'`

**`send-reminders` (scheduled reminders):**
- Loads test mode flag at start of batch
- For each reminder, if test mode ON:
  - Logs: `[Reminders TEST MODE] Would send reminder...`
  - Updates `booking_reminders.status = 'sent_test'`
  - Inserts into `appointment_reminders_sent` (to prevent duplicates)
  - Increments `sentCount`
  - Skips actual notification call

#### TEST Badges

**Owner views** show a yellow "TEST" badge on appointments where `is_test = true`:

- Color: `#fef3c7` background, `#92400e` text, `#fcd34d` border
- Appears next to client name in appointment lists

#### Cleanup Tool

**Owner Settings > Test Mode > Delete Test Bookings:**

```typescript
// Cancel all test appointments
UPDATE appointments SET status='cancelled', cancelled_at=NOW()
WHERE is_test=true AND status!='cancelled';

// Cancel their reminders
UPDATE booking_reminders SET status='cancelled', error_message='Test appointment deleted'
WHERE status='pending' AND appointment_id IN (
  SELECT id FROM appointments WHERE is_test=true
);
```

Soft-deletes (cancels) instead of hard-deleting to preserve referential integrity.

### Test Mode Checklist

- ✅ Loads from `shop_config.test_mode_enabled`
- ✅ Shows warning banner in client booking
- ✅ Forces pay-in-shop (no Stripe)
- ✅ Sets `is_test = true` on appointments
- ✅ Prevents SMS from being sent (all three functions)
- ✅ Records SMS as `sent_test` in logs
- ✅ Shows TEST badges in owner views
- ✅ Cleanup tool cancels only test appointments

---

## SMS Reminder System

### Overview

Automated SMS reminders are sent before appointments to reduce no-shows.

### Components

1. **Database table:** `booking_reminders`
2. **Database trigger:** Auto-creates reminder rows when appointment is booked
3. **Edge Function:** `send-reminders` (cron-triggered)
4. **Helper Edge Functions:** `send-notification`, `send-sms`

### How It Works

#### 1. Appointment Created

When an appointment is inserted:

- If `shop_config.enable_reminders = true`:
  - A database trigger creates rows in `booking_reminders` for:
    - Primary reminder (e.g., 24 hours before)
    - Secondary reminder (if configured, e.g., 2 hours before)
  - `scheduled_for` is calculated: `appointment.scheduled_start - reminder_offset_hours`
  - Initial status: `pending`

#### 2. Cron Trigger (external setup required)

A cron job calls the `send-reminders` Edge Function every hour (or more frequently).

Example cron config (Supabase dashboard or external cron service):
```
0 * * * * # Every hour
```

Calls:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY"
```

#### 3. Send Reminders Function

**Pseudocode:**

```typescript
1. Check if SMS is configured (Twilio keys present)
2. Load shop config (enable_reminders, test_mode_enabled)
3. Query booking_reminders WHERE status='pending' AND scheduled_for <= NOW()
4. For each reminder:
   a. Load appointment, client, barber, service
   b. Validate appointment status (skip if cancelled/completed)
   c. Validate client has phone number
   d. If test_mode_enabled:
      - Log intent
      - Mark as sent_test
      - Skip actual send
   e. Else:
      - Build message (bilingual, templated)
      - Call send-notification function
      - Update status to sent/failed
      - Insert into appointment_reminders_sent (idempotency)
5. Return summary (sent count, skipped count, failed count)
```

#### 4. Idempotency

The `appointment_reminders_sent` table has a unique constraint:

```sql
UNIQUE(appointment_id, reminder_offset_hours)
```

This ensures:
- Even if cron runs twice, reminders won't be duplicated
- If a reminder fails and is retried, it won't resend if already marked sent

### Status Transitions

```
pending -> sent          (successfully sent)
pending -> sent_test     (sent in test mode)
pending -> skipped       (no phone number, SMS disabled)
pending -> cancelled     (appointment cancelled)
pending -> failed        (Twilio error)
```

### Message Templates

Messages are built in `send-notification/index.ts`:

```typescript
function buildMessage(type, details, language) {
  if (type === 'reminder') {
    if (language === 'es') {
      return `${shopName}: Recordatorio - Su cita es mañana ${date} a las ${time} con ${barberName}. ¡Nos vemos pronto!`;
    }
    return `${shopName}: Reminder - Your appointment is tomorrow ${date} at ${time} with ${barberName}. See you soon!`;
  }
  // ... other types: confirmation, cancellation, reschedule
}
```

### Manual SMS (Owner/Barber)

Owners/barbers with `can_send_sms` permission can manually send messages via the "Engage" page.

This calls `send-sms` function directly (not via reminder system).

---

## Image Storage

### Buckets

Three Supabase Storage buckets:

1. **barber-photos:** Profile photos for barbers
2. **service-images:** Service showcase images
3. **product-images:** Product showcase images

### Configuration

- **Max file size:** 100MB per file
- **Allowed MIME types:** `image/*` (all image types)
- **Public access:** Anyone can view, authenticated users can upload

### Upload Flow

Located in: `src/lib/uploadHelper.ts`

**Function:** `uploadImage(file: File, bucket: string, folder?: string)`

**Steps:**

1. Generate unique filename: `${Date.now()}_${file.name}`
2. Optionally prefix with folder: `barbers/${filename}`
3. Call `supabase.storage.from(bucket).upload(path, file)`
4. If successful, get public URL: `supabase.storage.from(bucket).getPublicUrl(path)`
5. Return public URL

**Error handling:**

- File size validation (client-side, 100MB)
- MIME type validation
- Supabase storage errors are caught and returned

### Delete Flow

**Function:** `deleteImage(imageUrl: string)`

**Steps:**

1. Parse URL to extract bucket and file path
2. Call `supabase.storage.from(bucket).remove([path])`
3. Returns success/failure

**Note:** Deleting an image doesn't cascade-delete references. The code updates the database record's `image_url` field separately.

### Display Handling

Components handle missing/broken images gracefully:

```typescript
{imageUrl ? (
  <img src={imageUrl} alt="..." onError={(e) => e.currentTarget.style.display = 'none'} />
) : (
  <div>No image available</div>
)}
```

### Recommended Workflow

1. User uploads image via form
2. `uploadImage()` uploads to Supabase Storage
3. Get back public URL
4. Save URL in database (`services.image_url`, etc.)
5. If user uploads new image, delete old one via `deleteImage()` first
6. Then upload new image and update database

### Storage Limits

Supabase free tier: 1GB storage, 2GB bandwidth/month.

For production, monitor usage and upgrade plan if needed.

---

## Known TODOs & Future Enhancements

### Critical TODOs

None at this time. All core features are implemented and functional.

### Payment Integration (Stripe)

**Current state:** Stub implementation exists but needs completion.

- Edge Functions `create-checkout` and `confirm-payment` are present but untested
- Frontend has Stripe environment variable checks
- Tip presets are configured in `shop_config` but not wired to payment flow

**What's needed:**

1. Add Stripe publishable key to `.env`
2. Test `create-checkout` function (creates Stripe Checkout session)
3. Wire tip presets into checkout (pass as line items)
4. Handle Stripe webhook for payment confirmation
5. Update appointment `payment_status` based on webhook
6. Add refund flow for cancelled appointments (optional)

### Cron for Reminders

**Current state:** `send-reminders` function is implemented and ready.

**What's needed:**

1. Set up external cron job to call the function every hour
2. Options:
   - Supabase Dashboard: Add a cron trigger (if available)
   - External service: use cron-job.org, GitHub Actions, or server cron
3. Endpoint: `POST https://<project>.supabase.co/functions/v1/send-reminders`
4. Auth: Include `Authorization: Bearer <SERVICE_ROLE_KEY>` header

### Future Enhancements

#### 1. Client OTP / Passwordless Login

- Edge function `client-otp` exists but unused
- Would allow clients to log in via SMS code instead of passwords
- Reduces friction for repeat bookings

#### 2. Waitlist Feature

- Allow clients to join a waitlist for fully booked slots
- Notify them when slot becomes available

#### 3. Advanced Reporting

- Revenue by barber, service, date range
- Client retention metrics
- No-show rate tracking

#### 4. Multi-location Support

- Currently assumes one shop
- Could extend to support multiple locations with location-based filtering

#### 5. Email Notifications

- Supplement SMS with email confirmations
- Requires email service (SendGrid, Mailgun, etc.)

#### 6. Gift Cards / Prepaid Credits

- Sell gift cards or credit packages
- Track balance in `clients` table

### Code Quality TODOs

Search for `TODO` comments in the codebase:

```bash
grep -r "TODO" src/ supabase/
```

**Common TODOs found:**

- `ClientBook.tsx:896-898`: Use shop tip settings for online payments (when Stripe is complete)
- Various placeholder messages for future features

None of these are blocking production use.

### Known Limitations

1. **Timezone handling:** Currently assumes shop and clients are in same timezone. For multi-timezone support, would need to store appointment times in UTC and convert for display.

2. **Recurring appointments:** No support for repeating appointments (e.g., "every Tuesday at 10am"). Each booking is one-time only.

3. **Group appointments:** No support for booking multiple services or multiple clients in one transaction.

4. **Inventory depletion:** Products have stock tracking, but no automatic depletion on sale. Owner must manually update stock.

---

## Development Best Practices

### Adding New Features

1. **Plan the data model:** Update database schema via migrations in `/supabase/migrations/`
2. **RLS first:** Always add RLS policies before exposing data to frontend
3. **Type safety:** Use TypeScript types that match your database schema
4. **Error handling:** Wrap Supabase calls in try/catch, show user-friendly errors
5. **Test mode aware:** If feature involves SMS/payments, respect `test_mode_enabled`

### Debugging

- **Supabase logs:** Check Edge Function logs in Supabase Dashboard > Edge Functions > Logs
- **Browser console:** React component logs (wrapped in `if (import.meta.env.DEV)`)
- **Database queries:** Use Supabase SQL Editor to test queries
- **RLS issues:** Temporarily disable RLS on a table to verify policy is the problem (re-enable immediately!)

### Deployment

1. **Build locally:** Run `npm run build` to catch TypeScript errors
2. **Test thoroughly:** Use Test Mode to validate booking flow
3. **Push database changes:** Apply migrations to production database
4. **Deploy Edge Functions:** Redeploy updated functions via Supabase Dashboard
5. **Update environment variables:** Ensure production env vars are set (especially Twilio/Stripe keys)
6. **Monitor:** Check Supabase logs for errors after deployment

### Security Reminders

- **Never commit secrets:** Use `.env` for local, Supabase Dashboard for production
- **RLS is mandatory:** Every table must have RLS policies
- **Validate inputs:** Even with RLS, validate data on both client and server
- **Service role key:** Only use in Edge Functions, never expose to frontend
- **Inactive barbers:** Always filter `active=true` in public queries

---

**End of Developer Handbook**
