# 📱 SMS Templates & Automation Package

## Status: ✅ ALL TEMPLATES IMPLEMENTED

All SMS templates below are **already implemented** in the codebase and will automatically send when their trigger conditions are met (once Twilio is configured).

---

## 📩 1. Appointment Confirmation

**Trigger:** Immediately when client books appointment
**Function:** `send-notification` (type: `confirmation`)
**Implementation:** `src/lib/notificationHelper.ts`

### English Template
```
Lupe's Barber Shop: Your appointment is scheduled for [date] at [time] with [barber]. Service: [service]. Call us: [phone]
```

### Spanish Template
```
Lupe's Barber Shop: Su cita está reservada para [date] a las [time] con [barber]. Servicio: [service]. Llámenos: [phone]
```

### Example Output
```
Lupe's Barber Shop: Your appointment is scheduled for January 15, 2025 at 2:00 PM with Carlos Martinez. Service: Classic Haircut. Call us: (405) 123-4567
```

---

## ⏰ 2. 24-Hour Reminder

**Trigger:** 24 hours before scheduled appointment
**Function:** `send-reminders` (scheduled)
**Implementation:** `supabase/functions/send-reminders`

### English Template
```
Lupe's Barber Shop: Reminder - Your appointment is tomorrow [date] at [time] with [barber]. See you soon! [phone]
```

### Spanish Template
```
Lupe's Barber Shop: Recordatorio - Su cita es mañana [date] a las [time] con [barber]. ¡Nos vemos pronto! [phone]
```

### Example Output
```
Lupe's Barber Shop: Reminder - Your appointment is tomorrow January 15, 2025 at 2:00 PM with Carlos Martinez. See you soon! (405) 123-4567
```

---

## ⏰ 3. 1-Hour Reminder (Optional)

**Trigger:** 1 hour before scheduled appointment
**Function:** `send-reminders` (scheduled)
**Configuration:** Set `shop_config.reminder_hours_before_secondary = 1`

### English Template
```
You're almost up! Your appointment is in 1 hour at Lupe's Barber Shop. See you soon!
```

### Spanish Template
```
¡Ya casi es hora! Tu cita es en 1 hora en Lupe's Barber Shop. ¡Nos vemos pronto!
```

### Example Output
```
You're almost up! Your appointment is in 1 hour at Lupe's Barber Shop. See you soon!
```

---

## ❌ 4. Cancellation Confirmation

**Trigger:** Immediately when appointment is cancelled
**Function:** `send-notification` (type: `cancellation`)
**Implementation:** `src/lib/notificationHelper.ts`

### English Template
```
Lupe's Barber Shop: Your appointment on [date] at [time] has been cancelled. Call us to reschedule. [phone]
```

### Spanish Template
```
Lupe's Barber Shop: Su cita del [date] a las [time] ha sido cancelada. Llámenos para reprogramar. [phone]
```

### Example Output
```
Lupe's Barber Shop: Your appointment on January 15, 2025 at 2:00 PM has been cancelled. Call us to reschedule. (405) 123-4567
```

---

## 🔄 5. Reschedule Confirmation

**Trigger:** Immediately when appointment is rescheduled
**Function:** `send-notification` (type: `reschedule`)
**Implementation:** `src/lib/notificationHelper.ts`

### English Template
```
Lupe's Barber Shop: Your appointment has been rescheduled to [new_date] at [new_time] with [barber]. [phone]
```

### Spanish Template
```
Lupe's Barber Shop: Su cita ha sido reprogramada para [new_date] a las [new_time] con [barber]. [phone]
```

### Example Output
```
Lupe's Barber Shop: Your appointment has been rescheduled to January 16, 2025 at 3:00 PM with Carlos Martinez. (405) 123-4567
```

---

## 🚫 6. No-Show Follow-Up

**Trigger:** Manual (owner/admin sends from dashboard)
**Function:** `send-sms` (manual SMS tool)
**Location:** Owner Dashboard > Engage tab

### English Template
```
We missed you today at Lupe's Barber Shop. If you'd like to reschedule, visit: https://lupesbarbershop.com
```

### Spanish Template
```
Te extrañamos hoy en Lupe's Barber Shop. Si deseas reprogramar, visita: https://lupesbarbershop.com
```

### Example Output
```
We missed you today at Lupe's Barber Shop. If you'd like to reschedule, visit: https://lupesbarbershop.com
```

---

## ⭐ 7. Review Request (Post-Appointment)

**Trigger:** Manual (owner/admin sends from dashboard)
**Function:** `send-sms` (manual SMS tool)
**Recommended Timing:** 2 hours after appointment completion

### English Template
```
Thank you for visiting Lupe's Barber Shop! If you had a great experience, we'd love a quick review 💈✨

Leave a review here:
https://www.google.com/maps/place/Lupe%E2%80%99s+Barber+Shop/@35.6037187,-107.6660156,1380630m/data=!3m1!1e3!4m12!1m2!2m1!1slupes+barber+shop!3m8!1s0x87adfbed81b9bd65:0x17329fb709a3bd05!8m2!3d35.5324826!4d-97.9545614!9m1!1b1!15sChFsdXBlcyBiYXJiZXIgc2hvcFoTIhFsdXBlcyBiYXJiZXIgc2hvcJIBC2JhcmJlcl9zaG9wmgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDI1Q2MySldiM2RhYm1obVlXdGFXbVZZWnpWU1ZtaFdWRWM1VkZneVl4QULgAQD6AQQIABBG!16s%2Fg%2F11x0p63xst?entry=ttu
```

