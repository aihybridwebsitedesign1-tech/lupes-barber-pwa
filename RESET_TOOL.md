# Data Reset Tool Documentation

## Overview

The Data Reset Tool provides safe, granular control over test and transactional data cleanup in Lupe's Barber Shop management system. This tool is designed for pre-launch testing scenarios and allows you to selectively remove test data or perform a complete reset while preserving all core configuration.

## Access

**Location:** Owner Settings → Data Tools Tab

**Required Role:** OWNER

**Security:** All operations are logged to `reset_actions_history` audit table and require confirmation with type-to-confirm modal.

## Reset Options

### 1. Reset Test Appointments Only

**What it does:**
- Deletes all appointments where `is_test = true`
- Cascades to related transformation photos
- Cancels scheduled reminders for deleted appointments

**What it DOES NOT delete:**
- Payouts
- Time tracking entries
- Real (non-test) appointments
- Any core configuration

**Use case:** Clean up test bookings created during system testing while keeping all other data intact.

**Database Operations:**
```sql
DELETE FROM appointments WHERE is_test = true;
-- CASCADE handles transformation_photos and booking_reminders_scheduled
```

---

### 2. Reset Test Payouts Only

**What it does:**
- Identifies payouts that contain ONLY test appointment items
- Deletes those payouts and their payout_items
- Unmarks `commission_paid` flags on affected appointments and transactions
- Allows items to be recalculated in future payouts

**What it DOES NOT delete:**
- Payouts with ANY real (non-test) appointment items
- Appointments themselves
- Barber commission rate settings

**Use case:** Remove test payout records while preserving the ability to recalculate commissions from unpaid test items.

**Database Operations:**
```sql
-- Find payouts with only test appointments
SELECT ARRAY_AGG(DISTINCT p.id) FROM payouts p
WHERE NOT EXISTS (
  SELECT 1 FROM payout_items pi
  LEFT JOIN appointments a ON pi.appointment_id = a.id
  WHERE pi.payout_id = p.id
  AND (a.id IS NULL OR a.is_test = false)
);

-- Unmark commission_paid
UPDATE appointments
SET commission_paid = false, payout_id = NULL
WHERE payout_id IN (...);

-- Delete items and payouts
DELETE FROM payout_items WHERE payout_id IN (...);
DELETE FROM payouts WHERE id IN (...);
```

---

### 3. Reset Time Tracking History

**What it does:**
- Deletes ALL entries from `time_tracking_entries` table
- Removes all clock-in/clock-out history

**What it DOES NOT delete:**
- Barber profiles
- Commission settings
- Appointments
- Any other data

**Use case:** Clear time tracking test data before go-live without affecting other systems.

**Database Operations:**
```sql
DELETE FROM time_tracking_entries;
```

---

### 4. Full Reset (Recommended Before Go-Live)

**What it does:**
- Deletes ALL appointments (test and real)
- Deletes ALL payouts and payout items
- Deletes ALL time tracking entries
- Deletes ALL transformation photos
- Deletes ALL scheduled reminders
- Deletes ALL inventory transactions
- Deletes ALL client messages

**What it DOES NOT delete:**
- Barbers (users with role='BARBER')
- Services
- Products
- Shop configuration (`shop_config` table)
- Business hours
- User accounts and permissions
- Any settings or configuration

**Use case:** Complete system reset before launching to remove ALL test and demo data while keeping your shop fully configured.

**Database Operations:**
```sql
DELETE FROM booking_reminders_scheduled;
DELETE FROM transformation_photos;
DELETE FROM payout_items;
DELETE FROM payouts;
DELETE FROM inventory_transactions;
DELETE FROM client_messages;
DELETE FROM appointments;
DELETE FROM time_tracking_entries;
```

---

## Safety Features

### 1. Type-to-Confirm Modal

All reset operations require the user to type `RESET` in uppercase to confirm the action. This prevents accidental data loss.

