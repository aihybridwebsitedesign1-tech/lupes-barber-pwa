# SMS Reminders System Documentation

## Overview

The SMS reminders system automatically sends appointment reminders to clients via SMS at configured intervals before their appointments. The system is production-ready, safe when SMS is not configured, and fully idempotent.

## Architecture

### Components

1. **Database Table: `booking_reminders`**
   - Stores scheduled reminder records for each appointment
   - Tracks reminder status throughout its lifecycle
   - Automatically managed via database triggers

2. **Edge Function: `send-reminders`**
   - Cron job that runs periodically (recommended: every 5 minutes)
   - Processes due reminders and sends SMS notifications
   - Updates reminder status to prevent duplicates

3. **Database Triggers**
   - Automatically schedule reminders when appointments are created
   - Automatically reschedule reminders when appointments are modified
   - Automatically cancel reminders when appointments are cancelled

4. **Notification System**
   - Uses existing `send-notification` edge function
   - Integrates with Twilio for SMS delivery
   - Logs all messages to `client_messages` table

## Database Schema

### `booking_reminders` Table

```sql
CREATE TABLE booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('primary', 'secondary')),
  reminder_offset_hours integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  sent_at timestamptz DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(appointment_id, reminder_type)
);
```

### Status Values

- **`pending`**: Reminder is scheduled and waiting to be sent
- **`sent`**: Reminder was successfully sent via SMS
- **`failed`**: Reminder failed to send (error stored in `error_message`)
- **`skipped`**: Reminder was skipped (e.g., no phone number, SMS not configured)
- **`cancelled`**: Reminder was cancelled (e.g., appointment was cancelled)

### Indexes

- `idx_booking_reminders_due`: Optimized for cron queries (`scheduled_for, status` WHERE `status = 'pending'`)
- `idx_booking_reminders_appointment`: Fast lookups by appointment

## How Reminders Are Scheduled

### Configuration

Reminder timing is controlled by `shop_config` table:

- **`enable_reminders`** (boolean): Master switch for the entire system
- **`reminder_hours_before`** (integer): Primary reminder offset (default: 24 hours)
- **`reminder_hours_before_secondary`** (integer, nullable): Optional second reminder

Example configurations:
- **Single reminder**: `reminder_hours_before = 24`, `reminder_hours_before_secondary = NULL`
- **Dual reminders**: `reminder_hours_before = 24`, `reminder_hours_before_secondary = 2`

### Automatic Scheduling

When an appointment is created or updated:

1. **Database trigger** `trigger_appointments_schedule_reminders` fires automatically
2. Trigger calls `schedule_appointment_reminders(appointment_id, scheduled_start)`
3. Function:
   - Reads shop configuration
   - Calculates reminder times: `scheduled_start - offset_hours`
   - Only schedules reminders that are in the future
   - Uses `INSERT ... ON CONFLICT DO UPDATE` for idempotency
   - Creates primary reminder (if enabled)
   - Creates secondary reminder (if configured)

### Example Timeline

For an appointment at **2:00 PM on Dec 10** with 24h + 2h reminders:

```
Dec 9, 2:00 PM  →  Primary reminder scheduled (24h before)
Dec 10, 12:00 PM → Secondary reminder scheduled (2h before)
Dec 10, 2:00 PM  →  Appointment time
```

## How Reminders Are Sent

### Cron Job: `send-reminders`

**Recommended schedule**: Every 5 minutes

The edge function:

1. Checks if reminders are enabled in `shop_config`
2. Queries for due reminders:
   ```sql
   SELECT * FROM booking_reminders
   WHERE status = 'pending'
   AND scheduled_for <= NOW()
   LIMIT 100
   ```
3. For each reminder:
   - Loads appointment, client, barber, and service details
   - Validates appointment status is still 'booked'
   - Validates client has a phone number
   - Sends SMS via `send-notification` function
   - Updates reminder status to 'sent', 'failed', or 'skipped'
   - Logs to `appointment_reminders_sent` for backwards compatibility

### Idempotency Guarantees

The system prevents duplicate sends via:

1. **Status transitions**: Only `pending` reminders are processed
2. **Atomic updates**: Status is updated in the same transaction as sending
3. **Unique constraints**: One reminder per `(appointment_id, reminder_type)`
4. **Legacy tracking**: Also uses `appointment_reminders_sent` to prevent duplicates

### When SMS Is Not Configured

If Twilio credentials are missing or `SMS_ENABLED != "true"`:

- Reminders are marked as **`skipped`** instead of hanging in `pending`
- Error message: `"SMS not configured (Twilio credentials missing)"`
- The system continues processing other reminders
- No errors are thrown

This ensures the database doesn't accumulate pending reminders that can never be sent.

## Environment Variables

### Required for SMS to Send

