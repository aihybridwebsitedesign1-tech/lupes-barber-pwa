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

**End of Architecture Document**
