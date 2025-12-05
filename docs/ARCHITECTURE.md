# Lupe's Barber Shop - System Architecture

**Last Updated:** December 4, 2025
**Version:** Phase 4K + Tonight's Sprint
**Status:** Active Development

---

## Technology Stack

### Frontend
- **Framework:** React 18.2 with TypeScript
- **Build Tool:** Vite 5.0
- **Routing:** React Router DOM 6.21
- **State Management:** React Context API (AuthContext, LanguageContext)
- **Styling:** Inline React styles (no CSS framework)
- **PWA:** vite-plugin-pwa 0.17.4
- **Language Support:** English (en) / Spanish (es)

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **Storage:** Supabase Storage for images/uploads
- **Real-time:** Supabase Realtime subscriptions (available)
- **API:** Supabase Client SDK (@supabase/supabase-js 2.39)

### Deployment
- **Hosting:** TBD (Vercel/Netlify recommended)
- **Domain:** lupesbarbershop.com (to be connected)
- **SSL:** Auto-provisioned
- **PWA Manifest:** /public/icon-*.png for iOS/Android

---

## Data Models

### 1. Users (Barbers & Owners)
**Table:** `users`

Core fields for authentication and role-based access control.

```typescript
interface User {
  id: string;                           // UUID, primary key
  name: string;                         // Full name
  phone: string | null;                 // Phone number
  email: string;                        // Email (unique, login)
  role: 'OWNER' | 'BARBER';            // User role
  language: 'en' | 'es';               // Preferred language
  active: boolean;                      // Can log in

  // Permissions (BARBER role)
  can_view_shop_reports: boolean;
  can_view_own_stats: boolean;
  can_manage_services: boolean;
  can_manage_products: boolean;
  can_manage_barbers: boolean;
  can_manage_schedules: boolean;
  can_manage_appointments: boolean;
  can_manage_clients: boolean;
  can_send_sms: boolean;                // SMS Engage permission

  created_at: Date;
  updated_at: Date;
}
```

### 2. Clients
**Table:** `clients`

Customer records with acquisition and retention tracking.

```typescript
interface Client {
  id: string;                           // UUID, primary key
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  language: 'en' | 'es';
  notes: string;                        // General notes
  photo_url: string | null;             // Profile photo
  birthday: Date | null;                // Birthday for marketing

  // Acquisition & Retention (Tonight's Sprint)
  acquisition_channel: AcquisitionChannel | null;
  first_visit_at: Date | null;         // First completed appointment
  last_visit_at: Date | null;          // Most recent completed appointment
  visits_count: number;                 // Total completed appointments
  only_prepay_allowed: boolean;         // Requires prepayment

  // Soft delete
  is_deleted: boolean;

  created_at: Date;
  updated_at: Date;
}

type AcquisitionChannel =
  | 'BARBER_LINK'      // Booked via barber's personal link
  | 'GOOGLE_ONLINE'    // Google Business / online booking
  | 'WALK_IN'          // Walked in without appointment
  | 'REFERRAL'         // Referred by another client
  | 'SOCIAL_MEDIA'     // Instagram, Facebook, etc.
  | 'OTHER';           // Other source
```

**Client Classification (computed):**
- **Regular:** visits_count >= regular_client_min_visits
- **Lapsed:** Days since last_visit_at > lapsed_client_days
- **Prospective:** visits_count === 0 (never completed)

### 3. Services
**Table:** `services`

Haircut and grooming services offered.

```typescript
interface Service {
  id: string;                           // UUID, primary key
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  base_price: number;                   // Base service price
  duration_minutes: number;             // Default duration
  image_url: string | null;             // Service image
  category: string | null;              // Service category
  active: boolean;                      // Available for booking

  // Online booking (Tonight's Sprint)
  visible_online: boolean;              // Show on public site
  prepay_required: boolean;             // Requires prepayment

  // Card processing fees
  card_fee_percent: number;             // % fee (e.g., 4% = 0.04)
  card_fee_amount: number;              // Fixed fee amount
}
```

### 4. Products
**Table:** `products`

Retail products sold during appointments.

```typescript
interface Product {
  id: string;                           // UUID, primary key
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  price: number;                        // Default retail price
  image_url: string | null;
  active: boolean;

  // Inventory Management (Tonight's Sprint)
  sku: string | null;                   // Stock keeping unit
  brand: string | null;
  vendor: string | null;
  category: string | null;
  retail_price: number;                 // In-shop price
  supply_cost: number;                  // Purchase/cost price
  ecommerce_price: number;              // Online store price
  current_stock: number;                // Current inventory count
  low_stock_threshold: number;          // Alert when below this
  high_stock_threshold: number;         // Max recommended stock
  add_to_register: boolean;             // Show in POS
  visible_online: boolean;              // Show on e-commerce site

  // Card processing fees
  card_fee_percent: number;
  card_fee_amount: number;

  created_at: Date;
  updated_at: Date;
}
```

### 5. Inventory Transactions
**Table:** `inventory_transactions`

Audit log for all inventory movements.

```typescript
interface InventoryTransaction {
  id: string;                           // UUID, primary key
  product_id: string;                   // FK -> products.id
  type: InventoryTransactionType;
  quantity_change: number;              // +/- amount (negative for sales)
  stock_after: number;                  // Stock level after transaction
  reason: string | null;                // Brief reason
  notes: string | null;                 // Detailed notes
  created_by_user_id: string | null;    // FK -> users.id
  appointment_id: string | null;        // FK -> appointments.id (if SALE)
  created_at: Date;
}

type InventoryTransactionType =
  | 'SALE'          // Sold during appointment
  | 'PURCHASE'      // Purchased from vendor
  | 'ADJUSTMENT'    // Manual stock adjustment
  | 'RETURN'        // Client return
  | 'DAMAGE'        // Damaged/broken
  | 'THEFT';        // Theft/loss
```

### 6. Appointments
**Table:** `appointments`

Core booking and payment records.

```typescript
interface Appointment {
  id: string;                           // UUID, primary key
  client_id: string;                    // FK -> clients.id
  barber_id: string | null;             // FK -> users.id (nullable for "any barber")
  service_id: string;                   // FK -> services.id
  scheduled_start: Date;
  scheduled_end: Date;
  status: AppointmentStatus;
  channel: BookingChannel;

  // Payment totals
  services_total: number;               // Service subtotal
  products_total: number;               // Products subtotal
  tax_amount: number;                   // Sales tax
  tip_amount: number;                   // Tip for barber
  card_fee_amount: number;              // Card processing fee
  processing_fee_rate: number | null;   // % rate applied
  processing_fee_amount: number;        // Calculated fee
  total_charged: number;                // Grand total paid
  net_revenue: number;                  // Revenue after fees
  payment_method: string | null;        // 'cash', 'card', 'gift_card'
  paid_at: Date | null;

  // Service Commissions (Tonight's Sprint)
  service_commission_percent: number;   // Barber commission %
  service_commission_amount: number;    // Commission $ for service
  service_due_to_barber: number;        // Amount to barber
  service_due_to_shop: number;          // Amount to shop

  // Review
  rating: number | null;                // 1-5 stars
  review_comment: string | null;

  // Timestamps
  actual_duration_minutes: number | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

type AppointmentStatus =
  | 'booked'
  | 'completed'
  | 'no_show'
  | 'cancelled';

type BookingChannel =
  | 'online_pwa'        // Client booked via PWA
  | 'internal_manual'   // Staff booked internally
  | 'voice_agent';      // AI voice agent (future)
```

### 7. Appointment Products (Line Items)
**Table:** `appointment_products`

Products sold during an appointment.

```typescript
interface AppointmentProduct {
  id: string;                           // UUID, primary key
  appointment_id: string;               // FK -> appointments.id
  product_id: string;                   // FK -> products.id
  quantity: number;                     // Quantity sold
  unit_price: number;                   // Price per unit at time of sale

  // Product Commissions (Tonight's Sprint)
  commission_percent: number;           // Barber commission %
  commission_amount: number;            // Commission $ for this line
  due_to_barber: number;                // Amount to barber
  due_to_shop: number;                  // Amount to shop

  created_at: Date;
}
```

### 8. Shop Configuration
**Table:** `shop_config`

Single-row global settings for the shop.

```typescript
interface ShopConfig {
  id: string;                           // UUID, primary key (singleton)
  shop_name: string;
  address: string | null;
  phone: string | null;
  shop_hours: ShopHours;                // JSONB: day-of-week schedule
  tax_rate: number;                     // Sales tax % (e.g., 0.08 = 8%)
  card_processing_fee_rate: number;     // Default card fee % (e.g., 0.04 = 4%)

  // Booking Rules (Tonight's Sprint)
  allow_booking_without_payment: boolean;
  allow_multiple_services: boolean;
  allow_any_barber: boolean;            // Allow "any available barber"
  client_booking_interval_minutes: number;
  barber_booking_interval_minutes: number;
  days_bookable_in_advance: number;
  min_book_ahead_hours: number;
  min_cancel_ahead_hours: number;
  allow_group_appointments: boolean;
  require_21_plus: boolean;
  gross_up_card_fees: boolean;          // Add fee to total vs absorb

  // Tip Configuration (Tonight's Sprint)
  tip_percent_options: number[];        // e.g., [15, 18, 20, 25]
  tip_flat_options: number[];           // e.g., [5, 10, 15, 20]
  show_tip_in_booking: boolean;
  show_tip_in_confirmation: boolean;
  include_tax_in_tip_calc: boolean;

  // Commission Configuration (Tonight's Sprint)
  commission_config: CommissionConfig;  // JSONB tiers

  // Retention Thresholds
  regular_client_min_visits: number;    // e.g., 3 visits
  lapsed_client_days: number;           // e.g., 90 days

  created_at: Date;
  updated_at: Date;
}

interface ShopHours {
  [dayOfWeek: number]: { open: string; close: string } | null;
  // Example: { 1: { open: "10:00", close: "19:00" }, 0: null }
}

interface CommissionConfig {
  service_tiers: CommissionTier[];
  product_tiers: CommissionTier[];
  cumulative: boolean;                  // True = progressive, False = flat
}

interface CommissionTier {
  min: number;                          // Min monthly sales
  max: number | null;                   // Max monthly sales (null = infinite)
  percent: number;                      // Commission %
}
```

### 9. Barber Schedules
**Table:** `barber_schedules`

Weekly recurring schedules per barber.

```typescript
interface BarberSchedule {
  id: string;                           // UUID, primary key
  barber_id: string;                    // FK -> users.id
  day_of_week: number;                  // 0=Sunday, 6=Saturday
  start_time: string;                   // HH:MM format
  end_time: string;                     // HH:MM format
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### 10. Barber Time Off
**Table:** `barber_time_off`

One-time exceptions (vacation, sick days).

```typescript
interface BarberTimeOff {
  id: string;                           // UUID, primary key
  barber_id: string;                    // FK -> users.id
  date: Date;                           // Date of time off
  start_time: string | null;            // If partial day
  end_time: string | null;              // If partial day
  reason: string | null;
  created_at: Date;
  updated_at: Date;
}
```

### 11. Barber Services (Assignment)
**Table:** `barber_services`

Junction table: which barbers can perform which services.

```typescript
interface BarberService {
  id: string;                           // UUID, primary key
  barber_id: string;                    // FK -> users.id
  service_id: string;                   // FK -> services.id
  created_at: Date;
}
```

### 12. Client Notes
**Table:** `client_notes`

Timeline notes for each client.

```typescript
interface ClientNote {
  id: string;                           // UUID, primary key
  client_id: string;                    // FK -> clients.id
  note: string;
  created_by_user_id: string;           // FK -> users.id
  created_at: Date;
}
```

### 13. Transformation Photos
**Table:** `transformation_photos`

Before/after photos for portfolio.

```typescript
interface TransformationPhoto {
  id: string;                           // UUID, primary key
  appointment_id: string;               // FK -> appointments.id
  barber_id: string;                    // FK -> users.id
  client_id: string;                    // FK -> clients.id
  image_url: string;                    // Supabase Storage URL
  type: 'before' | 'after' | 'single';
  notes: string | null;
  created_at: Date;
}
```

---

## Application Structure

### Routing (src/App.tsx)

```
/login                  → Login (unauthenticated only)
/book                   → Public booking flow