**Implementation:**
- Modal displays operation title, description, and critical warning
- Input field requires exact match of "RESET" string
- Confirm button only enabled when text matches
- Cannot be bypassed with Enter key without typing

### 2. SECURITY DEFINER Functions

All reset operations run as PostgreSQL `SECURITY DEFINER` functions, meaning:
- They bypass RLS policies to ensure complete deletion
- They verify the caller's role is 'OWNER' before executing
- They prevent permission issues during cascading deletes
- They maintain referential integrity automatically

### 3. Audit Logging

Every reset operation is logged to `reset_actions_history` with:

```typescript
{
  id: UUID,
  owner_id: UUID,               // Who performed the reset
  action_type: string,          // Which reset was performed
  details: {                    // What was deleted
    appointments_deleted: number,
    payouts_deleted: number,
    ...
  },
  created_at: timestamp
}
```

**Audit Table Schema:**
```sql
CREATE TABLE reset_actions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'reset_test_appointments',
    'reset_test_payouts',
    'reset_time_tracking',
    'reset_all_non_core_data'
  )),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Access:**
- Only OWNER role can read audit logs
- Logs are append-only (no updates or deletes allowed via RLS)
- Provides full accountability trail

### 4. Loading States

All buttons show:
- Disabled state during operation
- "Processing..." text
- Prevent double-clicks
- Cannot close modal during execution

### 5. Success/Error Feedback

After each operation:
- **Success:** Green banner with detailed count of deleted items
- **Error:** Red banner with specific error message
- Results formatted in user's selected language (EN/ES)

---

## User Interface

### Data Tools Tab

**Layout:**
- Yellow warning banner explaining the tools
- 4 reset cards in vertical stack
- Each card contains:
  - Title with numbering
  - Description of what will be deleted
  - Red action button

**Card Styling:**
- Cards 1-3: White background with gray border
- Card 4 (Full Reset): Red background with dark red border
- Buttons use red color scheme to indicate danger
- Full Reset button uses darker red (#991b1b) and bolder font

**Information Panel:**
- Blue info box at bottom
- Lists what is NOT deleted
- Reassures users that core config is safe

---

## Technical Architecture

### RPC Functions

All reset functions follow the same pattern:

```typescript
CREATE OR REPLACE FUNCTION reset_[type]()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_count INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Verify caller is owner
  SELECT id INTO v_owner_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'OWNER';

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only owners can perform reset operations'
    );
  END IF;

  -- 2. Count items to be deleted
  SELECT COUNT(*) INTO v_count FROM [table];

  -- 3. Perform deletion
  DELETE FROM [table] WHERE [conditions];

  -- 4. Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (v_owner_id, '[action_type]', jsonb_build_object(...));

  -- 5. Return success with counts
  RETURN jsonb_build_object('success', true, '[items]_deleted', v_count);
END;
$$;
```

### Frontend Integration

**React Component Structure:**
```
OwnerSettings.tsx
├── State Management
│   ├── resetType (which operation)
│   ├── showResetModal (modal visibility)
│   └── resetting (loading state)
├── Handler Functions
│   ├── openResetModal()
│   ├── handleResetData()
│   └── getResetModalContent()
└── UI Components
    ├── Data Tools Tab Rendering
    └── ConfirmResetModal