These must be set in **Supabase Edge Functions configuration**:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_FROM_NUMBER=+15551234567
SMS_ENABLED=true
```

### Automatically Available

These are pre-configured in Supabase:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### What Happens If Missing

| Variable Missing | Behavior |
|-----------------|----------|
| `TWILIO_ACCOUNT_SID` | Reminders marked as `skipped` |
| `TWILIO_AUTH_TOKEN` | Reminders marked as `skipped` |
| `TWILIO_FROM_NUMBER` | Reminders marked as `skipped` |
| `SMS_ENABLED != "true"` | Reminders marked as `skipped` |
| Any Supabase var | Edge function fails to start |

## Cancellation and Rescheduling

### When Appointment Is Cancelled

The database trigger automatically:
```sql
UPDATE booking_reminders
SET status = 'cancelled', updated_at = now()
WHERE appointment_id = <appointment_id>
AND status = 'pending';
```

Cancelled reminders are never processed by the cron job.

### When Appointment Is Rescheduled

The database trigger automatically:

1. Recalculates reminder times based on new `scheduled_start`
2. Resets reminder status to `pending`
3. Clears `sent_at` and `error_message`
4. Updates `scheduled_for` to new time

This happens via `INSERT ... ON CONFLICT DO UPDATE` in `schedule_appointment_reminders()`.

## Message Format

Reminders are sent in the client's preferred language (English or Spanish):

### English Example
```
Lupe's Barber Shop: Reminder - Your appointment is tomorrow Sun, Dec 10 at 2:00 PM with Carlos Martinez. See you soon! +15551234567
```

### Spanish Example
```
Lupe's Barber Shop: Recordatorio - Su cita es mañana Dom, Dic 10 a las 2:00 PM con Carlos Martinez. ¡Nos vemos pronto! +15551234567
```

Messages include:
- Shop name
- Date and time (localized)
- Barber name
- Shop phone number (if configured)

## Setting Up the Cron Job

### In Production (Supabase)

The `send-reminders` function is already deployed. To schedule it:

**Option 1: Using Supabase Cron (Recommended)**

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Add a new cron job:
   ```sql
   SELECT cron.schedule(
     'send-appointment-reminders',
     '*/5 * * * *',  -- Every 5 minutes
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

**Option 2: External Cron Service**

Use a service like Cron-job.org, GitHub Actions, or similar:

```bash
# Every 5 minutes, make a POST request:
curl -X POST https://your-project.supabase.co/functions/v1/send-reminders \
  -H "Content-Type: application/json" \
  -d '{}'
```

Note: The function doesn't require authentication for cron calls, but you can add it for security.

### In Development

To test the reminder system locally:

```bash
# Manually trigger the send-reminders function
curl -X POST http://localhost:54321/functions/v1/send-reminders \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use the Supabase CLI:
```bash
supabase functions invoke send-reminders
```

### Frequency Recommendations

- **Every 5 minutes**: Recommended for production (good balance)
- **Every 1 minute**: Use if you need near-real-time reminders
- **Every 15 minutes**: Acceptable for low-traffic shops

## Testing the System

### 1. Create a Test Appointment

```sql
-- Create appointment 25 hours in the future
INSERT INTO appointments (
  client_id,
  barber_id,
  service_id,
  scheduled_start,
  status
) VALUES (
  '<client_id>',
  '<barber_id>',
  '<service_id>',
  NOW() + INTERVAL '25 hours',
  'booked'
);
```

### 2. Verify Reminder Was Scheduled

```sql
SELECT
  br.id,
  br.scheduled_for,
  br.reminder_type,
  br.status,
  a.scheduled_start
FROM booking_reminders br
JOIN appointments a ON a.id = br.appointment_id
WHERE a.status = 'booked'
ORDER BY br.scheduled_for;
```

You should see a primary reminder scheduled for ~24 hours before the appointment.

### 3. Test Reminder Sending (Without Waiting)

To test immediately, temporarily update the scheduled_for time:

```sql
UPDATE booking_reminders
SET scheduled_for = NOW() - INTERVAL '1 minute'
WHERE appointment_id = '<appointment_id>';
```

Then trigger the function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-reminders
```

### 4. Check Results

```sql
-- Check reminder status
SELECT * FROM booking_reminders WHERE appointment_id = '<appointment_id>';

-- Check if SMS was logged
SELECT * FROM client_messages
WHERE appointment_id = '<appointment_id>'
ORDER BY created_at DESC;

-- Check legacy tracking table
SELECT * FROM appointment_reminders_sent
WHERE appointment_id = '<appointment_id>';
```

### 5. Test Cancellation

```sql
UPDATE appointments
SET status = 'cancelled'
WHERE id = '<appointment_id>';

-- Verify reminder was cancelled
SELECT status FROM booking_reminders
WHERE appointment_id = '<appointment_id>';
-- Should show status = 'cancelled'
```

## Monitoring and Debugging

### View Pending Reminders

```sql
SELECT
  br.id,
  br.scheduled_for,
  br.reminder_type,
  br.status,
  a.scheduled_start,
  c.first_name || ' ' || c.last_name as client_name,
  u.name as barber_name
FROM booking_reminders br
JOIN appointments a ON a.id = br.appointment_id
JOIN clients c ON c.id = a.client_id
JOIN users u ON u.id = a.barber_id
WHERE br.status = 'pending'
ORDER BY br.scheduled_for;
```

### View Failed Reminders

```sql
SELECT
  br.id,
  br.scheduled_for,
  br.error_message,
  br.sent_at,
  a.id as appointment_id,
  c.phone
FROM booking_reminders br
JOIN appointments a ON a.id = br.appointment_id
JOIN clients c ON c.id = a.client_id
WHERE br.status = 'failed'
ORDER BY br.sent_at DESC;
```

### View Skipped Reminders

```sql
SELECT
  br.id,
  br.error_message,
  COUNT(*) as skip_count
FROM booking_reminders br
WHERE br.status = 'skipped'
GROUP BY br.id, br.error_message
ORDER BY skip_count DESC;
```

### Check Cron Job Logs

In Supabase Dashboard:
1. Go to Edge Functions → send-reminders
2. View logs tab
3. Look for entries like:
   - `[Reminders] Found X due reminders to process`
   - `[Reminders] Batch complete - Sent: X, Skipped: Y, Failed: Z`

## Owner UI Integration

Owners can manage reminder settings in **Owner Settings → Notifications**:

- **Enable/disable reminders**: Toggle `enable_reminders`
- **Primary reminder time**: Set `reminder_hours_before` (e.g., 24)
- **Secondary reminder time**: Set `reminder_hours_before_secondary` (e.g., 2)

Changes take effect immediately for new appointments. Existing reminders keep their original schedule.

## Security

### Row Level Security (RLS)

```sql
-- Service role can manage all reminders (required for cron job)
CREATE POLICY "Service role can manage all reminders"
  ON booking_reminders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Owners can view reminders (for monitoring/debugging)
CREATE POLICY "Owners can view reminders"
  ON booking_reminders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'OWNER'
    )
  );
```

### Data Protection

- Client phone numbers are only visible to authorized users
- Twilio credentials are stored securely in edge function environment
- SMS logs mask phone numbers in server logs: `+1555...`

## Troubleshooting

### Reminders Not Sending

**Check 1: Is SMS enabled in shop config?**
```sql
SELECT enable_reminders FROM shop_config;
```

**Check 2: Are Twilio credentials configured?**
```bash
# In Supabase Dashboard → Edge Functions → send-reminders → Settings
# Verify these env vars are set:
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
SMS_ENABLED=true
```

**Check 3: Are there pending reminders?**
```sql
SELECT COUNT(*) FROM booking_reminders
WHERE status = 'pending' AND scheduled_for <= NOW();
```

**Check 4: Is the cron job running?**
- Check edge function logs for recent executions
- Verify cron schedule is active

### Reminders Stuck in Pending

If reminders remain `pending` after their `scheduled_for` time:

1. Manually trigger the function:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-reminders
   ```

2. Check the response for errors

3. If SMS is not configured, reminders will be marked as `skipped` automatically

### Duplicate Reminders

This should never happen due to:
- Unique constraint on `(appointment_id, reminder_type)`
- Status-based processing (only `pending` reminders)
- Atomic status updates

If duplicates occur, check:
```sql
SELECT appointment_id, reminder_type, COUNT(*)
FROM booking_reminders
GROUP BY appointment_id, reminder_type
HAVING COUNT(*) > 1;
```

## Performance

### Expected Load

- **Storage**: ~2 reminder records per appointment
- **Cron execution**: Processes up to 100 reminders per run
- **Query performance**: Indexed queries are fast (<10ms)

### Scaling Considerations

For high-volume shops (>1000 appointments/day):

1. **Increase batch size**: Change `LIMIT 100` to `LIMIT 500` in send-reminders function
2. **Increase frequency**: Run cron every 1 minute instead of 5
3. **Archive old reminders**: Periodically delete reminders older than 90 days

## Migration Notes

### Existing Appointments

After deploying this system, existing booked appointments need reminders scheduled:

```sql
-- Schedule reminders for all future booked appointments
SELECT schedule_appointment_reminders(id, scheduled_start)
FROM appointments
WHERE status = 'booked'
AND scheduled_start > NOW();
```

This is safe to run multiple times (idempotent).

### Backwards Compatibility

The system maintains compatibility with the existing `appointment_reminders_sent` table:
- Both tables are updated when reminders are sent
- Legacy code can still check `appointment_reminders_sent`
- New code should use `booking_reminders` for full status tracking

## Summary

**Key Features:**
- ✅ Automatic reminder scheduling via database triggers
- ✅ Configurable primary + secondary reminders
- ✅ Fully idempotent (safe to run cron multiple times)
- ✅ Graceful handling when SMS is not configured
- ✅ Automatic cancellation when appointments change
- ✅ Comprehensive error tracking and logging
- ✅ Production-ready with proper indexing and RLS

**Production Checklist:**
1. Configure Twilio credentials in edge function settings
2. Set up cron job to run every 5 minutes
3. Enable reminders in shop configuration
4. Schedule reminders for existing appointments
5. Monitor edge function logs for first week
6. Review skipped/failed reminders and fix issues

**For Support:**
- Edge function logs: Supabase Dashboard → Edge Functions → send-reminders → Logs
- Database queries: Use the monitoring queries above
- Test manually: `curl -X POST <supabase-url>/functions/v1/send-reminders`
