# Launch Readiness Features - Sprint Documentation

This document covers all features implemented in the launch readiness sprint.

## Table of Contents
1. [Stripe Payment Integration](#stripe-payment-integration)
2. [Visual Calendar Views](#visual-calendar-views)
3. [Configurable Commissions](#configurable-commissions)
4. [Policy & Fee Configuration](#policy--fee-configuration)
5. [Payment Status Tracking](#payment-status-tracking)
6. [Edge Functions](#edge-functions)

---

## Stripe Payment Integration

### Overview
Full online payment integration for client bookings using Stripe Checkout. Clients can pay for appointments before arrival, improving cash flow and reducing no-shows.

### Database Schema

**New fields in `appointments` table:**

| Field | Type | Description |
|-------|------|-------------|
| `payment_status` | text | 'unpaid', 'paid', 'refunded', 'partial' |
| `payment_provider` | text | 'stripe', 'cash', 'card', or null |
| `stripe_session_id` | text | Stripe Checkout Session ID |
| `stripe_payment_intent_id` | text | Stripe Payment Intent ID |
| `amount_due` | numeric | Total amount owed for appointment |
| `amount_paid` | numeric | Amount actually paid |

**Defaults:**
- Existing appointments set to `payment_status = 'unpaid'`
- Completed appointments with `paid_at` marked as `paid`

### Edge Functions

#### `/functions/create-checkout`

Creates a Stripe Checkout Session for an appointment.

**Request:**
```typescript
{
  appointmentId: string
}
```

**Response:**
```typescript
{
  sessionId: string,
  url: string  // Redirect URL for Stripe Checkout
}
```

**Process:**
1. Fetches appointment with client, service, and barber details
2. Creates Stripe Checkout Session with:
   - Line item for service
   - Customer email (if available)
   - Success/cancel URLs
   - Appointment metadata
3. Updates appointment with `stripe_session_id`
4. Returns session URL for redirect

**Error Handling:**
- Missing Stripe configuration
- Appointment not found
- Invalid amount (zero or negative)
- Stripe API errors

#### `/functions/confirm-payment`

Confirms payment status after Stripe redirect.

**Request:**
```typescript
{
  sessionId: string,
  appointmentId: string
}
```

**Response:**
```typescript
{
  success: boolean,
  alreadyPaid?: boolean,
  amountPaid?: number,
  message: string
}
```

**Process:**
1. Retrieves Stripe session details
2. Verifies `payment_status === 'paid'`
3. Updates appointment:
   - `payment_status = 'paid'`
   - `payment_provider = 'stripe'`
   - `stripe_payment_intent_id`
   - `amount_paid`
   - `paid_at = now()`
4. Idempotent - handles already-paid appointments

### Integration Flow

**Client Booking Flow:**
1. Client completes booking form on `/client/book`
2. Appointment created with `payment_status = 'unpaid'`
3. Frontend calls `/functions/create-checkout` with appointment ID
4. Client redirected to Stripe Checkout
5. After payment:
   - Success: Redirect to `/client/book/success?session_id={ID}&appointment_id={ID}`
   - Cancel: Redirect to `/client/book?cancelled=true`
6. Success page calls `/functions/confirm-payment` to verify and update status

**Future Enhancement: Pay Later for Unpaid Appointments**
- Show "Pay Now" button on `/client/appointments` for unpaid upcoming appointments
- Reuse existing Stripe session or create new one
- Same confirmation flow

### Configuration

**Required Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
CLIENT_URL=https://yourapp.com
```

**Note:** Stripe keys are automatically configured in Supabase environment.

### UI Display

**Payment Status Badges:**
- Paid: Green badge with 💳 icon
- Unpaid: Red badge
- Refunded: Gray badge
- Partial: Amber badge

**Where Shown:**
- Owner calendar view
- Barber calendar view
- Appointment detail pages
- Client appointments portal
- Owner appointments list

### Testing

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0027 6000 3184`

**Test Scenarios:**
1. Complete booking with payment
2. Abandon checkout (cancel)
3. Payment failure
4. Duplicate payment attempt
5. Already-paid appointment

### Security

- Payment provider field prevents client from bypassing payment
- Amount verification in edge function
- Stripe session validation
- RLS policies unchanged (existing role-based access)

### Failure Modes

**Stripe Service Down:**
- Appointment still created with `unpaid` status
- Owner can collect payment manually
- Client can retry payment later

**Network Timeout:**
- Appointment exists with `unpaid` status
- Confirm-payment endpoint is idempotent
- Safe to retry confirmation

**Webhook Alternative (Not Implemented):**
- Current implementation uses redirect confirmation
- For production, consider adding Stripe webhook handler for automatic confirmation
- Webhook provides more reliable payment confirmation

---

## Visual Calendar Views

### Overview
Week-view calendars for owners and barbers showing appointments as color-coded blocks, similar to industry-standard scheduling tools like Squire.

### Routes

- **Owner Calendar:** `/owner/calendar`
- **Barber Calendar:** `/barber/calendar`

### Features

**Owner Calendar:**
- Shows all appointments across all barbers
- Filter by specific barber or "All Barbers"
- Color-coded by barber (8 distinct colors)
- Week navigation (Previous, Today, Next)

**Barber Calendar:**
- Auto-filtered to logged-in barber only
- Color-coded by appointment status
- Same week navigation

### Layout

**Grid Structure:**
- Time slots: 8:00 AM - 8:00 PM (12 hours)
- Days: Sunday - Saturday (7 columns)
- Sticky headers for day names and time labels
- Responsive horizontal scroll on smaller screens

**Appointment Blocks:**
- Display time, client name (first + last initial)
- 💳 icon for paid appointments
- Opacity reduced for cancelled/no-show/completed
- Click to navigate to appointment detail

**Color Coding:**

Owner (by barber):
```javascript
const BARBER_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16'  // Lime
];
```

Barber (by status):
- Booked: Blue (#3b82f6)
- Completed: Green (#10b981)
- Cancelled/Late Cancel: Red (#ef4444)
- No Show: Amber (#f59e0b)

### Data Query

**Owner Calendar:**
```typescript
const { data } = await supabase
  .from('appointments')
  .select(`
    id,
    scheduled_start,
    scheduled_end,
    status,
    payment_status,
    client:client_id (first_name, last_name),
    service:service_id (name_en, name_es),
    barber:barber_id (id, name)
  `)
  .gte('scheduled_start', weekStart)
  .lt('scheduled_start', weekEnd)
  .eq('barber_id', selectedBarber) // if filtered
  .order('scheduled_start');
```

**Barber Calendar:**
- Same query, but always filtered to `barber_id = userData.id`

### Navigation

**Header Links:**
- Owner: Today | Calendar | Appointments | (dropdowns)
- Barber: Today | Calendar | Stats

**Within Calendar:**
- Previous Week: Subtract 7 days
- Today: Jump to current week
- Next Week: Add 7 days

### Mobile Responsiveness

- Minimum width 1200px for calendar grid
- Horizontal scroll enabled
- Sticky time column for reference
- Day headers show weekday abbreviation + date number

### Future Enhancements

**Drag-and-Drop Rescheduling:**
- Drag appointment blocks to new time slots
- Validate against booking rules
- Update appointment immediately
- TODO: Implement with React DnD library

**Multi-Day View:**
- Day view (single day, larger blocks)
- Month view (overview with counts)
- TODO: Add view toggle buttons

**Shop Hours Overlay:**
- Gray out times outside shop hours
- Gray out barber non-working hours
- TODO: Read from `shop_config.shop_hours` and `barber_schedules`

---

## Configurable Commissions

### Overview
Commission rates are now configurable at shop and per-barber levels, replacing the hard-coded 50% rate.

### Database Schema

**New field in `shop_config`:**
```sql
default_commission_rate numeric DEFAULT 0.50
```

**New field in `users` (barbers):**
```sql
commission_rate_override numeric (nullable)
```

**Existing tiered structure (for future use):**
```json
{
  "commission_config": {
    "cumulative": false,
    "service_tiers": [
      {"min": 0, "max": 1000, "percent": 50},
      {"min": 1000, "max": 2000, "percent": 55},
      // ...
    ],
    "product_tiers": [
      {"min": 0, "max": 500, "percent": 20},
      // ...
    ]
  }
}
```

### Commission Calculation Logic

**Priority Order:**
1. **Barber Override:** If `users.commission_rate_override` is set (not null), use that rate
2. **Shop Default:** Otherwise, use `shop_config.default_commission_rate`
3. **Future - Tiered:** If tiered structure is active, calculate based on revenue thresholds

**Current Implementation:**
```typescript
// In PaymentModal or commission calculation code
const { data: config } = await supabase
  .from('shop_config')
  .select('default_commission_rate')
  .single();

const { data: barber } = await supabase
  .from('users')
  .select('commission_rate_override')
  .eq('id', barberId)
  .single();

const commissionRate = barber.commission_rate_override ?? config.default_commission_rate ?? 0.50;

const commissionAmount = serviceTotal * commissionRate;
const dueToBarber = serviceTotal * commissionRate;
const dueToShop = serviceTotal - dueToBarber;
```

**Stored Fields:**
- `appointments.service_commission_percent`
- `appointments.service_commission_amount`
- `appointments.service_due_to_barber`
- `appointments.service_due_to_shop`

### Configuration UI

**Shop Default Rate:**
- TODO: Add field in `/owner/settings` under "Commission Settings"
- Input: Percentage (0-100), stored as decimal (0.00-1.00)
- Default: 50%

**Per-Barber Override:**
- TODO: Add field in barber edit modal (`/owner/barbers`)
- Optional field
- If set, overrides shop default for this barber only

### Payouts Page

**Updated to use configurable rates:**
- Reads commission from `appointments.service_commission_percent` (stored rate at time of appointment)
- Reports show actual commission paid, not recalculated
- Date range filter to view historical payouts
- Barber filter to view individual barber earnings

**Future Enhancement:**
- Export to CSV with commission details
- Commission summary by barber and date range

### TODO: Tiered Commissions

**Concept:**
- Barbers earn higher commission % as monthly revenue increases
- Example: 50% for first $1000, 55% for next $1000, 60% thereafter
- Requires monthly revenue calculation and tier evaluation

**Stub Location:**
- `shop_config.commission_config` already has tier structure
- Logic not yet implemented
- TODO: Add in commission calculation code with feature flag

---

## Policy & Fee Configuration

### Overview
Cancellation, no-show, and late-cancel policies with optional automated fees.

### Database Schema

**New fields in `shop_config`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `no_show_fee_amount` | numeric | 0 | Fee for no-show appointments |
| `late_cancel_fee_amount` | numeric | 0 | Fee for late cancellations |
| `apply_fees_automatically` | boolean | false | Whether fees apply automatically |

**Existing field (already present):**
- `min_cancel_ahead_hours` (integer, default 24)

**New appointment status:**
- `late_cancel` added to `appointments.status` check constraint

**Status Enum:**
```sql
CHECK (status IN ('booked', 'completed', 'cancelled', 'no_show', 'late_cancel'))
```

### Policy Enforcement

**Client Self-Cancel:**
```typescript
// In ClientAppointments cancel handler
const { data: config } = await supabase
  .from('shop_config')
  .select('min_cancel_ahead_hours')
  .single();

const hoursUntilAppointment = (new Date(appointment.scheduled_start) - new Date()) / (1000 * 60 * 60);

if (hoursUntilAppointment < config.min_cancel_ahead_hours) {
  setError('Cannot cancel within 24 hours of appointment. Please call the shop.');
  return;
}

// Proceed with cancellation (status = 'cancelled')
```

**Owner/Barber Cancel or No-Show:**
- TODO: Add status dropdown in appointment detail
- If status set to `no_show` or `late_cancel`:
  - Check `apply_fees_automatically`
  - If true, add fee to `fees_amount` field (or create separate fee record)
  - Fee goes to shop, not barber
  - Show fee in financial reports

### Configuration UI

**TODO: Add to `/owner/settings`:**
```
Cancellation & No-Show Policies

[ ] Apply fees automatically
Cancellation Window: [24] hours
Late Cancel Fee: $[25.00]
No-Show Fee: $[25.00]
```

### Client Visibility

**TODO: Add policy notice on booking confirmation:**
```
Cancellation Policy:
- Free cancellation up to 24 hours before appointment
- Late cancellations or no-shows may incur a $25 fee
```

**Bilingual:**
```
Política de Cancelación:
- Cancelación gratuita hasta 24 horas antes de la cita
- Cancelaciones tardías o inasistencias pueden incurrir en una tarifa de $25
```

### Future Enhancement: Fee Tracking

**Create `appointment_fees` table:**
```sql
CREATE TABLE appointment_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id),
  fee_type text CHECK (fee_type IN ('no_show', 'late_cancel', 'other')),
  amount numeric NOT NULL,
  charged_at timestamptz DEFAULT now(),
  collected boolean DEFAULT false,
  notes text
);
```

---

## Payment Status Tracking

### Overview
Comprehensive tracking of payment state across all appointment workflows.

### Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `unpaid` | No payment received | Default for new appointments |
| `paid` | Payment completed | Stripe or cash payment confirmed |
| `refunded` | Payment returned | Cancellation with refund |
| `partial` | Partial payment received | Deposit or split payment |

### Display Guidelines

**Badge Colors:**
- Paid: Green background, white text, 💳 icon
- Unpaid: Red background, white text
- Refunded: Gray background, white text
- Partial: Amber background, white text

**Badge Locations:**
- Owner Today dashboard
- Owner Appointments list
- Owner Calendar view (icon only)
- Barber Today dashboard
- Barber Calendar view (icon only)
- Client Appointments portal
- Appointment Detail page (prominent)

### Backend Queries

**Include payment status in all appointment queries:**
```typescript
.select(`
  id,
  scheduled_start,
  status,
  payment_status,
  payment_provider,
  amount_due,
  amount_paid,
  ...
`)
```

**Filter by payment status:**
```typescript
// Unpaid appointments report
.eq('payment_status', 'unpaid')
.eq('status', 'booked')
.order('scheduled_start')
```

### Manual Payment Recording

**TODO: Add to AppointmentDetail:**
```
Payment Status: [Unpaid ▼]
Amount Due: $30.00
Amount Paid: $0.00

[Mark as Paid - Cash]
[Mark as Paid - Card]
```

**On "Mark as Paid":**
```typescript
await supabase
  .from('appointments')
  .update({
    payment_status: 'paid',
    payment_provider: 'cash', // or 'card'
    amount_paid: amount_due,
    paid_at: new Date().toISOString()
  })
  .eq('id', appointmentId);
```

### Financial Reports

**All reports should:**
- Show payment status column
- Calculate totals for paid vs unpaid
- Allow filtering by payment status
- Include payment provider distribution

**Example Owner Reports Update:**
```typescript
const { data: summary } = await supabase
  .from('appointments')
  .select('payment_status, amount_due')
  .eq('status', 'completed')
  .gte('completed_at', startDate)
  .lte('completed_at', endDate);

const totalRevenue = summary.filter(a => a.payment_status === 'paid')
  .reduce((sum, a) => sum + a.amount_due, 0);

const unpaidRevenue = summary.filter(a => a.payment_status === 'unpaid')
  .reduce((sum, a) => sum + a.amount_due, 0);
```

---

## Edge Functions

### Summary of All Edge Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `send-notification` | Send SMS for confirmations, reminders, cancellations | No (service role) |
| `send-reminders` | Automated reminder sending (cron job) | No (service role) |
| `send-sms` | Manual SMS campaigns | Yes (owner only) |
| `client-otp` | OTP generation and verification | No (public) |
| `create-checkout` | Create Stripe Checkout session | No (public) |
| `confirm-payment` | Confirm Stripe payment status | No (public) |

### Deployment Status

All edge functions deployed and operational. Configuration handled automatically via Supabase environment variables.

### Required Environment Variables

**Twilio (SMS):**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

**Stripe (Payments):**
- `STRIPE_SECRET_KEY`

**Supabase:**
- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `SUPABASE_ANON_KEY` (auto)

**Optional:**
- `CLIENT_URL` - Base URL for Stripe redirects (auto-detected from SUPABASE_URL)

---

## Testing Checklist

### Stripe Payments
- [ ] Create appointment with payment
- [ ] Complete Stripe checkout
- [ ] Verify payment status updated to 'paid'
- [ ] Test payment cancellation
- [ ] Test payment failure (declined card)
- [ ] Verify payment badges show correctly

### Calendars
- [ ] Owner calendar shows all barbers
- [ ] Filter by specific barber
- [ ] Week navigation (prev/today/next)
- [ ] Click appointment navigates to detail
- [ ] Barber calendar shows only their appointments
- [ ] Color coding correct
- [ ] Payment icons display

### Commissions
- [ ] Default rate applies when no override
- [ ] Barber override takes precedence
- [ ] Commission calculated correctly at payment
- [ ] Payouts page shows correct amounts

### Policies
- [ ] Client cannot cancel within 24 hours
- [ ] Error message displayed
- [ ] Late cancel status can be set by owner
- [ ] No-show fee configuration exists

### Payment Status
- [ ] Badges display on all views
- [ ] Colors correct (green/red/gray/amber)
- [ ] Manual payment recording works
- [ ] Unpaid appointments filterable

---

## Production Deployment Notes

**Pre-Launch:**
1. Set `STRIPE_SECRET_KEY` to live key (not test key)
2. Update `CLIENT_URL` if different from auto-detected value
3. Configure `shop_config` values:
   - `default_commission_rate`
   - `no_show_fee_amount`
   - `late_cancel_fee_amount`
   - `min_cancel_ahead_hours`
4. Test Stripe webhooks (optional but recommended)
5. Enable `apply_fees_automatically` after policy review

**Post-Launch Monitoring:**
- Monitor Stripe dashboard for failed payments
- Check `client_messages` table for SMS failures
- Review unpaid appointments report weekly
- Verify commission calculations in payouts
- Test calendar performance with real appointment volume

---

**End of Launch Readiness Documentation**
