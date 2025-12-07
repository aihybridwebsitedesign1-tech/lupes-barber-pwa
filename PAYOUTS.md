# Commission-Based Payout System

## Overview

The payout system provides automatic, accurate commission calculations for barbers based on configurable rates for services, products, and tips. The system prevents duplicate payments, tracks all transactions with full audit trails, and supports manual overrides when needed.

## Commission Formula

For each barber, the total commission due is calculated as:

```
commission_due =
    (service_revenue × service_commission_rate)
  + (product_revenue × product_commission_rate)
  + (tip_revenue × tip_commission_rate)
```

### Default Commission Rates

- **Services**: 50% (0.5000)
- **Products**: 10% (0.1000)
- **Tips**: 100% (1.0000)

Rates are configurable per barber in the `users` table.

## Database Schema

### Commission Rate Fields (`users` table)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `service_commission_rate` | DECIMAL(5,4) | 0.5000 | Barber's cut of service revenue (50%) |
| `product_commission_rate` | DECIMAL(5,4) | 0.1000 | Barber's cut of product sales (10%) |
| `tip_commission_rate` | DECIMAL(5,4) | 1.0000 | Barber's cut of tips (100%) |

### Commission Tracking Fields

**Appointments Table:**
- `commission_paid` (boolean) - Marks if commission has been paid
- `payout_id` (UUID) - Links to the payout that included this item

**Inventory Transactions Table:**
- `commission_paid` (boolean) - Marks if product sale commission has been paid
- `payout_id` (UUID) - Links to the payout that included this item

### Payouts Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `barber_id` | UUID | FK to users |
| `start_date` | DATE | Period start (inclusive) |
| `end_date` | DATE | Period end (inclusive) |
| `calculated_amount` | NUMERIC(10,2) | Auto-calculated commission |
| `actual_amount_paid` | NUMERIC(10,2) | Actual amount paid to barber |
| `override_flag` | BOOLEAN | True if amounts differ |
| `override_note` | TEXT | Required explanation when overriding |
| `payment_method` | TEXT | Cash, Check, or Direct Deposit |
| `date_paid` | DATE | Date payout was recorded |
| `calculation_breakdown` | JSONB | Detailed breakdown of commission sources |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Constraints:**
- `override_note` is REQUIRED when `override_flag` is true
- Prevents creating payout with override without explanation

### Payout Items Table

Links individual commission items to payouts for detailed audit trails.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `payout_id` | UUID | FK to payouts |
| `appointment_id` | UUID | FK to appointments (for services/tips) |
| `inventory_transaction_id` | UUID | FK to inventory_transactions (for products) |
| `item_type` | TEXT | 'service', 'product', or 'tip' |
| `revenue_amount` | NUMERIC(10,2) | Base revenue before commission |
| `commission_rate` | DECIMAL(5,4) | Rate applied to this item |
| `commission_amount` | NUMERIC(10,2) | Commission earned for this item |

**Constraints:**
- Must have exactly ONE of: `appointment_id` OR `inventory_transaction_id`
- `item_type` must be 'service', 'product', or 'tip'

## Calculation Logic

### Step 1: Identify Unpaid Items

The system queries for:

**Services:**
```sql
SELECT * FROM appointments
WHERE barber_id = ?
  AND status = 'COMPLETED'
  AND commission_paid = false
  AND service_price > 0
```

**Products:**
```sql
SELECT * FROM inventory_transactions
WHERE type = 'sale'
  AND commission_paid = false
  AND appointments.barber_id = ?
```

**Tips:**
```sql
SELECT * FROM appointments
WHERE barber_id = ?
  AND status = 'COMPLETED'
  AND commission_paid = false
  AND tip_amount > 0
```

### Step 2: Apply Commission Rates

For each item category, the commission is calculated:

```
service_commission = Σ(service_price × service_commission_rate)
product_commission = Σ(product_price × quantity × product_commission_rate)
tip_commission = Σ(tip_amount × tip_commission_rate)
```

### Step 3: Sum Total Commission

```
total_commission = service_commission + product_commission + tip_commission
```