OWNER Routes:
/owner/today            → Today's appointments dashboard
/owner/appointments     → All appointments (search/filter)
/owner/clients          → Client management
/owner/barbers          → Barber management
/owner/services         → Service catalog
/owner/products         → Product inventory
/owner/reports          → Analytics & payouts
/owner/settings         → Shop configuration

BARBER Routes:
/barber/today           → Barber's daily schedule
/barber/stats           → Personal statistics (if can_view_own_stats)

Detail Pages:
/appointments/:id       → Appointment detail & payment
/clients/:id            → Client profile & history
```

### State Management

**AuthContext** (`src/contexts/AuthContext.tsx`)
- Current user session
- User data (name, role, permissions)
- Sign in / sign out methods

**LanguageContext** (`src/contexts/LanguageContext.tsx`)
- Current language ('en' | 'es')
- Translation function `t(key)`
- Language switcher

### Key Components

**Header** (`src/components/Header.tsx`)
- Role-based navigation
- Language toggle
- Logout button
- Responsive hamburger menu (<1024px)

**Modals:**
- `NewAppointmentModal` - Book appointments
- `EditAppointmentModal` - Modify appointments
- `PaymentModal` - Process payments with commissions
- `NewClientModal` - Add clients
- `EditClientModal` - Update clients
- `ServiceModal` - CRUD services
- `NewBarberModal` - Add barbers
- `BarberScheduleModal` - Edit weekly schedule
- `BarberTimeOffModal` - Manage time off
- `BarberPermissionsModal` - Set permissions
- `ConfirmDeleteModal` - Confirm deletions

---

## Business Logic

### Commission Calculation (Tonight's Sprint)

**Service Commission:**
1. Get barber's total monthly sales for services
2. Find matching tier in `commission_config.service_tiers`
3. Calculate `commission_percent` based on tier
4. `commission_amount = services_total * (commission_percent / 100)`
5. `due_to_barber = commission_amount`
6. `due_to_shop = services_total - commission_amount`

**Product Commission:**
1. Same logic using `commission_config.product_tiers`
2. Applied per line item in `appointment_products`
3. Sum all line items for totals

**Cumulative vs Flat:**
- Flat: Apply single tier % to entire amount
- Cumulative (TODO Phase 7): Apply progressive tiers

### Inventory Management (Tonight's Sprint)

**On Product Sale:**
1. Create `appointment_product` record
2. Create `inventory_transaction` with type='SALE'
3. Decrement `products.current_stock`
4. Set `stock_after` in transaction

**Manual Adjustment:**
1. Admin enters quantity change (+/-)
2. Create `inventory_transaction` with type='ADJUSTMENT'
3. Update `products.current_stock`
4. Log reason and notes

**Low Stock Alert:**
- Query: `SELECT * FROM products WHERE current_stock < low_stock_threshold`
- Display warning badge in Products list

### Client Retention Tracking (Tonight's Sprint)

**On Appointment Completion:**
```typescript
if (status === 'completed') {
  if (client.visits_count === 0) {
    client.first_visit_at = appointment.completed_at;
    client.acquisition_channel = appointment.channel;
  }
  client.last_visit_at = appointment.completed_at;
  client.visits_count += 1;
}
```

**Client Classification:**
```typescript
function getClientClassification(client: Client, config: ShopConfig) {
  if (client.visits_count === 0) return 'Prospective';
  if (client.visits_count >= config.regular_client_min_visits) {
    const daysSinceLastVisit = daysBetween(client.last_visit_at, now());
    if (daysSinceLastVisit > config.lapsed_client_days) return 'Lapsed';
    return 'Regular';
  }
  return 'Prospective';
}
```

### Booking Rules Enforcement (Tonight's Sprint)

**Before Creating Appointment:**
1. Check `allow_booking_without_payment` → require prepay or allow later
2. Check `allow_multiple_services` → allow/block multi-service bookings
3. Check `allow_any_barber` → show "any barber" option
4. Check `min_book_ahead_hours` → must book X hours in advance
5. Check `days_bookable_in_advance` → can't book beyond X days
6. Check `min_cancel_ahead_hours` → can't cancel within X hours

**Validation:**
```typescript
function validateBooking(appointment, config) {
  const now = new Date();
  const hoursAhead = (appointment.scheduled_start - now) / (1000 * 60 * 60);

  if (hoursAhead < config.min_book_ahead_hours) {
    throw new Error(`Must book at least ${config.min_book_ahead_hours} hours in advance`);
  }

  const daysAhead = hoursAhead / 24;
  if (daysAhead > config.days_bookable_in_advance) {
    throw new Error(`Cannot book more than ${config.days_bookable_in_advance} days in advance`);
  }

  // Additional validations...
}
```

---

## Security (RLS Policies)

All tables use Row Level Security (RLS).

**General Pattern:**
- Authenticated users can read most data
- OWNER can insert/update/delete everything
- BARBER can update their own appointments and view their stats
- Public (unauthenticated) can only read active services (for booking flow)

**Critical Policies:**
- `users`: OWNER can update any user (including barber active status)
- `appointments`: Barber can update own appointments, OWNER can update all
- `clients`: All authenticated users can CRUD (shop staff needs access)
- `inventory_transactions`: Authenticated can insert (logged transactions)

---

## Deployment Checklist

### Phase 13 (QA)
- [ ] End-to-end booking flow test
- [ ] Payment processing with commissions verified
- [ ] Inventory transactions audit log working
- [ ] Client acquisition tracking functional
- [ ] All booking rules enforced
- [ ] SMS permissions toggled correctly
- [ ] Demo data generator script
- [ ] Production build passing

### Phase 14 (Go-Live)
- [ ] Real services/products/barbers entered
- [ ] Live Stripe keys connected
- [ ] SMS provider (Twilio) credentials added
- [ ] Domain lupesbarbershop.com DNS configured
- [ ] SSL certificate active
- [ ] Google Business integration
- [ ] Staff training completed
- [ ] Backup/restore procedure documented
- [ ] Support contact established

---

## Messaging / SMS Integration

### Overview

The application includes a secure, plug-and-play Twilio SMS integration that allows owners and authorized staff to send SMS messages to clients. The system is designed to degrade gracefully when SMS is not configured, ensuring the application remains functional at all times.

### Architecture

**Server-Side Implementation:**
- **Edge Function:** `supabase/functions/send-sms/index.ts`
- **Path:** `/functions/v1/send-sms`
- **Method:** POST
- **Authentication:** Requires valid JWT token (verified)

**Database:**
- **Table:** `client_messages` - Logs all SMS attempts with status tracking
- **Schema:**
  - `id` (uuid) - Primary key
  - `client_id` (uuid) - References clients table
  - `phone_number` (text) - Recipient phone number
  - `message` (text) - Message content
  - `channel` (text) - Communication channel ('sms', 'email', etc.)
  - `source` (text) - Origin of message (e.g., 'engage_manual')
  - `twilio_sid` (text, nullable) - Twilio message SID when available
  - `status` (text) - Delivery status ('sent', 'disabled', 'error')
  - `error_message` (text, nullable) - Error details if status is error
  - `sent_by_user_id` (uuid) - User who sent the message
  - `created_at` (timestamptz) - Timestamp

### Environment Variables

**Required Configuration (Server-Side Only):**
```
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+15551234567
SMS_ENABLED=true
```

**Important Notes:**
- These are server-side environment variables set in Supabase Edge Functions configuration
- Never exposed to the client/browser
- SMS functionality is disabled if any required variable is missing or SMS_ENABLED ≠ "true"
- The application continues to work normally when SMS is not configured

### Edge Function Behavior

**Request Body:**
```typescript
{
  clientId: string,
  phoneNumber: string,
  message: string,
  source: string  // e.g., 'engage_manual'
}
```

**Response Types:**

1. **Success (status: 'sent'):**
   ```json
   { "status": "sent", "sid": "SM..." }
   ```
   - SMS sent successfully via Twilio
   - Message logged in `client_messages` with Twilio SID

2. **Not Configured (status: 'disabled'):**
   ```json
   { "status": "disabled" }
   ```
   - One or more env vars missing or SMS_ENABLED ≠ "true"
   - Server logs: `[SMS] Disabled: missing configuration`
   - Message not sent, not logged

3. **Error (status: 'error'):**
   ```json
   { "status": "error", "message": "..." }
   ```
   - Twilio API error or other failure
   - Message logged with error status

**Security Features:**
- Checks `can_send_sms` permission from users table
- Returns 403 if user lacks permission
- Validates phone number and message presence
- Masks phone numbers in server logs (e.g., "+1555...")

**Twilio API Integration:**
- Uses Basic Authentication with Account SID and Auth Token
- Sends POST to `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
- Content-Type: `application/x-www-form-urlencoded`

### Client-Side Implementation

**Location:** `src/pages/OwnerEngage.tsx`

**Permission Check:**
- Reads `userData.can_send_sms` from authenticated user
- Disables form and shows warning if permission denied

**API Call Pattern:**
```typescript
const apiUrl = `${VITE_SUPABASE_URL}/functions/v1/send-sms`;
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    clientId, phoneNumber, message, source: 'engage_manual'
  })
});
```

**User Feedback (Toast Notifications):**
- **Success:** Green toast - "SMS sent successfully to {Client Name}!"
- **Disabled:** Blue info toast - "SMS sending is not configured yet. Please ask the owner to connect Twilio."
- **Error:** Red error toast - "There was a problem sending this SMS. Please try again."
- **Network Error:** Red error toast - "Network error. Please check your connection and try again."

**Validation:**
- Client must be selected
- Phone number must be present
- Message must be 1-160 characters

### Current Capabilities

**Manual SMS from Engage Page:**
- Owner role can access `/owner/engage`
- Search and select client from dropdown
- Compose message (max 160 characters)
- Real-time character count
- Permission-based access control
- Full audit trail in `client_messages` table

### Current Limitations

1. **Manual Only:** SMS can only be sent manually from Engage page
2. **No Automation:** No appointment reminders or confirmations yet
3. **No Bulk Messaging:** One message at a time
4. **No Templates:** Each message must be typed manually
5. **No Scheduling:** Messages sent immediately, no delayed sending

### Future Enhancements

**Phase 1: Automated Notifications**
- Appointment confirmation SMS when booked
- Reminder SMS 24 hours before appointment
- Post-appointment thank you messages
- Uses booking rules & retention settings for timing

**Phase 2: Campaign Management**
- Bulk SMS to client segments (regular, lapsed, new)
- Message templates library
- Scheduled campaigns
- Response tracking

**Phase 3: Two-Way Messaging**
- Receive SMS replies from clients
- Conversation threads
- Client-initiated appointment requests
- Opt-out management

**Phase 4: Advanced Features**
- A/B testing for message content
- Delivery analytics and reporting
- Cost tracking per message
- Integration with marketing automation

### Configuration Guide

**For Developers/Shop Owners:**

1. **Get Twilio Credentials:**
   - Sign up at https://www.twilio.com
   - Get Account SID and Auth Token from console
   - Purchase a phone number or messaging service

2. **Set Environment Variables:**
   - In Supabase dashboard, go to Edge Functions settings
   - Add the four environment variables listed above
   - Set `SMS_ENABLED=true` when ready to go live

3. **Grant Permissions:**
   - Update user's `can_send_sms` field to `true` in users table
   - Currently only owners have this permission by default

4. **Test:**
   - Navigate to `/owner/engage`
   - Select a test client with valid phone number
   - Send test message
   - Check `client_messages` table for logged entry

**No Configuration Needed for Development:**
- Application works without SMS configured
- Shows "disabled" status instead of errors
- All other features remain functional

---

## Future Enhancements (Roadmap)

### Phase 6: Client-Facing Website
- Hero banner + "Book Now" CTA
- Barber profiles with ratings
- Services list page
- Reviews section
- Contact + map