ConfirmResetModal.tsx
├── Type-to-confirm input
├── Loading states
└── Confirmation button
```

**Data Flow:**
1. User clicks reset button → `openResetModal(type)`
2. Modal opens with type-specific content → `getResetModalContent()`
3. User types "RESET" → Input validation
4. User clicks confirm → `handleResetData()`
5. Function calls RPC via Supabase → `resetTools.ts`
6. Result returned → Display success/error
7. Modal closes → State reset

---

## Testing

### Test Scenarios

#### 1. Test Appointment Reset
1. Create test appointments with `is_test = true`
2. Add transformation photos to test appointments
3. Schedule reminders for test appointments
4. Run "Reset Test Appointments"
5. Verify:
   - Test appointments deleted
   - Transformation photos deleted
   - Reminders cancelled
   - Real appointments untouched

#### 2. Test Payout Reset
1. Create test appointments with commissions
2. Record payout for test appointments only
3. Run "Reset Test Payouts"
4. Verify:
   - Test payouts deleted
   - `commission_paid` flags reset to false
   - Payouts with real data NOT deleted

#### 3. Time Tracking Reset
1. Clock in/out multiple barbers
2. Verify time tracking entries exist
3. Run "Reset Time Tracking"
4. Verify:
   - All time tracking entries deleted
   - Barber profiles intact
   - No other data affected

#### 4. Full Reset
1. Populate system with all data types
2. Run "Full Reset"
3. Verify:
   - All transactional data deleted
   - Barbers still exist with correct commission rates
   - Services still exist with prices
   - Products still exist
   - Shop config unchanged
   - Can immediately start using system

### SQL Verification Queries

```sql
-- Verify test appointments deleted
SELECT COUNT(*) FROM appointments WHERE is_test = true;
-- Should return 0

-- Verify payouts cleaned up
SELECT COUNT(*) FROM payouts
WHERE id IN (
  SELECT payout_id FROM payout_items
  WHERE appointment_id IN (
    SELECT id FROM appointments WHERE is_test = true
  )
);
-- Should return 0

-- Verify time tracking cleared
SELECT COUNT(*) FROM time_tracking_entries;
-- Should return 0 after time tracking reset

-- Verify core data intact
SELECT COUNT(*) FROM users WHERE role = 'BARBER';
SELECT COUNT(*) FROM services;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM shop_config;
-- Should all return expected counts (not 0)

-- Check audit log
SELECT * FROM reset_actions_history ORDER BY created_at DESC;
-- Should show log entry for each reset performed
```

---

## Best Practices

### When to Use Each Reset

| Reset Type | Use When | Don't Use If |
|-----------|----------|--------------|
| Test Appointments | Testing booking flow | You have real client appointments |
| Test Payouts | Testing commission system | You've paid real barbers |
| Time Tracking | Testing attendance | You need historical time data |
| Full Reset | Before go-live ONLY | You're already serving clients |

### Pre-Launch Checklist

Before using Full Reset:

1. [ ] Export data if needed (CSV exports from each page)
2. [ ] Verify all barbers are configured with correct commission rates
3. [ ] Verify all services are priced correctly
4. [ ] Verify shop hours are set correctly
5. [ ] Verify shop config (tax rates, fees, etc.)
6. [ ] Take a database backup (if possible)
7. [ ] Confirm with all stakeholders
8. [ ] Run Full Reset
9. [ ] Verify all core data remains
10. [ ] Test one real booking to confirm system works

### Recovery

**If you reset by mistake:**

There is NO undo function. However:

1. **Check audit log** in `reset_actions_history` to see what was deleted
2. **Restore from backup** if you have one
3. **Re-enter data** if the deletion was small
4. **Contact support** if critical data was lost

**Prevention:**
- Always double-check before confirming
- Read the warning messages carefully
- Type "RESET" deliberately, not automatically
- Use selective resets (1-3) instead of Full Reset when possible

---

## API Reference

### TypeScript Functions

```typescript
// src/lib/resetTools.ts

type ResetResult = {
  success: boolean;
  error?: string;
  [key: string]: any;  // Deleted item counts
};

resetTestAppointments(): Promise<ResetResult>
resetTestPayouts(): Promise<ResetResult>
resetTimeTracking(): Promise<ResetResult>
resetAllNonCoreData(): Promise<ResetResult>