**Currency-Safe Rounding:**
- All intermediate calculations use millisecond precision
- Final amounts rounded to 2 decimal places
- `Math.round(amount * 100) / 100` ensures no floating-point errors

### Step 4: Mark Items as Paid

Upon payout creation, all included items are updated:

```sql
UPDATE appointments
SET commission_paid = true,
    payout_id = ?
WHERE id IN (...)

UPDATE inventory_transactions
SET commission_paid = true,
    payout_id = ?
WHERE id IN (...)
```

## Recording a Payout

### Process Flow

1. **Select Barber** - Click "Record Payout" button for a barber
2. **Choose Date Range** - Defaults to last 30 days
3. **Calculate Commission** - System auto-calculates based on unpaid items
4. **View Breakdown** - Expandable details show:
   - Services count, revenue, rate, commission
   - Products count, revenue, rate, commission
   - Tips count, amount, rate, commission
5. **Enter Actual Amount** - Defaults to calculated amount
6. **Override Detection** - If amount differs:
   - Yellow highlighting appears
   - Override note becomes REQUIRED
   - Shows difference amount
7. **Select Payment Method** - Cash, Check, or Direct Deposit
8. **Submit** - Creates payout record and marks all items as paid

### Overlap Prevention

Before creating a payout, the system checks for overlapping date ranges:

```
Overlap exists if ANY existing payout for same barber has:
  existing.start_date <= new.end_date
  AND existing.end_date >= new.start_date
```

**Error Message:**
"Selected dates overlap an already-paid payout period."

**Force Override** (not currently exposed in UI):
- Can be enabled to allow overlaps
- Only unpaid items in overlapping period are included
- Already-paid items cannot be re-paid

## Owner Dashboard

### Unpaid Commissions Table

Shows real-time balance for each barber:

| Column | Description | Calculation |
|--------|-------------|-------------|
| **Barber** | Barber name | - |
| **Service Rev.** | Unpaid service revenue | Sum of unpaid appointments.service_price |
| **Product Rev.** | Unpaid product revenue | Sum of unpaid product sales |
| **Tip Rev.** | Unpaid tip revenue | Sum of unpaid appointments.tip_amount |
| **Commission Due** | Total owed to barber | Auto-calculated per formula |
| **Total Paid** | Lifetime payments to barber | Sum of all payout.actual_amount_paid |
| **Balance Due** | Current amount owed | Commission Due - Total Paid |

**Visual Cues:**
- Positive balance (green) = Shop owes barber
- Negative balance (red) = Barber owes shop (overpayment)
- Zero balance (gray) = Fully paid

### Recent Payout History

Shows last 50 payouts with:

- **Date Paid** - When payout was recorded
- **Barber** - Who received payment
- **Period** - Date range covered (start - end)
- **Calculated** - Auto-calculated commission amount
- **Actual Paid** - Amount actually paid
- **Method** - Payment method used
- **Status** - Badge showing:
  - "✓ EXACT" (green) - Paid calculated amount
  - "⚠ OVERRIDE +$X" (yellow) - Paid more than calculated
  - "⚠ OVERRIDE -$X" (yellow) - Paid less than calculated

**Hover tooltip on override badge shows the override note**

### CSV Export

**Commission Summary Export** includes:
- Barber name
- Service, Product, Tip revenues
- Commission rates for each category
- Total commission due
- Total paid
- Balance due

**Payout History Export** includes:
- Barber name
- Period start and end dates
- Date paid
- Calculated amount
- Actual amount paid
- Override flag (Yes/No)
- Override note
- Payment method

## Payout Workflow Examples

### Example 1: Standard Payout (No Override)

**Scenario:**
- Barber: John Doe
- Period: Jan 1 - Jan 31
- Services: 20 haircuts × $30 = $600
- Products: 5 products × $15 = $75
- Tips: $120
- Rates: 50% / 10% / 100%

**Calculation:**
```
Service commission: $600 × 0.50 = $300.00
Product commission: $75 × 0.10 = $7.50
Tip commission: $120 × 1.00 = $120.00
Total: $427.50
```

**Recording:**
1. Click "Record Payout" for John Doe
2. Set dates: Jan 1 - Jan 31
3. Click "Calculate Commission"
4. System shows: $427.50
5. Leave actual amount as $427.50
6. Select payment method: Cash
7. Submit → Success