### Phase 7: Advanced Payments
- Gift card support
- Cumulative commission tiers
- Stripe live mode
- Tax configuration per locale

### Phase 8: SMS Infrastructure
- Automated SMS templates
- Reminder messages (24h, 2h before)
- Review request after completion
- Manual SMS from Engage module

### Phase 9: Reviews System
- Collect reviews per barber
- Display on barber profiles
- Feed into analytics/leaderboards

### Phase 10: Advanced Analytics
- Leaderboard: Top barbers/services/products
- Retention reports
- Acquisition channel breakdown
- Payouts CSV export
- Inventory valuation reports

### Phase 11: PWA Polish
- Offline mode
- Add-to-Home-Screen prompts
- Push notifications

---

## Local Development

### Prerequisites
```bash
Node.js 18+
npm 9+
Supabase account
```

### Setup
```bash
# Install dependencies
npm install

# Copy .env.example to .env and fill in Supabase credentials
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Support & Maintenance

**Technical Lead:** TBD
**Database Admin:** Owner access to Supabase dashboard
**Deployment Pipeline:** Auto-deploy from main branch
**Monitoring:** Supabase logs + dashboard
**Backups:** Supabase automated daily backups

---

## Sprint Implementation Status (December 5, 2025)

### Implemented Features (MVP)

#### 1. Commissions & Payouts Logic
**Status:** ✅ Implemented (Flat 50% rate)

**Implementation:**
- Commission calculation in `PaymentModal.tsx` when payment is recorded
- Flat 50% commission rate applied to services revenue
- Fields populated: `service_commission_percent`, `service_commission_amount`, `service_due_to_barber`, `service_due_to_shop`
- **Page:** `/owner/payouts` - Shows barber-level commission breakdown by date range
- **TODO:** Tiered commission rates (Phase 7), product commissions, configurable rates in Settings

**Current Logic:**
```typescript
const commissionPercent = 50;  // Temporary flat rate
const serviceCommissionAmount = servicesTotal * (commissionPercent / 100);
const serviceDueToBarber = serviceCommissionAmount;
const serviceDueToShop = servicesTotal - serviceCommissionAmount;
```

#### 2. Client Acquisition & Retention Tracking
**Status:** ✅ Implemented (Auto-tracking on completion)

**Implementation:**
- When appointment is marked completed (via `PaymentModal`):
  - First visit: Sets `first_visit_at`, sets `acquisition_channel` based on booking channel
  - All visits: Updates `last_visit_at`, increments `visits_count`
- Acquisition channels mapped: `online_pwa` → `GOOGLE_ONLINE`, `internal_manual` → `WALK_IN`
- **Page:** `/owner/clients-report` - Shows acquisition stats and retention metrics
- Classification rules:
  - **Regular:** ≥2 visits (hardcoded threshold)
  - **Lapsed:** >90 days since last visit (hardcoded threshold)
  - **Prospective:** 0 visits
- **TODO:** Make thresholds configurable in Settings, refine classification logic

#### 3. SMS Engage (Manual Send - Console Logger)
**Status:** ✅ Implemented (Test/Console mode)

**Implementation:**
- **Page:** `/owner/engage` - Manual SMS composer for owners
- Select client, type message (160 char limit), send test SMS
- Currently logs to console instead of sending real SMS
- **TODO:** Wire to Twilio or SMS provider at go-live
- **TODO:** Check `can_send_sms` permission when TypeScript types are regenerated

#### 4. Barber SMS Permissions
**Status:** ✅ Implemented (UI complete)

**Implementation:**
- `BarberPermissionsModal` includes "Can send SMS messages (Engage)" checkbox
- Saves `can_send_sms` to database
- Will control access to Engage module when permission check is enabled

#### 5. Inventory Management
**Status:** ⏳ Pending (Database ready, UI TODO)

**Database:**
- `products` table extended with inventory fields
- `inventory_transactions` table created
- **TODO:** Build manual adjustment UI, create SALE transactions on product sale, low-stock alerts

#### 6. Booking Rules Enforcement
**Status:** ⏳ Pending (Configuration stored, validation TODO)

**Database:**
- `shop_config` table has all booking rule fields
- **TODO:** Enforce rules in `Book.tsx` and `NewAppointmentModal.tsx`:
  - Validate `min_book_ahead_hours` and `days_bookable_in_advance`
  - Validate `min_cancel_ahead_hours` on cancellation
  - Check `allow_booking_without_payment` flag
  - Build Settings UI to configure all rules

### New Pages Added

1. **`/owner/payouts`** - Commission breakdown by barber (date range filter)
2. **`/owner/clients-report`** - Acquisition channels + retention metrics
3. **`/owner/engage`** - Manual SMS composer (console logger for now)

### Assumptions & Temporary Constants

1. **Commission Rate:** Flat 50% for all barbers (should be configurable per barber, tiered based on monthly sales)
2. **Retention Thresholds:** Regular = 2+ visits, Lapsed = 90+ days (should be in `shop_config`)
3. **SMS Provider:** Console logging only (needs Twilio integration)
4. **Acquisition Channels:** Limited mapping (`online_pwa`, `internal_manual`) - expand as needed
5. **Product Commissions:** Not calculated yet (Phase 7)
6. **Inventory Transactions:** Not created automatically yet (Phase 7)

### Database Schema Changes Applied

- **Migration:** `add_commissions_inventory_acquisition_retention.sql`
- See "Tonight's Sprint - Implementation Complete" document for full schema details

---

## Sprint: Inventory Management, Booking Rules & Settings (December 5, 2025)

This sprint focused on three major areas: wiring up inventory management with automatic SALE transactions, enforcing booking rules via shop configuration, and building a Settings hub for shop owners to configure these rules.

### Part 1: Inventory Management (MVP UI + Logic)

#### 1.1 Inventory Management Page (`/owner/inventory`)

**Location:** `src/pages/OwnerInventory.tsx`

Displays all products with comprehensive stock information:
- Product name, SKU, category, brand
- Retail price, supply cost
- Current stock, low/high thresholds
- Status badge (OUT, LOW, OK)

**Status Determination:**

Status logic is centralized in a shared helper function (`src/lib/inventoryStatus.ts`) to ensure consistency across all inventory pages:

```typescript
- current_stock <= 0 → OUT (red badge, red row background)
- current_stock <= low_stock_threshold → LOW (yellow badge, yellow row background)
- current_stock >= high_stock_threshold → HIGH (blue badge, white row background)
- otherwise → OK (green badge, white row background)
```

**Helper Function:** `getInventoryStatus(currentStock, lowThreshold, highThreshold)`
- Returns status type: 'OUT' | 'LOW' | 'HIGH' | 'OK'
- Returns bilingual labels (EN/ES)
- Returns colors (background and text)
- Handles null thresholds with defaults (low: 5, high: 50)

**Visual Highlighting:**
- Rows with OUT status: `#fff5f5` background
- Rows with LOW status: `#fffef0` background
- Rows with HIGH/OK status: white background

**Bilingual Labels:**
- OUT: "OUT OF STOCK" / "AGOTADO"
- LOW: "LOW STOCK" / "STOCK BAJO"
- HIGH: "HIGH STOCK" / "STOCK ALTO"
- OK: "IN STOCK" / "EN STOCK"

#### 1.2 Adjust Inventory Modal

**Trigger:** "Adjust" button on each product row

**Modal Fields:**
- Product name (read-only)
- Current quantity (read-only)
- New quantity (number input, required, auto-focused)
- Reason (textarea, optional)

**UX Improvements:**
- New Quantity field starts empty (not prepopulated)
- Cursor automatically focuses into New Quantity field on modal open
- Allows full clear and re-entry of values
- Placeholder text: "Enter quantity" / "Ingrese cantidad"

**Validation:**
- Value must be a whole number integer >= 0
- Empty or invalid input shows friendly error in both EN/ES
- No save if validation fails
- Error: "Quantity must be a whole number greater than or equal to 0."
- Error (ES): "La cantidad debe ser un número entero mayor o igual a 0."

**Backend Logic:**
1. Calculate delta = new_quantity - old_quantity
2. Create `inventory_transactions` record:
   - `type`: 'ADJUSTMENT'
   - `quantity_change`: delta
   - `stock_after`: new_quantity
   - `reason`: user input or "Manual adjustment" / "Ajuste manual"
   - `created_by_user_id`: current user
3. Update `products.current_stock` to new_quantity
4. Close modal immediately
5. Show success toast: "Inventory updated successfully!" / "Inventario actualizado exitosamente!"
6. Refresh product list to show new stock level

#### 1.3 SALE Transactions on Product Sale

**Location:** `src/components/PaymentModal.tsx` (lines 102-172)

**Trigger:** When appointment is marked as completed/paid

**Logic:**
1. Check if `appointments.inventory_processed` is false (idempotency check)
2. Fetch all `appointment_products` for the appointment
3. For each product:
   - Fetch current `current_stock`
   - Calculate `newStock = current_stock - quantity`
   - Create `inventory_transactions` record:
     - `type`: 'SALE'
     - `quantity_change`: -quantity (negative)
     - `stock_after`: newStock
     - `appointment_id`: appointment ID
     - `created_by_user_id`: current user
   - Update `products.current_stock` to newStock
4. Set `appointments.inventory_processed = true`

**Idempotency:**
- New field `inventory_processed` (boolean, default false) added to `appointments` table
- SALE transactions only created if `inventory_processed` is false
- Prevents double-decrement if payment is processed twice

**Migration:** `add_inventory_processed_flag.sql`

#### 1.4 Inventory Reports (Beta) Page (`/owner/inventory-reports`)

**Location:** `src/pages/OwnerInventoryReports.tsx`

**Section 1: Valuation Summary**

Three cards showing:
1. **Total Retail Value:** Σ(current_stock × retail_price)
2. **Total Cost Value:** Σ(current_stock × supply_cost)
3. **Potential Gross Margin:** retail_value - cost_value

**Section 2: Current Stock Snapshot**

Read-only table showing:
- Product name, SKU
- Current stock
- Status badge
- Retail value (stock × price)
- Cost value (stock × cost)

**Future Enhancements (TODOs):**
- CSV export for stock data
- Shrinkage tracking report
- Product performance analytics

**Bilingual Support (EN/ES):**
- All inventory pages fully support English and Spanish
- Status badges show translated labels based on user's language preference
- All form labels, buttons, error messages, and toasts are bilingual
- Product names stored in both `name_en` and `name_es` fields
- UI automatically switches language based on `userData.language` setting

#### 1.5 Products Management & Pricing Model

**Location:** `src/pages/OwnerProducts.tsx`

**Pricing Model (Unified as of Version 38):**

The product pricing has been simplified to use retail price as the canonical selling price:

- **`retail_price`**: What clients pay (displayed in inventory, used for checkout)
- **`supply_cost`**: The shop's cost to acquire the product
- **`price`**: Legacy field kept in sync with `retail_price` for backwards compatibility

**Data Mapping:**
- On product edit load: If `retail_price` is null but `price` has a value, `retail_price` is pre-filled from `price`
- On save: Both `price` and `retail_price` are set to the same value (the retail price input)
- All inventory calculations use `retail_price` and `supply_cost`

**Required Fields for Public Website:**

To ensure products are ready for client-facing display, the following fields are required:

- **Name (English)** * - Primary product name
- **Name (Spanish)** * - Localized product name
- **Description (English)** * - Product details
- **Description (Spanish)** * - Localized details
- **Category** * - Product classification (e.g., "Hair Care", "Styling Products")
- **Brand** * - Manufacturer or brand name
- **Retail Price** * - Selling price

**Optional Fields:**
- **SKU** - Product code (useful for inventory tracking but not required for public display)
- **Image URL** - Product image (see Image Handling section below)

**Validation:**
- All required fields are enforced on save with clear bilingual error messages
- Numeric values (prices, stock, thresholds) must be ≥ 0
- Empty stock defaults to 0 on save

**Image Handling:**

Currently, products are displayed as text-only in appointment management and inventory pages. Product images are stored but not rendered in the UI yet.