### Spanish Template
```
¡Gracias por visitar Lupe's Barber Shop! Si tuviste una gran experiencia, nos encantaría recibir tu opinión 💈✨

Deja tu reseña aquí:
https://www.google.com/maps/place/Lupe%E2%80%99s+Barber+Shop/@35.6037187,-107.6660156,1380630m/data=!3m1!1e3!4m12!1m2!2m1!1slupes+barber+shop!3m8!1s0x87adfbed81b9bd65:0x17329fb709a3bd05!8m2!3d35.5324826!4d-97.9545614!9m1!1b1!15sChFsdXBlcyBiYXJiZXIgc2hvcFoTIhFsdXBlcyBiYXJiZXIgc2hvcJIBC2JhcmJlcl9zaG9wmgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDI1Q2MySldiM2RhYm1obVlXdGFXbVZZWnpWU1ZtaFdWRWM1VkZneVl4QULgAQD6AQQIABBG!16s%2Fg%2F11x0p63xst?entry=ttu
```

---

## 🔐 8. OTP Verification Code

**Trigger:** When client accesses "My Appointments" page
**Function:** `client-otp` (action: `request`)
**URL:** https://lupesbarbershop.com/client/appointments

### English Template
```
Your verification code is: [6-digit-code]. Valid for 10 minutes.
```

### Spanish Template
```
Su código de verificación es: [6-digit-code]. Válido por 10 minutos.
```

### Example Output
```
Your verification code is: 847293. Valid for 10 minutes.
```

---

## 🧪 Testing Templates

### Test Confirmation SMS
1. Complete a booking at: https://lupesbarbershop.com/client/book
2. SMS sent automatically to client's phone number

### Test Reminder SMS
1. Create an appointment for tomorrow
2. Wait for scheduled reminder processor to run
3. Or manually trigger via `send-reminders` function

### Test Cancellation SMS
1. Cancel an existing appointment via admin dashboard
2. SMS sent automatically to client

### Test OTP SMS
1. Visit: https://lupesbarbershop.com/client/appointments
2. Enter phone number
3. Click "Send Verification Code"

### Test Custom SMS (Review Request, etc.)
```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+14054925314",
    "message": "Thank you for visiting Lupes Barber Shop! If you had a great experience, wed love a quick review: [Google Maps URL]"
  }'
```

---

## 🎛️ Configuration Options

### Enable/Disable SMS Types

In `shop_config` table:

```sql
-- Enable/disable confirmations
UPDATE shop_config SET enable_confirmations = true;

-- Enable/disable reminders
UPDATE shop_config SET enable_reminders = true;

-- Set primary reminder timing (hours before)
UPDATE shop_config SET reminder_hours_before = 24;

-- Set secondary reminder timing (optional)
UPDATE shop_config SET reminder_hours_before_secondary = 1;
```

### Test Mode

When test mode is enabled, SMS messages are logged but not actually sent:

```sql
-- Enable test mode (no real SMS sent)
UPDATE shop_config SET test_mode_enabled = true;

-- Disable test mode (send real SMS)
UPDATE shop_config SET test_mode_enabled = false;
```

---

## 📊 Monitoring SMS Delivery

### View All Sent Messages
```sql
SELECT
  phone_number,
  LEFT(message, 50) || '...' as preview,
  notification_type,
  status,
  created_at
FROM client_messages
ORDER BY created_at DESC
LIMIT 50;
```

### View Failed Messages
```sql
SELECT
  phone_number,
  notification_type,
  error_message,
  created_at
FROM client_messages
WHERE status = 'error'
ORDER BY created_at DESC;
```

### View Messages by Type
```sql
SELECT
  notification_type,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
FROM client_messages
GROUP BY notification_type
ORDER BY count DESC;
```

---

## 🎯 Implementation Status

| Template | Status | Auto-Send | File Location |
|----------|--------|-----------|---------------|
| Confirmation | ✅ Deployed | Yes | `src/lib/notificationHelper.ts` |
| 24hr Reminder | ✅ Deployed | Yes (scheduled) | `supabase/functions/send-reminders` |
| 1hr Reminder | ✅ Deployed | Yes (optional) | `supabase/functions/send-reminders` |
| Cancellation | ✅ Deployed | Yes | `src/lib/notificationHelper.ts` |
| Reschedule | ✅ Deployed | Yes | `src/lib/notificationHelper.ts` |
| No-Show | ✅ Ready | Manual | Owner Dashboard > Engage |
| Review Request | ✅ Ready | Manual | Owner Dashboard > Engage |
| OTP Verification | ✅ Deployed | Yes | `supabase/functions/client-otp` |

---

## ✅ Ready to Use

All templates are **production-ready**. Configure Twilio credentials following `STRIPE_TWILIO_ACTIVATION_GUIDE.md` to activate SMS sending.

**Test SMS delivery with:**
```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+14054925314",
    "message": "Lupes Barber Shop: SMS system is now active."
  }'
```