**Result:**
- Payout created with calculated = actual = $427.50
- All 20 appointments marked `commission_paid = true`
- All 5 product sales marked `commission_paid = true`
- 25 payout_items created
- Balance due for John reduced by $427.50

### Example 2: Override Payout (Partial Payment)

**Scenario:**
- Same as Example 1, but owner only has $400 cash available
- Plans to pay remaining $27.50 next week

**Recording:**
1. Click "Record Payout" for John Doe
2. Calculate shows: $427.50
3. Change actual amount to: $400.00
4. System shows yellow highlight: "⚠ Override detected: -$27.50"
5. **Override note required** - Enter: "Partial payment - will pay $27.50 next week"
6. Submit → Success

**Result:**
- Payout created with:
  - calculated_amount = $427.50
  - actual_amount_paid = $400.00
  - override_flag = true
  - override_note = "Partial payment - will pay $27.50 next week"
- All items STILL marked as paid (prevents double-counting)
- Balance due = $27.50 (system tracks the difference)

**Next Week:**
1. Record another payout for $27.50
2. Select empty date range (no new items)
3. Override note: "Remainder from previous period"
4. Balances out

### Example 3: Zero Sales Period

**Scenario:**
- Barber took vacation
- No appointments, no sales

**Recording:**
1. Calculate commission shows: $0.00
2. Can still record payout for $0.00
3. Override note: "No commissions earned this period - vacation"

**Result:**
- Payout record created for audit trail
- Shows barber worked/didn't work

## Balance Due Tracking

The system maintains running balance:

```
balance_due = Σ(unpaid_commissions) - Σ(actual_amounts_paid)
```

### Positive Balance

```
balance_due = $500
```
**Meaning:** Shop owes barber $500

### Zero Balance

```
balance_due = $0
```
**Meaning:** Barber is fully paid

### Negative Balance

```
balance_due = -$100
```
**Meaning:** Barber was overpaid by $100

**Handling Overpayment:**
1. Shows in red on dashboard
2. Next payout can deduct from calculated amount
3. Override note explains the adjustment

## Refund Handling

### Scenario: Appointment Refunded After Payout

1. **Appointment completed** - Jan 15, $50 service + $10 tip
2. **Commission paid** - Jan 31 payout includes this $30 commission
3. **Refund issued** - Feb 5, customer got full refund

**Current Behavior:**
- Appointment status changes to CANCELLED or REFUNDED
- Commission already paid, barber keeps it
- **Recommendation:** Owner should note this in next payout

**Future Enhancement (Not Yet Implemented):**
- Create negative commission entry
- Reduce barber's balance due
- Track in separate `refunds` table

## Edge Cases

### 1. Multiple Payouts in Same Period

**Scenario:**
- Payout 1: Jan 1-15, pays $200
- Payout 2: Jan 10-20, tries to pay again

**Result:** ERROR - Overlap detected

**Solution:**
- Use non-overlapping periods
- Or wait until first period ends before second

### 2. Late-Entered Appointments

**Scenario:**
- Appointment from Jan 10 entered on Feb 5
- Jan 1-31 payout already recorded

**Result:**
- Late appointment stays unpaid (`commission_paid = false`)
- Automatically included in next payout
- Shows in current balance due

### 3. Editing Commission Rates

**Scenario:**
- Barber's service rate changed from 50% to 60%
- Some appointments already completed at 50%

**Result:**
- **Old appointments:** Use rate at time of calculation
- **New appointments:** Use current rate
- Rates are stored in `payout_items` for audit

**Best Practice:**
- Process payout BEFORE changing rates
- Or accept mixed rates in single payout

### 4. Deleted Barber with Unpaid Commission

**Scenario:**
- Barber has $500 unpaid commission
- Barber soft-deleted (`active = false`)

**Result:**
- Does NOT appear in unpaid commissions list
- Commission data still exists in database

**Solution:**
- Pay out before deactivating
- Or query database directly for unpaid items

### 5. Manual Database Edits

**Scenario:**
- Owner marks `commission_paid = true` directly in database
- Without creating payout record