**When Product Cards are Implemented (Future):**
- If `image_url` is present → Display the product image
- If `image_url` is missing → Show a clean fallback:
  - Solid neutral background with product name + brand, OR
  - Neutral placeholder icon with text
  - No broken image icons

**Current Product Display Locations:**
- Appointment Detail page: Products shown in select dropdown and table (text only)
- Inventory Management: Products in table with stock info (text only)
- Inventory Reports: Products in valuation table (text only)

**Future Product Card Display:**
- Client-facing product catalog (Phase 6: Client Website)
- Product recommendations during booking flow
- Post-service product suggestions

### Part 2: Booking Rules Enforcement

#### 2.1 Booking Validation Helper

**Location:** `src/lib/bookingRules.ts`

**Functions:**

1. **`getShopConfig()`**
   - Fetches booking rule configuration from `shop_config` table
   - Returns: `days_bookable_in_advance`, `min_book_ahead_hours`, `min_cancel_ahead_hours`, `client_booking_interval_minutes`

2. **`validateBookingRules(startTime: Date, action: 'create' | 'cancel' | 'reschedule')`**
   - Validates appointment time against configured rules
   - Returns `BookingValidationError` or `null`

**Validation Rules:**

**For Create/Reschedule:**
1. **Book-ahead window:** `startTime <= now + days_bookable_in_advance`
2. **Minimum advance time:** `startTime >= now + min_book_ahead_hours`
3. **Time slot intervals:** Minutes must be divisible by `client_booking_interval_minutes`

**For Cancel/Reschedule:**
1. **Cancellation deadline:** `(startTime - now) >= min_cancel_ahead_hours`

**Error Messages:**
- Bilingual (English/Spanish)
- User-friendly explanations
- Clear action items

**Example:**
```typescript
const error = await validateBookingRules(new Date('2025-12-10T14:00:00'), 'create');
// Returns: "Appointments must be booked at least 2 hour(s) in advance"
```

#### 2.2 Shop Config Fields Used

**Table:** `shop_config`

**Fields:**
- `days_bookable_in_advance` (int, default 30): Max days to book ahead
- `min_book_ahead_hours` (int, default 2): Min hours before appointment
- `min_cancel_ahead_hours` (int, default 24): Min hours to allow cancellation
- `client_booking_interval_minutes` (int, default 15): Time slot intervals (10/15/20/30/60)

**Future Integration:**
- Call `validateBookingRules()` from:
  - Client-facing booking flow (when implemented)
  - Owner/barber create appointment modals
  - Cancellation/reschedule endpoints

### Part 3: Settings Hub (Shop Configuration UI)

#### 3.1 Settings Page Structure

**Location:** `src/pages/OwnerSettings.tsx`

**Layout:** Tabbed interface with three tabs

**Tabs:**
1. Shop Info
2. Booking Rules
3. Clients & Retention

#### 3.2 Shop Info Tab

**Fields:**
- **Tax Rate (%)**: Sales tax applied to services/products
- **Card Processing Fee (%)**: Fee for card transactions

**Persistence:**
- Updates `shop_config.tax_rate` (stored as decimal: input/100)
- Updates `shop_config.card_processing_fee_rate`

#### 3.3 Booking Rules Tab

**Scope: Global Shop Settings**

IMPORTANT: Booking rules are currently **global shop settings** stored in the `shop_config` table. These rules apply to **all barbers** without exception.

**Future Enhancement:**
- Per-barber overrides may be added in a future phase
- This would allow specific barbers to have different rules (e.g., senior barber can accept same-day bookings)
- Implementation would likely involve:
  - A new `barber_booking_overrides` table OR
  - Additional fields on the `users` table for barber-specific rules
  - Validation logic that checks barber overrides first, then falls back to shop defaults

**Current Implementation:**
The UI displays helper text: "These rules apply to all barbers. Barber-specific overrides may be added in a future update."

**Fields:**
1. **Days Bookable in Advance** (1-365)
   - Controls max booking window
   - Applied globally to all barbers
2. **Minimum Hours Before Booking** (0-72)
   - Prevents last-minute bookings
   - Applied globally to all barbers
3. **Minimum Hours Before Cancellation** (0-72)
   - Enforces cancellation policy
   - Applied globally to all barbers
4. **Booking Interval** (dropdown: 10, 15, 20, 30, 60 minutes)
   - Controls available time slots
   - Applied globally to all barbers

**Persistence:**
- Updates corresponding `shop_config` fields
- Changes take effect immediately (no restart needed)
- Used by `validateBookingRules()` function
- All barbers inherit these global rules

#### 3.4 Clients & Retention Tab

**Fields:**
1. **Visits to Become Regular Client** (1-20, default 3)
   - Threshold for "regular" classification
2. **Days Without Visit to Count as Lapsed** (1-365, default 90)
   - Threshold for "lapsed" classification

**Persistence:**
- Updates `shop_config.regular_client_min_visits`
- Updates `shop_config.lapsed_client_days`

**Impact:**
- Clients Report page (Retention & Acquisition)
- Client segmentation logic
- Marketing automation triggers (future)

**UI Note:**
- Blue info box explains which pages are affected
- Encourages configuration before analyzing reports

#### 3.5 Settings Navigation

**Access:** Dropdown menu in main nav → Settings → Shop Settings

**All settings persist to `shop_config` table (single row, ID = 1)**

### Database Schema Changes

#### New/Modified Tables

**1. `appointments` (modified)**
- Added: `inventory_processed` (boolean, default false)
- Index: `idx_appointments_inventory_processed`

**2. `inventory_transactions` (existing, now fully utilized)**
- Used for SALE and ADJUSTMENT transactions
- Fields: `product_id`, `type`, `quantity_change`, `stock_after`, `reason`, `appointment_id`, `created_by_user_id`

**3. `shop_config` (existing, fields now configurable via UI)**
- `days_bookable_in_advance`: Max booking window
- `min_book_ahead_hours`: Minimum advance booking time
- `min_cancel_ahead_hours`: Minimum cancellation notice
- `client_booking_interval_minutes`: Time slot intervals
- `regular_client_min_visits`: Regular client threshold
- `lapsed_client_days`: Lapsed client threshold

### Files Modified/Created

**New Pages:**
1. `src/pages/OwnerInventory.tsx` - Full inventory management (replaced stub)
2. `src/pages/OwnerInventoryReports.tsx` - Valuation and stock snapshot
3. `src/pages/OwnerSettings.tsx` - Tabbed settings hub (complete rewrite)

**New Utilities:**
1. `src/lib/bookingRules.ts` - Booking validation helper

**Modified Components:**
1. `src/components/PaymentModal.tsx` - Added SALE transaction logic (lines 102-172)
2. `src/components/Header.tsx` - Added "Inventory Reports (Beta)" to dropdown

**Modified Routes:**
1. `src/App.tsx` - Added `/owner/inventory-reports` route

**Migrations:**
1. `add_inventory_processed_flag` - Added idempotency field to appointments

### Removed Hard-Coded Values

**Before Sprint:**
- Commission rate: Hard-coded 50%
- Regular client threshold: Hard-coded 2 visits
- Lapsed client threshold: Hard-coded 90 days
- Booking rules: Not enforced

**After Sprint:**
- Commission rate: Still hard-coded (TODO: per-barber configuration in Phase 8)
- Regular/lapsed thresholds: Configurable via Settings → Clients & Retention
- Booking rules: Configurable via Settings → Booking Rules
- Inventory: Automatically tracked on product sales

### Business Logic Summary

#### Inventory Flow
```
1. Owner adjusts stock manually → ADJUSTMENT transaction created
2. Appointment marked as paid → Check inventory_processed flag
3. If not processed → For each product in appointment
4. Create SALE transaction (quantity_change = -quantity)
5. Decrement product.current_stock
6. Set inventory_processed = true
7. Display updated stock levels on Inventory page
```

#### Booking Rules Flow (Future)
```
1. User selects appointment time
2. Call validateBookingRules(time, 'create')
3. Check against shop_config rules
4. If validation fails → Show friendly error message
5. If validation passes → Allow booking
```

#### Settings Flow
```
1. Owner navigates to Settings
2. Selects tab (Shop Info / Booking Rules / Retention)
3. Updates field values
4. Clicks "Save Changes"
5. Updates shop_config table
6. Shows success toast
7. Changes take effect immediately
```

### TODOs & Future Work

#### Inventory (Phase 7+)
- [ ] Add low-stock email/SMS alerts
- [ ] Implement CSV export for inventory reports
- [ ] Build shrinkage tracking report
- [ ] Add product performance analytics
- [ ] Create PURCHASE transaction type for restocking
- [ ] Implement barcode scanning for faster adjustments

#### Booking Rules (Phase 6)
- [ ] Integrate `validateBookingRules()` into client booking flow
- [ ] Add validation to NewAppointmentModal
- [ ] Add validation to EditAppointmentModal
- [ ] Show friendly errors in UI (not just console)
- [ ] Add override capability for OWNER role
- [ ] Add "blackout dates" feature (holidays, closures)

#### Settings (Phase 8+)
- [ ] Add "Shop Details" sub-tab (name, address, phone, hours)
- [ ] Add "Hours & Booking Rules" sub-tab (combine with existing)
- [ ] Add "Payments & Fees" sub-tab (expand Shop Info)
- [ ] Add "Notifications" sub-tab (SMS/email preferences)
- [ ] Add "Languages" sub-tab (default language, enable/disable)
- [ ] Add "Integrations" sub-tab (Google Calendar, Twilio, etc.)
- [ ] Per-barber commission configuration
- [ ] Commission tiers based on monthly sales

#### Clients Report (Phase 6)
- [ ] Update OwnerClientsReport to fetch thresholds from shop_config
- [ ] Remove hard-coded REGULAR_MIN_VISITS = 2
- [ ] Remove hard-coded LAPSED_DAYS = 90
- [ ] Display current thresholds at top of page
- [ ] Add "Configure" link to Settings → Clients & Retention tab

### Known Limitations

1. **Inventory Idempotency:** Relies on `inventory_processed` flag. If flag is manually reset, inventory will be decremented again. Consider using unique constraint or transaction logs.

2. **Booking Rules Not Enforced Yet:** Validation function exists but not integrated into booking flows. Appointments can still be created outside configured windows.

3. **Commission Still Hard-Coded:** 50% service commission is still hard-coded in PaymentModal. Needs per-barber configuration.

4. **Settings Single Row Assumption:** Code assumes `shop_config` has exactly one row with ID = 1. Should add error handling for missing config.

5. **No Negative Stock Prevention:** Products can go negative if more items are sold than in stock. Add validation to prevent this.

6. **SALE Transactions on Edit:** If appointment products are edited after payment, inventory is not adjusted. Need logic to handle product changes post-payment.

### Testing Recommendations

**Inventory:**
- [ ] Test manual adjustment (increase and decrease)
- [ ] Test SALE transaction on appointment payment
- [ ] Verify idempotency (pay same appointment twice)
- [ ] Check valuation calculations
- [ ] Verify status badges (OUT, LOW, OK)

**Booking Rules:**
- [ ] Call `validateBookingRules()` from browser console
- [ ] Test all validation scenarios (too far, too soon, wrong interval)
- [ ] Verify error messages in both languages
- [ ] Confirm Settings changes affect validation immediately

**Settings:**
- [ ] Save each tab independently
- [ ] Verify persistence (reload page, check values)
- [ ] Test edge cases (negative values, max values)
- [ ] Confirm bilingual labels

---

## Barber App / PWA Experience

This section documents the barber-focused views designed for mobile-first PWA usage.

### Barber Today View (`/barber/today`)

**Location:** `src/pages/BarberToday.tsx`

**Purpose:** Daily dashboard for barbers showing today's appointments and earnings summary.

**Earnings Summary Cards:**

Three summary cards display real-time earnings for completed appointments:

1. **Services Revenue:** Total `services_total` from completed appointments today
2. **Tips:** Total `tip_amount` from completed appointments today
3. **My Commission:** Total `service_due_to_barber` from completed appointments today