formatResetResult(result: ResetResult, language: 'en' | 'es'): string
```

### Supabase RPC Endpoints

```typescript
// Call via Supabase client
const { data, error } = await supabase.rpc('reset_test_appointments');
const { data, error } = await supabase.rpc('reset_test_payouts');
const { data, error } = await supabase.rpc('reset_time_tracking');
const { data, error } = await supabase.rpc('reset_all_non_core_data');
```

**Response Format:**
```json
{
  "success": true,
  "appointments_deleted": 25,
  "payouts_deleted": 3,
  "payout_items_deleted": 8,
  ...
}
```

**Error Format:**
```json
{
  "success": false,
  "error": "Unauthorized: Only owners can perform reset operations"
}
```

---

## Troubleshooting

### Common Issues

**Problem:** "Failed to reset data" error

**Solutions:**
1. Verify you're logged in as OWNER role
2. Check network connection
3. Check browser console for specific error
4. Verify database permissions are correct

---

**Problem:** Reset appears to complete but data still exists

**Solutions:**
1. Refresh the page to see updated data
2. Check if you selected the correct reset type
3. Verify the data you're looking at matches what should be deleted
4. Check audit log to confirm operation ran

---

**Problem:** "Unauthorized" error even though I'm the owner

**Solutions:**
1. Log out and log back in
2. Verify `users.role = 'OWNER'` in database
3. Check that RLS policies allow your user ID
4. Verify `auth.uid()` returns your user ID

---

**Problem:** Cannot close modal during reset

**Solution:**
- This is intentional to prevent interrupting the operation
- Wait for operation to complete
- If stuck for >30 seconds, refresh page and check if operation completed

---

## Performance Considerations

**Expected Duration:**

| Reset Type | Typical Records | Expected Time |
|-----------|----------------|---------------|
| Test Appointments | 100 | <1 second |
| Test Payouts | 50 | <1 second |
| Time Tracking | 1000 | <2 seconds |
| Full Reset | 10,000+ | <5 seconds |

**Large Dataset Notes:**

- Operations run server-side, so no timeout issues
- Cascading deletes are handled automatically
- Indexes ensure fast deletion even with large datasets
- No pagination needed - all deletes in single transaction

---

## Security Model

### Authorization

```typescript
// Pseudocode of authorization check
if (auth.uid() !== owner_user_id) {
  return { success: false, error: 'Unauthorized' };
}

if (user.role !== 'OWNER') {
  return { success: false, error: 'Unauthorized' };
}

// Proceed with deletion
```

### Permissions Matrix

| Role | View Data Tools Tab | Execute Resets | View Audit Log |
|------|-------------------|----------------|----------------|
| OWNER | ✅ | ✅ | ✅ |
| BARBER | ❌ | ❌ | ❌ |
| CLIENT | ❌ | ❌ | ❌ |

### Data Safety

- All operations are transactional (atomic)
- Referential integrity maintained automatically
- CASCADE deletes prevent orphaned records
- Audit log cannot be deleted via UI

---

## Future Enhancements

### Planned Features

1. **Scheduled Resets** - Auto-reset test data on a schedule
2. **Partial Date Range Resets** - Delete data from specific date range only
3. **Preview Before Delete** - Show exactly what will be deleted
4. **Soft Delete Option** - Mark as deleted instead of hard delete
5. **Restore from Audit** - Rebuild deleted data from audit log details
6. **CSV Export Before Reset** - Auto-export before deleting
7. **Email Confirmation** - Send email confirmation after reset
8. **Multi-Step Wizard** - Guide through reset process with checks

---

## Changelog

**Version 2.0 - 2025-12-07**
- Initial release of granular reset tools
- Added 4 reset options
- Added type-to-confirm modal
- Added audit logging system
- Added bilingual support (EN/ES)
- Added comprehensive documentation

---

## Support

For issues or questions about the Data Reset Tool:

1. Check this documentation first
2. Verify you're following best practices
3. Check the audit log for operation history
4. Test in a safe environment first
5. Contact system administrator if problems persist

**Remember:** All reset operations are permanent and cannot be undone. Always proceed with caution and confirm you're resetting the correct data.