**Result:**
- Items disappear from unpaid list
- No payout history record
- Balance calculations broken

**Solution:** NEVER manually edit `commission_paid` flags

## Security & Permissions

### RLS Policies

**Payouts Table:**
- **Owners:** Full CRUD access to all payouts
- **Barbers:** Read-only access to their own payouts
- **Clients:** No access

**Payout Items Table:**
- **Owners:** Full access
- **Barbers:** Can view items linked to their payouts
- **Clients:** No access

### Audit Trail

Every payout creates:
1. **Payout record** - Who, when, how much, why
2. **Payout items** - Exactly which transactions were paid
3. **Updated timestamps** - Full modification history
4. **Breakdown JSON** - Complete calculation details

**Immutable After Creation:**
- Payouts cannot be edited
- Payouts cannot be deleted (only soft-delete if needed)
- Complete paper trail for accounting

## Testing Scenarios

### Test 1: Basic Payout Flow

1. Create appointment for $100 service + $20 tip
2. Complete appointment
3. Record payout
4. Verify commission = $60 (50% of $100 + 100% of $20)
5. Verify appointment marked `commission_paid = true`

### Test 2: Override Validation

1. Calculate commission = $100
2. Enter actual amount = $90
3. Try to submit without override note → ERROR
4. Add override note → SUCCESS

### Test 3: Overlap Prevention

1. Create payout for Jan 1-15
2. Try payout for Jan 10-20 → ERROR
3. Try payout for Jan 16-31 → SUCCESS

### Test 4: Multiple Item Types

1. Create services, products, tips for same barber
2. Record payout
3. Verify breakdown shows all three categories
4. Verify all items marked paid

### Test 5: Zero Balance

1. Create payout matching exact commission
2. Verify balance due = $0
3. Verify "Record Payout" still available (for future earnings)

## Troubleshooting

### Balance Doesn't Match

**Check:**
1. Are there unpaid items? Query `commission_paid = false`
2. Are there missing payouts? Check payout history
3. Were rates changed mid-period? Check `payout_items` for rates used

**Fix:**
- Run `getBarbersSummary()` to recalculate
- Compare against manual calculation
- Check for manual database edits

### Payout Won't Save

**Common Causes:**
1. **Override without note** - Add explanation
2. **Overlapping dates** - Adjust date range
3. **Invalid date range** - End must be >= start
4. **Negative amount** - Check for valid number

### Items Not Showing in Calculation

**Check:**
1. **Status** - Appointment must be COMPLETED
2. **Commission flag** - Must be `commission_paid = false`
3. **Date range** - Item date must be within range
4. **Barber assignment** - Correct barber_id

### Performance Issues

**Symptoms:**
- Slow calculation
- Timeout errors
- Long load times

**Solutions:**
1. **Check indexes** - Ensure indexes on `commission_paid`, `barber_id`
2. **Limit date range** - Don't query entire history
3. **Optimize queries** - Use JOINs efficiently

## Best Practices

1. **Pay Regularly** - Weekly or bi-weekly payouts keep balances manageable
2. **Consistent Periods** - Use same day ranges (e.g., 1st-15th, 16th-end)
3. **Document Overrides** - Clear, specific notes for any adjustments
4. **Verify Before Paying** - Review breakdown details before submitting
5. **Export Records** - Download CSV for accounting/bookkeeping
6. **Check Negative Balances** - Resolve overpayments promptly
7. **Update Rates Carefully** - Process payouts before rate changes
8. **Backup Data** - Payout records are critical financial data

## Future Enhancements

### Planned Features

1. **Automatic Scheduling** - Auto-create payouts on specific dates
2. **SMS Notifications** - Alert barbers when payout is ready
3. **Direct Deposit Integration** - Auto-transfer to bank accounts
4. **Tax Reporting** - Generate 1099 forms
5. **Refund Credits** - Automatic negative entries for refunds
6. **Barber Self-Service** - View own commission breakdown
7. **Bonus/Penalty System** - Add/subtract amounts with rules
8. **Multi-Currency** - Support for international locations

---

**System Version:** 2.0
**Last Updated:** 2025-12-07
**Maintained By:** Development Team