**Calculations:**
```typescript
const earnings = appointments
  .filter(apt => apt.status === 'completed')
  .reduce((acc, apt) => ({
    servicesRevenue: acc.servicesRevenue + apt.services_total,
    tips: acc.tips + apt.tip_amount,
    commission: acc.commission + apt.service_due_to_barber,
  }), { servicesRevenue: 0, tips: 0, commission: 0 });
```

**Appointments Table:**

Shows all appointments for today (regardless of status):
- Time (formatted as 12-hour clock)
- Client name
- Service name (bilingual EN/ES)
- Status badge (booked/completed/no_show)
- Quick action buttons (for booked appointments only):
  - Mark Completed
  - Mark No Show

**Data Loading:**
- Queries appointments where `barber_id = userData.id`
- Filters by today's date (`scheduled_start` >= today 00:00:00 AND < tomorrow 00:00:00)
- Orders by `scheduled_start` ascending
- Includes financial fields: `services_total`, `tip_amount`, `service_due_to_barber`

**Mobile Optimization:**
- Card layout with responsive grid (`repeat(auto-fit, minmax(200px, 1fr))`)
- Large tap targets on action buttons
- Clear visual hierarchy with status badges
- Clean, uncluttered interface

---

### My Earnings View (`/barber/stats`)

**Location:** `src/pages/BarberStats.tsx`

**Purpose:** Historical earnings tracker with customizable date ranges and day-by-day breakdown.

**Date Range Filter:**

Two date input fields:
- Start Date (default: 30 days ago)
- End Date (default: today)

**Summary Cards:**

Four total cards showing aggregated earnings:

1. **Total Appointments:** Count of completed appointments in range
2. **Services Revenue:** Sum of `services_total`
3. **Total Tips:** Sum of `tip_amount`
4. **My Commission:** Sum of `service_due_to_barber` (highlighted in green)

**Daily Breakdown Table:**

Grouped by day with columns:
- Date (formatted as "Weekday, Month Day, Year")
- Appointments (count of completed appointments that day)
- Services (services revenue for that day)
- Tips (tips for that day)
- Commission (barber's commission for that day, highlighted in green)

**Data Processing:**
```typescript
const groupedByDay = new Map<string, DailyEarnings>();

appointments.forEach(apt => {
  const date = new Date(apt.scheduled_start).toISOString().split('T')[0];
  // Aggregate by day: appointmentCount, servicesRevenue, tips, commission
});

// Sort by date descending (most recent first)
```

**Permissions:**
- Requires `userData.can_view_own_stats` permission
- Only shows data for `barber_id = userData.id`
- RLS policies enforce barber can only see their own appointments

---

### Barber Navigation

**Desktop Navigation:**
- Today (highlighted with background)
- Calendar (link to `/barber/appointments`)
- My Earnings (conditional: requires `can_view_own_stats`)
- Language toggle (EN/ES)
- Logout button

**Mobile Navigation:**
- Hamburger menu
- Same links as desktop in vertical layout
- Large tap targets (1rem padding)
- Full-width links
- Language selector and logout at bottom

**Barbers Cannot Access:**
- Owner-only pages (Reports, Payouts, Inventory, Products, Services, Settings, Engage)
- Other barbers' data
- Global shop analytics
- Client management (future: read-only client list may be added)

---

### Security & Permissions

**Row-Level Security (RLS):**

Appointments table policies ensure:
- Barbers can only `SELECT` appointments where `barber_id = auth.uid()`
- Barbers can `UPDATE` their own appointments (status changes)
- Owners can see/update all appointments

**Application-Level Filters:**

Both barber views explicitly filter queries:
```typescript
.eq('barber_id', userData.id)
```

This provides defense-in-depth: both RLS and application logic enforce barber isolation.

**Permission Checks:**

1. **Barber Today:** Accessible to all active barbers (no special permission)
2. **My Earnings:** Requires `userData.can_view_own_stats === true`

**Inactive Barbers:**

If `userData.active === false`:
- Barber sees a special "Account Inactive" message
- Cannot access any appointment or earnings data
- Only action available is Logout
- Must contact shop owner to reactivate

---

### Bilingual Support

All barber views fully support EN/ES:

**Barber Today:**
- "Today" / "Hoy"
- "Services Revenue" / "Ingresos por Servicios"
- "Tips" / "Propinas"
- "My Commission" / "Mi Comisión"
- "Today's Appointments" / "Citas de Hoy"
- Status labels: "Booked" / "Reservado", "Completed" / "Completado", "No Show" / "No Asistió"

**My Earnings:**
- "My Earnings" / "Mis Ganancias"
- "Date Range" / "Rango de Fechas"
- "Start Date" / "Fecha Inicio"
- "End Date" / "Fecha Fin"
- "Daily Breakdown" / "Desglose Diario"
- All table headers and card labels

---

### Commission Calculation

**Commission Source:** Uses existing `service_due_to_barber` field from appointments table.

**How It's Calculated (Owner Side):**

When an appointment is marked as completed and paid, the `service_due_to_barber` field is populated (see `PaymentModal.tsx`).

**Current Logic:**
- 50% commission rate on services revenue
- `service_due_to_barber = services_total * 0.50`
- Products commission: Not yet implemented (Phase 7)
- Tiered commission rates: Not yet implemented (Phase 7)

**Barber View:**
- Barbers see their commission totals
- No ability to edit commission rates (owner-only)
- Historical data preserved even if rates change in future

---

### Future Enhancements (Barber App)

**Planned Features:**
- Read-only client list for barbers
- Push notifications for new bookings
- Offline mode for viewing today's schedule
- Tips tracking trends (weekly/monthly comparison)
- Personal performance dashboard (clients served, avg rating)
- Clock in/out for time tracking integration

---

## Client Website / Online Booking

This section documents the public-facing client website that allows customers to book appointments online.

### Overview

**Purpose:** Mobile-first public website for clients to view services, barbers, and book appointments without authentication.

**Technology:** Same React codebase, separate routes, no authentication required.

**Visual Identity:** Features CSS-animated barber pole in header for brand recognition.

---

### Routes

All client routes are public (no authentication):

1. **`/client`** → Redirects to `/client/home`
2. **`/client/home`** → Landing page with shop info
3. **`/client/services`** → Browse services catalog
4. **`/client/barbers`** → Meet the team
5. **`/client/book`** → Online booking flow (MVP)

---

### Client Home Page (`/client/home`)

**Location:** `src/pages/ClientHome.tsx`

**Sections:**

1. **Hero Section:**
   - Shop name and tagline
   - Primary CTA: "Book Appointment" → `/client/book`
   - Gradient background (black to gray)

2. **Quick Info Cards:**
   - Location (placeholder: 123 Main Street)
   - Phone (placeholder: 555-123-4567)
   - Hours (placeholder static hours)
   - Future: Pull from `shop_config` table

3. **Why Choose Us:**
   - Expert Barbers
   - Bilingual Staff (EN/ES)
   - Online Booking
   - Walk-Ins Welcome

4. **Bottom CTA:**
   - Repeats "Book Now" button
   - Black background for contrast

**Bilingual:**
- All headings and body text
- EN/ES toggle in header

---

### Client Services Page (`/client/services`)

**Location:** `src/pages/ClientServices.tsx`

**Data Source:** `services` table (same as owner uses)

**Query:**
```typescript
supabase
  .from('services')
  .select('*')
  .eq('active', true)
  .order('category', 'name_en')
```

**Display:**
- Groups services by `category` field
- Each category has section heading
- Responsive grid: `repeat(auto-fill, minmax(300px, 1fr))`

**Service Card Shows:**
- Image (if `image_url` exists) or gradient placeholder with ✂️ emoji
- Name (language-aware: `name_en` / `name_es`)
- Description (if available: `description_en` / `description_es`)
- Price (from `price` field)
- Duration (formatted: "30 min" or "1h 15m")

**Fallbacks:**
- No image: Gradient background with scissors emoji
- No description: Only shows name and price
- Missing category: Groups under "Other" / "Otro"

---

### Client Barbers Page (`/client/barbers`)

**Location:** `src/pages/ClientBarbers.tsx`

**Data Source:** `users` table filtered by role

**Query:**
```typescript
supabase
  .from('users')
  .select('id, first_name, last_name, profile_image_url, active')
  .eq('role', 'BARBER')
  .eq('active', true)
  .order('first_name')
```

**Display:**
- Responsive grid: `repeat(auto-fill, minmax(280px, 1fr))`
- Card layout with hover effects

**Barber Card Shows:**
- Profile photo (if `profile_image_url` exists) or initials on gradient
- Full name (`first_name` + `last_name`)
- Title: "Professional Barber" / "Barbero Profesional"
- "Book with [Name]" button

**Click Action:**
- Navigates to `/client/book?barber={barberId}`
- Pre-selects that barber in booking flow

---

### Client Book Page (`/client/book`) - MVP

**Location:** `src/pages/ClientBook.tsx`

**Purpose:** Multi-step booking flow with validation

**Flow Steps:**

1. **Select Barber**
   - Radio-style selection
   - Pre-selected if coming from barbers page (`?barber=` query param)

2. **Select Service**
   - Shows all active services
   - Displays name, price, duration
   - Future: Filter by barber's assigned services

3. **Select Date & Time**
   - Date picker: Limited by `days_bookable_in_advance`
   - Time slots: Generated based on `client_booking_interval_minutes`
   - Enforces `min_book_ahead_hours`
   - Only future dates allowed

4. **Client Information**
   - Full Name (required)
   - Phone Number (required)
   - Notes (optional)

5. **Confirmation**
   - Summary of all selections
   - Shows barber, service, date/time, price
   - "Confirm Booking" button

**Validation & Rules:**

Uses existing `validateBookingRules()` from `src/lib/bookingRules.ts`:

```typescript
import { validateBookingRules, formatBookingRuleError } from '../lib/bookingRules';

const validationError = await validateBookingRules(appointmentDateTime, 'create');
if (validationError) {
  setError(formatBookingRuleError(validationError, language));
  return false;
}
```

**Rules Enforced:**
- Cannot book more than `days_bookable_in_advance` days ahead
- Must book at least `min_book_ahead_hours` hours in advance
- Times must align with `client_booking_interval_minutes` (e.g., :00, :15, :30, :45)
- Only future appointments allowed

**Client Handling:**

1. **Existing Client:** Looks up by phone number
   ```typescript
   supabase.from('clients').select('id').eq('phone', clientPhone).maybeSingle()
   ```

2. **New Client:** Creates record
   - Splits `clientName` into `first_name` and `last_name`
   - Stores `phone` and optional `notes`

**Appointment Creation:**

```typescript
supabase.from('appointments').insert({
  barber_id: selectedBarber,
  client_id: clientId,
  service_id: selectedService,
  scheduled_start: appointmentDateTime.toISOString(),
  scheduled_end: calculatedEndTime.toISOString(),
  status: 'booked',
  notes: clientNotes || null,
  source: 'client_web',  // Tracking field
})
```

**Success:**
- Shows alert confirmation
- Redirects to `/client/home`
- Future: Send SMS confirmation

---

### Barber Pole Animation

**Location:** `src/components/BarberPole.tsx`

**Purpose:** Realistic 3D barber pole with glass tube effect for brand identity

**Visual Design:**
- **Glass Tube:**
  - Gradient background simulating glass reflection
  - Horizontal gradient (90deg) with white highlights for cylindrical effect
  - Box shadows: inset for depth, outer for elevation
  - Red/white/blue diagonal stripes visible through the glass
- **Gold End Caps:**
  - Gold gradient (`#f6c453`, `#d4a017`, `#b8860b`)
  - Inset shadows for 3D beveled appearance
  - Outer shadow for depth
  - Different border radius for top/bottom (icon) or left/right (banner)
- **Animated Stripes:**
  - Red (`#dc143c`), white, and blue (`#003d7a`) repeating pattern
  - Diagonal gradient (45deg for vertical, 135deg for horizontal)
  - CSS animation using `background-position` for continuous twist
  - 3-second smooth linear loop
- **Glass Highlight:**
  - Vertical or horizontal gradient overlay
  - Simulates light reflection on glass surface
  - Semi-transparent white layer with pointer-events: none

**Component Variants:**

1. **Icon Variant (`variant="icon"`)**:
   - Vertical orientation
   - Width: `height * 0.6px`, Height: configurable (default 40-50px)
   - Gold caps on top and bottom
   - Stripes twist vertically upward
   - Used in navigation headers

2. **Banner Variant (`variant="banner"`)**:
   - Horizontal orientation
   - Width: 100% (fills container), Height: configurable (default 50px)
   - Gold caps on left and right
   - Stripes twist horizontally
   - Used as page section divider

**Performance:**
- Pure CSS and inline styles (no external images)
- CSS transforms only (GPU-accelerated)
- No JavaScript animation (uses @keyframes)
- Minimal CPU impact on mobile
- Single animation loop shared across instances

**Usage:**

1. **Client Header** (`ClientHeader.tsx`):
   ```typescript
   <BarberPole variant="icon" height={40} />
   ```
   - Positioned next to "Lupe's Barber" logo
   - Visible on all client pages
   - Part of brand identity

2. **Client Home Banner** (`ClientHome.tsx`):
   ```typescript
   <BarberPole variant="banner" height={50} />
   ```
   - Placed between hero section (black gradient) and Quick Info section
   - Spans full content width with container padding
   - Serves as visual separator and brand reinforcement
   - Margin: `2rem auto` for spacing

---

### Client Header Component

**Location:** `src/components/ClientHeader.tsx`

**Features:**
- Barber pole animation on left
- Shop name ("Lupe's Barber") as clickable logo
- Horizontal navigation (desktop)
- Hamburger menu (mobile, breakpoint: 768px)
- Language toggle (EN/ES)

**Navigation Items:**
- Home → `/client/home`
- Services → `/client/services`
- Barbers → `/client/barbers`
- Products → `/client/products`
- Book Now → `/client/book`

**Responsive:**
- Desktop: Horizontal nav with hover effects
- Mobile: Full-screen dropdown menu
- Sticky header (stays at top)

**Styling:**
- Black background (`#000`)
- White text
- Hover: `rgba(255,255,255,0.1)` background
- Clean, professional aesthetic

---

### Booking Source Tracking

**Database Field:** `appointments.source`

**Migration:** `add_appointment_source_field.sql`

**Values:**
- `'owner'` - Created by owner (default for existing records)
- `'barber'` - Created by barber
- `'client_web'` - Created via client website
- `'walk_in'` - Walk-in appointment

**Purpose:**
- Analytics on booking channels
- Track online vs in-person bookings
- Future: Different commission rates by source
- Marketing effectiveness measurement

**Usage:**
```typescript
// Client web bookings
source: 'client_web'

// Owner dashboard bookings
source: 'owner'

// Barber app bookings
source: 'barber'
```

---

### Client Products Page (`/client/products`) - MVP

**Location:** `src/pages/ClientProducts.tsx`

**Purpose:** Read-only products catalog for clients to browse available products

**Data Source:** `products` table

**Query:**
```typescript
supabase
  .from('products')
  .select('*')
  .eq('active', true)
  .gt('current_stock', 0)
  .order('category', 'name_en')
```

**Filtering:**
- Only active products (`active = true`)
- Only products in stock (`current_stock > 0`)
- Sorted by category, then name

**Display:**
- Groups products by `category` field
- Responsive grid: `repeat(auto-fill, minmax(280px, 1fr))`
- Similar styling to ClientServices page

**Product Card Shows:**
- Stock status badge (using `getInventoryStatus()` helper):
  - "In Stock" / "En Stock" (green)
  - "Low Stock" / "Stock Bajo" (yellow)
  - "Out of Stock" / "Agotado" (red)
- Product name (bilingual: `name_en` / `name_es`)
- Brand
- Retail price (uses `retail_price`, falls back to `price`)
- Image (if `image_url` exists) or gradient placeholder with initials

**Image Fallback:**
- No image: Purple-to-violet gradient
- Displays first letter of product name + first letter of brand
- Example: "Hair Gel" by "American Crew" → "HA"

**Info Banner:**
- Top of page (before product grid)
- Blue info box: "Ask your barber about these products at checkout."
- Bilingual: EN/ES

**No E-Commerce:**
- Browse-only, no cart functionality
- No checkout or online ordering
- Encourages in-person sales

**Navigation:**
- Added to ClientHeader as "Products" / "Productos"
- Route: `/client/products`

---

### Deep-Linking to Booking

**Purpose:** Allow direct navigation from Services and Barbers pages to Booking with pre-selected options

**Query Parameters:**

1. **`?barber={barberId}`**
   - Pre-selects barber in Step 1 of booking flow
   - Used by ClientBarbers page
   - Example: `/client/book?barber=abc123`

2. **`?service={serviceId}`**
   - Pre-selects service in Step 2 of booking flow
   - Used by ClientServices page
   - Example: `/client/book?service=xyz789`

3. **Combined:**
   - Both params can be used together
   - Example: `/client/book?barber=abc123&service=xyz789`

**Implementation in ClientBook:**

```typescript
useEffect(() => {
  const preselectedBarber = searchParams.get('barber');
  if (preselectedBarber && barbers.length > 0) {
    const barber = barbers.find(b => b.id === preselectedBarber);
    if (barber) {
      setSelectedBarber(preselectedBarber);
    }
  }
}, [searchParams, barbers]);

useEffect(() => {
  const preselectedService = searchParams.get('service');
  if (preselectedService && services.length > 0) {
    const service = services.find(s => s.id === preselectedService);
    if (service) {
      setSelectedService(preselectedService);
    }
  }
}, [searchParams, services]);
```

**Behavior:**
- Validates that ID exists and record is active
- Pre-selects the option (does NOT auto-skip steps)
- User can still change their selection
- Invalid IDs are silently ignored
- No error messages for invalid query params

**User Experience:**
- Click service card → Book page with service pre-selected
- Click "Book with [Barber]" → Book page with barber pre-selected
- Natural, predictable flow
- Reduces friction in booking process

---

### Booking Fallback Configuration

**Purpose:** Prevent booking page from completely failing if shop_config cannot be loaded

**Problem Solved:**
- Previously, if `shop_config` fetch failed, booking was completely blocked
- User saw hard error: "Failed to load booking data"
- No way to proceed with booking

**Solution: Fallback Defaults**

When `shop_config` fails to load or returns null:
- Use sensible default values:
  ```typescript
  {
    days_bookable_in_advance: 30,
    min_book_ahead_hours: 2,
    client_booking_interval_minutes: 15
  }
  ```
- Show non-blocking info banner (yellow warning)
- Allow user to continue booking

**Info Banner Text:**

- EN: "Some booking settings could not be loaded. Using default rules. Please contact the shop for details."
- ES: "Algunas configuraciones de reserva no se pudieron cargar. Usando reglas predeterminadas. Por favor contacta a la tienda para más detalles."

**Banner Styling:**
- Background: `#fff3cd` (light yellow)
- Text: `#856404` (dark yellow-brown)
- Border: `#ffeaa7`
- Positioned above error banner, below step indicators

**Fallback Behavior:**
- Booking rules validation still runs
- Uses fallback config values
- Date picker limits use fallback values
- Time slots generated using fallback interval
- User can successfully complete booking

**Error Handling:**
- Try/catch around `getShopConfig()` call
- Fallback applied in both success (null) and error cases
- Console logs error for debugging
- User experience is minimally disrupted

**Implementation:**
```typescript
if (shopConfig) {
  setConfig(shopConfig);
} else {
  const fallbackConfig = { ... };
  setConfig(fallbackConfig);
  setConfigWarning(message);
}
```

**Benefits:**
- Graceful degradation
- User can still book appointments
- Clear communication about limitation
- Owner can fix shop_config without blocking all bookings

---

### Data Integration

**Services:**
- Uses existing `services` table
- Filters by `active = true`
- Respects `category` for grouping
- Shows `image_url` with fallback
- Bilingual: `name_en/es`, `description_en/es`

**Barbers:**
- Uses existing `users` table
- Filters by `role = 'BARBER'` AND `active = true`
- Shows `profile_image_url` with initials fallback
- Future: Show barber specialties via `barber_services` table

**Clients:**
- Uses existing `clients` table
- Matches by `phone` to avoid duplicates
- Auto-creates new client if phone not found
- Stores minimal info: name, phone, notes

**Appointments:**
- Uses existing `appointments` table
- Sets `status = 'booked'`
- Sets `source = 'client_web'`
- Calculates `scheduled_end` from service duration
- All existing owner/barber views show these appointments

**Shop Config:**
- Reads `shop_config` table for booking rules
- Uses `days_bookable_in_advance`
- Uses `min_book_ahead_hours`
- Uses `client_booking_interval_minutes`
- Fallback defaults if config unavailable (see Booking Fallback Configuration)

**Products:**
- Uses existing `products` table
- Filters by `active = true` AND `current_stock > 0`
- Shows bilingual names (`name_en` / `name_es`)
- Displays retail_price (falls back to price)
- Stock status using `getInventoryStatus()` helper
- Groups by `category`
- Image with initials fallback

---

### Security & Permissions

**Public Access:**
- All client routes are public (no authentication)
- Read-only access to services and barbers
- Can create appointments without login
- Cannot view other clients' appointments
- Cannot access owner/barber dashboards

**RLS Policies:**

Client pages query these tables:
1. **services:** Public read access already exists
2. **users (barbers):** Public read for active barbers only
3. **clients:** Can insert new clients
4. **appointments:** Can insert new appointments
5. **products:** Public read for active products with stock

**Validation:**
- All booking rules enforced client-side and could be enforced server-side via RLS
- Phone number required (future: SMS verification)
- No access to financial data (commissions, payouts)

---

### Bilingual Support

All client pages fully support EN/ES:

**ClientHome:**
- "Welcome to Lupe's Barber" / "Bienvenido a Lupe's Barber"
- "Book Appointment" / "Reservar Cita"
- "Quick Info" / "Información Rápida"
- All section headings and body text

**ClientServices:**
- "Our Services" / "Nuestros Servicios"
- Service names and descriptions (from database)
- "Loading..." / "Cargando..."

**ClientBarbers:**
- "Our Barbers" / "Nuestros Barberos"
- "Professional Barber" / "Barbero Profesional"
- "Book with [Name]" / "Reservar con [Name]"

**ClientBook:**
- All step titles and labels
- "Select Barber" / "Seleccionar Barbero"
- "Select Service" / "Seleccionar Servicio"
- "Select Date & Time" / "Seleccionar Fecha y Hora"
- "Your Information" / "Tu Información"
- "Confirm Booking" / "Confirmar Reserva"
- All error messages (from `bookingRules.ts`)

---

### Performance Considerations

**Barber Pole Animation:**
- Pure CSS (no JavaScript)
- Uses CSS transforms (GPU-accelerated)
- Gradient background (no images to load)
- Single `@keyframes` rule
- Minimal CPU/battery impact

**Page Load:**
- Services: Single query, cached by browser
- Barbers: Single query, cached by browser
- Booking: Progressive loading (only loads next step's data)
- Images: Fallback to gradients if missing
- No heavy libraries or dependencies

**Mobile Optimization:**
- Responsive breakpoints at 768px
- Touch-friendly tap targets (min 44px)
- Native date/time pickers
- Minimal JavaScript
- Fast page transitions

---

### Future Enhancements

**Planned Features:**

1. **Client Portal:**
   - View upcoming appointments
   - Cancel/reschedule online
   - View appointment history
   - Save favorite barber

2. **Enhanced Booking:**
   - Calendar view of available slots
   - Barber availability checking (conflicts)
   - Service add-ons (beard trim + haircut)
   - Recurring appointments

3. **Communication:**
   - SMS confirmation (using existing SMS foundation)
   - Email confirmation
   - Reminder notifications (24hr, 1hr)
   - Two-way messaging with shop

4. **Products Catalog:**
   - `/client/products` page
   - Show retail items from `products` table
   - Online ordering for pickup
   - Product recommendations

5. **Reviews & Ratings:**
   - Post-appointment rating request
   - Public reviews display
   - Barber ratings on barbers page
   - Aggregate shop rating

6. **Advanced Features:**
   - Wait list / standby booking
   - Group appointments (multiple people)
   - Gift certificates
   - Loyalty program integration
   - Social media sharing

7. **Analytics Integration:**
   - Track booking funnel conversion
   - A/B test booking flow
   - Heat maps on service popularity
   - Source attribution (Google, Instagram, etc.)

---

### Testing Checklist

**Client Home:**
- [ ] Page loads without authentication
- [ ] All sections render correctly
- [ ] "Book Appointment" buttons navigate to `/client/book`
- [ ] Language toggle works
- [ ] Mobile menu opens/closes
- [ ] Barber pole animation smooth

**Client Services:**
- [ ] Services load from database
- [ ] Grouped by category correctly
- [ ] Images display or show fallback
- [ ] Prices and durations show
- [ ] Bilingual names/descriptions work
- [ ] Mobile grid responsive

**Client Barbers:**
- [ ] Only active barbers show
- [ ] Profile images or initials display
- [ ] "Book with" button navigates with query param
- [ ] Cards responsive on mobile
- [ ] Hover effects work

**Client Book:**
- [ ] 5-step flow progresses correctly
- [ ] Pre-selected barber from query param works
- [ ] Date picker limits enforce rules
- [ ] Time slots generated correctly
- [ ] Validation shows errors in correct language
- [ ] Cannot book too far in advance
- [ ] Cannot book too soon
- [ ] Times must align with interval
- [ ] Client creation works
- [ ] Existing client lookup by phone works
- [ ] Appointment creates with `source = 'client_web'`
- [ ] Success redirects to home
- [ ] All steps support EN/ES

**Integration:**
- [ ] Client bookings appear in owner Today view
- [ ] Client bookings appear in barber Today view
- [ ] `source` field shows "client_web"
- [ ] Client record created correctly
- [ ] Booking rules respected
- [ ] No TypeScript errors
- [ ] Build passes

---

## Owner Analytics & Reporting

This section documents the analytics dashboard that provides owners with comprehensive insights into revenue, appointments, and booking sources.

### Overview

**Purpose:** Give shop owners clear, actionable insights into business performance, revenue sources, and growth trends.

**Location:** `src/pages/OwnerReports.tsx`

**Route:** `/owner/reports`

**Access:** Owner role only

---

### Date Range Filtering

**Preset Options:**

The dashboard provides 5 date range presets for quick analysis:

1. **Today** - Current day only (00:00:00 to 23:59:59)
2. **Last 7 Days** - Rolling 7-day window from today
3. **Last 30 Days** - Rolling 30-day window from today
4. **This Month** - Calendar month to date (1st to today)
5. **Custom** - User-defined start and end dates

**Date Calculation Logic:**

All date filtering uses UTC-safe calculations with time zone awareness:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const last7 = new Date(today);
last7.setDate(today.getDate() - 7);

const last30 = new Date(today);
last30.setDate(today.getDate() - 30);

const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
```

**Query Filter:**

Appointments are filtered by `scheduled_start` within the date range:

```typescript
supabase
  .from('appointments')
  .select('*')
  .gte('scheduled_start', startDate.toISOString())
  .lte('scheduled_start', endDate.toISOString())
```

---

### Data Tables Used

**Primary Tables:**

1. **`appointments`**
   - Core transaction data
   - Fields used: `id`, `status`, `source`, `scheduled_start`, `barber_id`, `service_id`, `services_total`, `tip_amount`, `service_due_to_barber`, `service_due_to_shop`
   - Filtered by date range and status

2. **`services`**
   - Service catalog for category grouping
   - Fields used: `id`, `name_en`, `name_es`, `category`
   - Joined to appointments via `service_id`

3. **`products`** (via `appointment_products`)
   - Product sales data
   - Fields used: `id`, `name_en`, `name_es`, `unit_price`
   - Aggregated by product for sales totals

4. **`appointment_products`**
   - Line items for product sales
   - Fields used: `appointment_id`, `product_id`, `quantity`, `unit_price`
   - Filtered by appointments in date range

5. **`users`** (barbers)
   - Barber identification
   - Fields used: `id`, `name`
   - Joined to appointments via `barber_id`

**Auxiliary Queries:**

- Products query fetches product names for detailed sales breakdown
- Services query fetches category groupings for service analysis

---

### Core KPIs (Key Performance Indicators)

The dashboard displays 7 primary metrics:

**1. Total Revenue**
- **Calculation:** Sum of `services_total` + `products_total` from completed appointments
- **Includes:** Service charges and product sales
- **Excludes:** Tips, card processing fees
- **Status Filter:** Only `status = 'completed'`

**2. Services Revenue**
- **Calculation:** Sum of `services_total` from completed appointments
- **Includes:** All service charges before tips/fees
- **Excludes:** Product sales, tips
- **Status Filter:** Only `status = 'completed'`

**3. Total Tips**
- **Calculation:** Sum of `tip_amount` from completed appointments
- **Includes:** All tips recorded at payment
- **Excludes:** Cash tips not entered in system
- **Status Filter:** Only `status = 'completed'`

**4. Completed Appointments**
- **Calculation:** Count of appointments with `status = 'completed'`
- **Includes:** All completed appointments in date range
- **Excludes:** Booked, cancelled, no-show

**5. Cancelled Appointments**
- **Calculation:** Count of appointments with `status = 'cancelled'`
- **Includes:** All cancellations regardless of timing
- **Purpose:** Track cancellation trends

**6. Total Appointments**
- **Calculation:** Count of all appointments in date range
- **Includes:** All statuses (booked, completed, cancelled, no_show)
- **Purpose:** Denominator for cancellation rate

**7. Cancellation Rate**
- **Calculation:** `(cancelled_count / total_count) * 100`
- **Format:** Percentage with 1 decimal place
- **Interpretation:** Higher rate indicates potential issues (scheduling, no-shows, etc.)

**Status Inclusion Rules:**

| Status | Total Revenue | Services Revenue | Tips | Completed Count | Cancelled Count | Total Count | Cancellation Rate |
|--------|---------------|------------------|------|-----------------|-----------------|-------------|-------------------|
| completed | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | Denominator |
| booked | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Denominator |
| cancelled | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Numerator & Denominator |
| no_show | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Denominator |

---

### Booking Source Analysis

**Purpose:** Track where appointments originate to measure marketing effectiveness and booking channel performance.

**Source Values:**

1. **`owner`** - Created by owner
   - Manual bookings by shop owner
   - Walk-ins entered by owner
   - Phone bookings entered by owner
   - Badge Color: Blue (#e3f2fd text, #1565c0 background)

2. **`barber`** - Created by barber
   - Bookings made by barber for their clients
   - Personal referrals and requests
   - Badge Color: Purple (#f3e5f5 text, #6a1b9a background)

3. **`client_web`** - Online bookings
   - Self-service bookings via client website
   - Public booking flow at `/client/book`
   - Badge Color: Green (#e8f5e9 text, #2e7d32 background)

4. **`walk_in`** - Walk-in appointments
   - Clients who walked in without prior booking
   - Immediate service requests
   - Badge Color: Orange (#fff3e0 text, #e65100 background)

5. **`null` or `unknown`** - Legacy/undefined
   - Appointments created before source tracking was implemented
   - Default value for migration backfill
   - Badge Color: Gray (#f5f5f5 text, #666 background)

**Breakdown Metrics:**

For each source, the dashboard shows:
- **Appointments:** Count of completed appointments
- **Revenue:** Sum of services_total
- **Tips:** Sum of tip_amount
- **Percentage:** (appointments from this source / total appointments) * 100

**Use Cases:**

- **Online Effectiveness:** Track `client_web` percentage to measure online booking adoption
- **Barber Contribution:** See which barbers drive their own bookings
- **Marketing ROI:** Correlate marketing campaigns with source changes
- **Walk-In Tracking:** Monitor spontaneous traffic vs scheduled appointments

---

### Barber Performance Breakdown

**Purpose:** Analyze individual barber productivity, revenue generation, and commission earnings.

**Metrics per Barber:**

1. **Completed Appointments:** Count of appointments with `status = 'completed'` for that barber
2. **Revenue:** Sum of `services_total` (excludes tips and product sales)
3. **Tips:** Sum of `tip_amount`
4. **Avg Ticket:** `revenue / completed_appointments` (average service revenue per appointment)

**Calculations:**

```typescript
const barberMap = new Map<string, BarberBreakdown>();

completedAppointments.forEach(apt => {
  const barberName = apt.barber?.name || 'Unassigned';
  const existing = barberMap.get(barberName) || {
    barber: barberName,
    appointments: 0,
    revenue: 0,
    tips: 0,
    avgTicket: 0,
  };

  existing.appointments += 1;
  existing.revenue += Number(apt.services_total || 0);
  existing.tips += Number(apt.tip_amount || 0);

  barberMap.set(barberName, existing);
});

barbers.forEach(b => {
  b.avgTicket = b.appointments > 0 ? b.revenue / b.appointments : 0;
});
```

**CSV Export:**

- Filename format: `barber-breakdown-YYYY-MM-DD.csv`
- Columns: Barber, Appointments, Revenue, Tips, Avg Ticket
- Currency values formatted with $ prefix
- Numbers formatted with 2 decimal places

**Use Cases:**

- **Performance Reviews:** Compare barber productivity
- **Commission Verification:** Cross-check revenue calculations
- **Scheduling Optimization:** Identify high-demand barbers
- **Training Needs:** Spot low-performing barbers

---

### Service & Category Performance

**Purpose:** Identify most popular services and revenue-generating categories.

**Grouping Logic:**

Services are grouped by the `services.category` field. If category is null or empty, service is grouped under "Other" / "Otro".

**Metrics per Service/Category:**

1. **Completed:** Count of completed appointments using that service
2. **Revenue:** Sum of `services_total` for that service
3. **Avg Price:** `revenue / completed` (average price per service instance)

**Use Cases:**

- **Menu Optimization:** Identify underperforming services to remove
- **Pricing Strategy:** Compare avg price to base price (upsells, add-ons)
- **Marketing Focus:** Promote high-margin services
- **Barber Training:** Focus training on popular services

---

### Product Sales Summary

**Purpose:** Track retail product sales during appointments for inventory and revenue analysis.

**Data Source:**

Products sold are retrieved via `appointment_products` table:

```typescript
supabase
  .from('appointment_products')
  .select('product_id, quantity, unit_price')
  .in('appointment_id', completedAppointmentIds)
```

**Summary Cards:**

1. **Products Sold:** Total quantity across all products
2. **Product Revenue:** Sum of `quantity * unit_price`
3. **Avg Per Sale:** `product_revenue / appointments_with_products`

**Detailed Breakdown Table:**

Columns:
- **Product:** Bilingual product name (`name_en` / `name_es`)
- **Quantity:** Total units sold
- **Price:** Unit price at time of sale
- **Total:** `quantity * price`

**CSV Export:**

- Filename format: `product-sales-YYYY-MM-DD.csv`
- Columns: Product, Quantity, Price, Total
- Currency values formatted with $ prefix

**Use Cases:**

- **Inventory Planning:** Stock high-selling products
- **Cross-Sell Opportunities:** Identify which services lead to product sales
- **Revenue Diversification:** Track non-service revenue
- **Commission Calculations:** Future feature for product commissions

---

### Empty States & Error Handling

**No Data Scenarios:**

1. **No Appointments in Range:**
   - Shows friendly message: "No data available for the selected date range"
   - Bilingual: "No hay datos disponibles para el rango de fechas seleccionado"
   - All KPI cards show $0.00 or 0
   - Tables show empty state message

2. **No Products Sold:**
   - Product sales section shows: "No products sold in this period"
   - Summary cards show 0 for all metrics

3. **No Completed Appointments:**
   - Revenue metrics show $0.00
   - Cancellation rate may still be calculated if there are cancellations

**Error Handling:**

- Query failures are caught and logged to console
- User sees generic error message: "Failed to load analytics data"
- Bilingual error messages
- Refresh button to retry
- No crashes or white screens

---

### CSV Export Functionality

**Purpose:** Allow owners to export data for external analysis, accounting software, or record-keeping.

**Implementation:**

Uses shared utility: `src/lib/csvExport.ts`

**Export Function:**

```typescript
export function exportToCSV(
  data: any[],
  filename: string,
  headers: Record<string, string>
)
```

**CSV Features:**

- Proper escaping of commas, quotes, newlines
- UTF-8 encoding for bilingual content
- Auto-generated filename with current date
- Browser download prompt (no server upload)

**Available Exports:**

1. **Barber Breakdown:**
   - Button: "Export CSV" in barber section
   - Fields: Barber, Appointments, Revenue, Tips, Avg Ticket

2. **Product Sales:**
   - Button: "Export CSV" in product section
   - Fields: Product, Quantity, Price, Total

**Future Exports:**

- Complete appointment log with all fields
- Source breakdown with detailed metrics
- Service performance with category groupings
- Monthly summary report (all KPIs)

---

### Performance Considerations

**Optimization Strategies:**

1. **Single Query per Table:**
   - All appointments fetched once, filtered in memory
   - Products fetched once and joined client-side
   - Services fetched once for category lookups

2. **Efficient Aggregations:**
   - JavaScript `reduce()` and `Map()` for grouping
   - No N+1 queries
   - Client-side calculations minimize database load

3. **Date Range Limits:**
   - Queries explicitly filter by date range
   - Uses indexed `scheduled_start` column
   - Prevents full table scans

**Potential Bottlenecks:**

- Large date ranges (1+ year) may slow down on high-volume shops
- Product joins can be expensive if many products per appointment
- Future optimization: Server-side aggregation via Postgres functions or views

---

### Bilingual Support

**All analytics labels are bilingual (EN/ES):**

**Date Presets:**
- Today / Hoy
- Last 7 Days / Últimos 7 Días
- Last 30 Days / Últimos 30 Días
- This Month / Este Mes
- Custom / Personalizado

**KPI Labels:**
- Total Revenue / Ingresos Totales
- Services Revenue / Ingresos por Servicios
- Total Tips / Propinas Totales
- Completed Appointments / Citas Completadas
- Cancelled Appointments / Citas Canceladas
- Total Appointments / Total de Citas
- Cancellation Rate / Tasa de Cancelación

**Section Headers:**
- By Booking Source / Por Fuente de Reserva
- By Barber / Por Barbero
- By Service/Category / Por Servicio/Categoría
- Product Sales / Ventas de Productos

**Table Headers:**
- Appointments / Citas
- Revenue / Ingresos
- Tips / Propinas
- Avg Ticket / Ticket Promedio
- Completed / Completados
- Quantity / Cantidad
- Price / Precio
- Total / Total

---

### Known Limitations

1. **No Real-Time Updates:**
   - Dashboard does not auto-refresh
   - User must manually change date range to see new data

2. **Product Commissions Not Shown:**
   - Currently only service commissions are calculated
   - Product commissions planned for Phase 7

3. **No Trend Visualization:**
   - Data shown in tables, no charts or graphs
   - Future: Add Chart.js or similar for visual trends

4. **Limited Historical Analysis:**
   - No year-over-year comparison
   - No month-over-month growth metrics

5. **Single Shop Only:**
   - No multi-location support
   - All data from single `shop_config` instance

6. **No Scheduled Reports:**
   - No email delivery of weekly/monthly summaries
   - Manual export only

---

### Future Enhancements

**Planned Features:**

1. **Visual Charts:**
   - Line chart for revenue over time
   - Bar chart for barber comparison
   - Pie chart for source distribution

2. **Advanced Filters:**
   - Filter by specific barber
   - Filter by service category
   - Filter by booking source
   - Combine multiple filters

3. **Comparative Analysis:**
   - Year-over-year comparison
   - Month-over-month growth
   - Week-over-week trends

4. **Automated Reports:**
   - Email weekly summary to owner
   - SMS alerts for milestone achievements
   - PDF export for accounting

5. **Product Commission Tracking:**
   - Show product commissions in barber breakdown
   - Track due_to_barber for products
   - Separate service vs product earnings

6. **Client Analytics:**
   - New vs returning client ratio
   - Client lifetime value
   - Churn rate and retention metrics

7. **Predictive Insights:**
   - Revenue forecasting
   - Busy hour predictions
   - Staffing recommendations

---

### Testing Checklist

**Analytics Dashboard:**
- [ ] Date presets load correct ranges
- [ ] Custom date picker enforces valid ranges
- [ ] All KPIs calculate correctly
- [ ] Source breakdown adds to 100%
- [ ] Barber breakdown includes all barbers with appointments
- [ ] Service breakdown groups by category
- [ ] Product sales matches appointment_products table
- [ ] CSV exports download successfully
- [ ] CSV files open correctly in Excel/Sheets
- [ ] Empty states display when no data
- [ ] Error states show friendly messages
- [ ] Bilingual labels work (EN/ES)
- [ ] Currency formats correctly ($0.00)
- [ ] Percentages show 1 decimal place
- [ ] Date labels format correctly
- [ ] Page loads without errors
- [ ] Build passes with no TypeScript errors

**Integration:**
- [ ] Completed appointments from all sources appear in analytics
- [ ] Source badges match appointment.source values
- [ ] Revenue calculations match PaymentModal totals
- [ ] Commission fields populated correctly
- [ ] Product sales tracked when products added to appointments
- [ ] Cancelled appointments excluded from revenue
- [ ] Booked appointments excluded from revenue
- [ ] No_show appointments excluded from revenue

---

## Client Communication & Self-Service

This section documents the automated communication system and client self-service portal implemented to reduce no-shows and empower clients to manage their own appointments.

### Overview

**Purpose:** Automate appointment confirmations and reminders, and provide a secure self-service portal where clients can view appointments without staff intervention.

**Key Features:**
- Automatic SMS confirmations when appointments are booked
- Scheduled SMS reminders 24 hours before appointments (configurable)
- Secure OTP-based client authentication
- Client portal for viewing upcoming and past appointments
- Owner visibility into notification history and status

### Appointment Confirmations

**When Sent:**
- Client books online via `/client/book`
- Owner creates/reschedules appointment (future enhancement)

**Implementation:** `src/lib/notificationHelper.ts` + `ClientBook.tsx`

**Message Templates:**

English: `{ShopName}: Your appointment is scheduled for {Date} at {Time} with {Barber}. Service: {Service}.`

Spanish: `{ShopName}: Su cita está reservada para {Date} a las {Time} con {Barber}. Servicio: {Service}.`

**Configuration:** `shop_config.enable_confirmations` (default: true)

**Error Handling:** Booking succeeds even if SMS fails. Failures logged to `client_messages` table.

### Appointment Reminders

**Timing:** 24 hours before appointment (configurable via `shop_config.reminder_hours_before`)

**Edge Function:** `send-reminders`

**How It Works:**
1. Queries appointments in 24-hour window
2. Filters `status = 'booked'` only
3. Checks `appointment_reminders_sent` to prevent duplicates
4. Sends SMS and records in tracking table

**Invocation:** Currently manual. Future: cron job or scheduled trigger.

```bash
curl -X POST {SUPABASE_URL}/functions/v1/send-reminders \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}"
```

**Configuration:**
- `shop_config.enable_reminders` (boolean, default: true)
- `shop_config.reminder_hours_before` (integer, default: 24)

### Client Self-Service Portal

**Route:** `/client/appointments`

**Access:** Public with OTP verification

#### OTP Verification Flow

**Step 1: Phone Entry**
Client enters phone number.

**Step 2: OTP Request**
- Edge function `client-otp?action=request` generates 6-digit code
- Code stored in `otp_verification` table (10-minute expiry)
- SMS sent to client
- Rate limit: 3 requests per phone per 5 minutes

**Step 3: Code Verification**
- Edge function `client-otp?action=verify` validates code
- Marks code as used (`verified_at`)
- Returns session token
- Max 5 verification attempts per code

#### Appointments View

After verification, client sees:

**Upcoming Appointments:**
- `status = 'booked'` and `scheduled_start >= now()`
- Shows: service, date/time, barber, status badge
- Future: Cancel/Reschedule buttons (planned)

**Past Appointments:**
- `scheduled_start < now()` or completed/cancelled status
- Read-only display

**Security:**
- Appointments filtered by phone number only
- No cross-client data exposure
- Session token stored in component state (no persistence)

### Notification Tracking

**Table:** `client_messages`

**Fields:**
- `appointment_id` - Links to appointment
- `notification_type` - confirmation, reminder, cancellation, reschedule, otp
- `status` - sent, disabled, error
- `error_message` - Failure details
- `created_at` - Timestamp

**Owner Visibility:**

AppointmentDetail page loads recent notifications:
```typescript
const { data: notifications } = await supabase
  .from('client_messages')
  .select('notification_type, status, created_at')
  .eq('appointment_id', appointmentId)
  .order('created_at', { ascending: false })
  .limit(5);
```

Displays notification type, status, and timestamp. Future: dashboard with success rates and error analytics.

### Edge Functions

**1. send-notification**
- Sends system-generated SMS (confirmations, reminders, cancellations)
- No authentication required (uses service role internally)
- Logs to `client_messages` table

**2. client-otp**
- `?action=request` - Generate and send OTP
- `?action=verify` - Validate OTP code
- Public endpoints with rate limiting

**3. send-reminders**
- Batch sends reminders for upcoming appointments
- Service role authentication required
- Idempotent (prevents duplicates)

### Database Schema

**New Tables:**

**otp_verification:**
- Stores verification codes for client portal
- Fields: phone_number, code, expires_at, attempts, verified_at
- Indexed by phone and expiry

**appointment_reminders_sent:**
- Tracks sent reminders (idempotency)
- Unique constraint on (appointment_id, reminder_type)

**Extended Tables:**

**client_messages:** Added `appointment_id` and `notification_type`

**shop_config:** Added `reminder_hours_before`, `enable_confirmations`, `enable_reminders`

### Operational Playbook

**SMS Not Sending:**
1. Check environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, SMS_ENABLED
2. Check `shop_config.enable_confirmations` and `enable_reminders`
3. Verify Twilio account status and balance
4. Review `client_messages` table for error_message details

**Client Didn't Receive Reminder:**
1. Query `client_messages` for appointment_id and notification_type='reminder'
2. Check status (sent/error/disabled)
3. Verify phone number in clients table
4. Check reminder timing vs scheduled_start
5. Manual resend via `/owner/engage` if needed

**Disable Reminders Temporarily:**
```sql
UPDATE shop_config SET enable_reminders = false;
```

**Client Can't Access Portal:**
1. Check OTP SMS in `client_messages` (notification_type='otp')
2. Verify code not expired (10-minute window)
3. Check rate limiting (max 3 requests per 5 minutes)
4. Manual code lookup for phone support if needed

**Cleanup Old OTP Codes:**
```sql
SELECT cleanup_expired_otp_codes();
```
Run daily (deletes codes >24 hours old).

### Testing Checklist

**Confirmations:**
- [ ] Book via /client/book - SMS sent
- [ ] Verify SMS received
- [ ] Test EN/ES templates
- [ ] Test with SMS disabled

**Reminders:**
- [ ] Create appointment 23-25 hours ahead
- [ ] Run send-reminders function
- [ ] Verify SMS sent and recorded
- [ ] Verify idempotency (no duplicates)
- [ ] Test EN/ES templates

**Client Portal:**
- [ ] Request OTP - SMS received
- [ ] Verify with correct code - shows appointments
- [ ] Verify with incorrect code - error shown
- [ ] Test rate limiting
- [ ] Test code expiry
- [ ] View upcoming/past appointments
- [ ] Test bilingual display
- [ ] Sign out functionality

**Owner Tracking:**
- [ ] View notification history in AppointmentDetail
- [ ] Verify status indicators

**Regression:**
- [ ] Existing booking flows work
- [ ] Owner/barber views unchanged
- [ ] Analytics unchanged

---

**End of Architecture Document**
