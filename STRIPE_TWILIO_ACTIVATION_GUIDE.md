# Stripe + Twilio Production Activation Guide

## Status: ✅ ALL CODE READY - Configuration Required

All Stripe and Twilio integration code is **fully implemented and deployed**. You only need to add your API keys to activate the features.

---

## 📋 Quick Start Checklist

- [ ] Add Stripe keys to environment variables
- [ ] Add Twilio keys to environment variables
- [ ] Register Stripe webhook endpoint
- [ ] Test SMS sending
- [ ] Test Stripe payment flow
- [ ] Verify webhook events

---

## 🔧 STEP 1: Configure Environment Variables

### 1.1 - Frontend Environment Variables (.env)

Add to your `.env` file:

```env
VITE_STRIPE_PUBLIC_KEY=pk_live_your_publishable_key_here
```

**Where to find:**
- Go to: https://dashboard.stripe.com/apikeys
- Copy your **Publishable key** (starts with `pk_live_` for production or `pk_test_` for testing)

### 1.2 - Server-Side Environment Variables (Supabase Dashboard)

Go to your Supabase Dashboard:
```
https://app.supabase.com/project/jkmpbrneddgvekjoglhj/settings/functions
```

Click **"Add new secret"** and add each of these:

#### Stripe Keys
```
Name: STRIPE_SECRET_KEY
Value: sk_live_your_secret_key_here

Name: STRIPE_WEBHOOK_SECRET
Value: whsec_your_webhook_signing_secret_here
```

**Where to find:**
- **Secret Key**: https://dashboard.stripe.com/apikeys (starts with `sk_live_` or `sk_test_`)
- **Webhook Secret**: See Step 2 below (created when you register the webhook)

#### Twilio Keys
```
Name: TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Name: TWILIO_AUTH_TOKEN
Value: your_auth_token_here

Name: TWILIO_FROM_NUMBER
Value: +15551234567

Name: SMS_ENABLED
Value: true
```

**Where to find:**
- Go to: https://console.twilio.com/
- Your **Account SID** and **Auth Token** are on the dashboard
- **From Number**: Go to Phone Numbers > Active Numbers

---

## 🪝 STEP 2: Register Stripe Webhook

### 2.1 - Get Your Webhook URL

Your webhook endpoint is:
```
https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/stripe-webhook
```

### 2.2 - Add Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter endpoint URL: `https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/stripe-webhook`
4. Click **"Select events"**
5. Add these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Click **"Add endpoint"**

### 2.3 - Copy Webhook Signing Secret

After creating the webhook:
1. Click on the webhook you just created
2. Click **"Reveal"** under **Signing secret**
3. Copy the secret (starts with `whsec_`)
4. Add it to Supabase Edge Functions secrets as `STRIPE_WEBHOOK_SECRET`

---

## 📱 STEP 3: Test SMS System

### 3.1 - Test SMS to Your Phone

Run this curl command (replace with your phone number):

```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+14054925314",
    "message": "Lupes Barber Shop: SMS system is now active."
  }'
```

**Expected Response:**
```json
{
  "status": "sent",
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "message": "SMS sent successfully!"
}
```

### 3.2 - If SMS Fails

Check the response for error details:
- **"SMS not configured"** → Add Twilio environment variables in Step 1.2
- **"Failed to send SMS"** → Check your Twilio credentials are correct
- **Twilio error 21211** → Phone number not verified (for test accounts)
- **Twilio error 21608** → Invalid phone number format (use E.164: +1234567890)

---

## 💳 STEP 4: Test Stripe Payment Flow

### 4.1 - Test End-to-End Booking with Payment

1. Open an **incognito/private browser window**
2. Go to: https://lupesbarbershop.com/client/book
3. Complete the booking flow:
   - Select barber
   - Select service
   - Select date & time
   - Enter contact info
4. You should be **redirected to Stripe Checkout**
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
6. Complete payment
7. Should redirect to success page: https://lupesbarbershop.com/client/book/success

### 4.2 - Verify Payment in Database

Check that the appointment was marked as paid:

```sql
SELECT
  id,
  payment_status,
  payment_provider,
  amount_due,
  amount_paid,
  stripe_payment_intent_id,
  paid_at
FROM appointments
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- `payment_status` = `'paid'`
- `payment_provider` = `'stripe'`
- `amount_paid` = (matches service price)
- `stripe_payment_intent_id` = `'pi_xxxxx...'`
- `paid_at` = (timestamp when paid)

---

## 🔔 STEP 5: Verify SMS Automations

### 5.1 - Test Appointment Confirmation SMS

When a client books an appointment, they should receive:

```
Lupe's Barber Shop: Your appointment is scheduled for [date] at [time] with [barber]. Service: [service]. Call us: [phone]
```

### 5.2 - Test SMS Message Log

Check that messages are being logged:

```sql
SELECT
  phone_number,
  message,
  notification_type,
  status,
  created_at
FROM client_messages
ORDER BY created_at DESC
LIMIT 10;
```

**Expected status values:**
- `'sent'` = SMS delivered successfully
- `'sent_test'` = Test mode (SMS not actually sent)
- `'error'` = Failed to send

### 5.3 - SMS Automation Types

The system sends SMS for these events:

| Notification Type | Trigger | Timing |
|------------------|---------|--------|
| **confirmation** | Appointment created | Immediately |
| **reminder** (primary) | Before appointment | 24 hours before |
| **reminder** (secondary) | Before appointment | 1 hour before (optional) |
| **cancellation** | Appointment cancelled | Immediately |
| **reschedule** | Appointment rescheduled | Immediately |
| **otp** | Client accessing "My Appointments" | On request |

---

## ✅ STEP 6: Verification Checklist

### Stripe Integration ✓

- [ ] `STRIPE_SECRET_KEY` added to Supabase secrets
- [ ] `STRIPE_WEBHOOK_SECRET` added to Supabase secrets
- [ ] `VITE_STRIPE_PUBLIC_KEY` added to .env
- [ ] Webhook registered at Stripe Dashboard
- [ ] Webhook listening to: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Test payment completes successfully
- [ ] Appointment marked as `paid` in database
- [ ] Redirect to success page works

### Twilio Integration ✓

- [ ] `TWILIO_ACCOUNT_SID` added to Supabase secrets
- [ ] `TWILIO_AUTH_TOKEN` added to Supabase secrets
- [ ] `TWILIO_FROM_NUMBER` added to Supabase secrets
- [ ] `SMS_ENABLED` set to `true` in Supabase secrets
- [ ] Test SMS delivered to +14054925314
- [ ] Appointment confirmation SMS sent on booking
- [ ] Messages logged in `client_messages` table
- [ ] OTP SMS sent for "My Appointments" access

---

## 🧪 STEP 7: Test Commands

### Test SMS (Manual)
```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+14054925314", "message": "Test message from Lupes Barber Shop"}'
```

### Test Stripe Checkout (Manual)
```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbXBicm5lZGRndmVram9nbGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjQ4NjUsImV4cCI6MjA4MDMwMDg2NX0.RacBhmmaIlp_-iphgs10K_sExeKXS7uTfHVrE5trJdg" \
  -d '{"appointmentId": "your-appointment-id-here"}'
```

### Test Webhook (Manual - from Stripe Dashboard)
1. Go to: https://dashboard.stripe.com/webhooks
2. Click your webhook endpoint
3. Click **"Send test webhook"**
4. Select `payment_intent.succeeded`
5. Click **"Send test webhook"**

---

## 🎯 Success Criteria

### ✅ Stripe is Active When:
1. Client can complete online booking and reach Stripe Checkout
2. Payment is processed successfully
3. Appointment status updates to `paid` in database
4. Success page shows payment confirmation
5. Webhook receives `payment_intent.succeeded` events

### ✅ Twilio is Active When:
1. Test SMS delivers to +14054925314
2. Appointment confirmation SMS sent on booking
3. OTP code SMS sent for "My Appointments" access
4. All messages logged in `client_messages` table
5. Messages show `status='sent'` (not `'sent_test'`)

---

## 🚨 Troubleshooting

### Issue: Stripe Checkout Not Appearing
**Symptoms:** Booking completes but no payment page shows

**Solutions:**
1. Check `.env` has `VITE_STRIPE_PUBLIC_KEY`
2. Check browser console for errors
3. Check `shop_config.test_mode_enabled` is `false`
4. Rebuild frontend: `npm run build`

### Issue: Webhook Not Working
**Symptoms:** Payment works but appointment not marked as paid

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` in Supabase matches Stripe Dashboard
2. Check webhook URL is correct: `https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/stripe-webhook`
3. Test webhook from Stripe Dashboard
4. Check Supabase function logs for errors

### Issue: SMS Not Sending
**Symptoms:** No SMS received

**Solutions:**
1. Verify all Twilio environment variables set correctly
2. Check `SMS_ENABLED=true` in Supabase secrets
3. Verify phone number in E.164 format: +1234567890
4. Check Twilio account is active and has credits
5. For test accounts, verify recipient number is verified in Twilio
6. Check `client_messages` table for error messages

### Issue: Test Mode Blocking Payments
**Symptoms:** Payments disabled even with Stripe configured

**Solution:**
```sql
UPDATE shop_config SET test_mode_enabled = false;
```

---

## 📊 Monitoring

### View Recent Payments
```sql
SELECT
  a.id,
  c.first_name || ' ' || c.last_name as client_name,
  s.name_en as service,
  a.amount_due,
  a.amount_paid,
  a.payment_status,
  a.payment_provider,
  a.paid_at
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN services s ON a.service_id = s.id
WHERE a.payment_status = 'paid'
ORDER BY a.paid_at DESC
LIMIT 20;
```

### View Recent SMS Messages
```sql
SELECT
  phone_number,
  LEFT(message, 50) || '...' as message_preview,
  notification_type,
  status,
  created_at
FROM client_messages
ORDER BY created_at DESC
LIMIT 20;
```

### View Failed SMS
```sql
SELECT
  phone_number,
  message,
  notification_type,
  error_message,
  created_at
FROM client_messages
WHERE status = 'error'
ORDER BY created_at DESC;
```

---

## 🎉 COMPLETION CONFIRMATION

Once all steps are complete, send a confirmation SMS:

```bash
curl -X POST https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+14054925314",
    "message": "🎉 PRODUCTION READY: Stripe + Twilio fully activated. Online payments and SMS notifications are LIVE at lupesbarbershop.com"
  }'
```

---

## 📚 SMS Template Reference

### Confirmation
```
Lupe's Barber Shop: Your appointment is scheduled for [date] at [time] with [barber]. Service: [service]. Call us: [phone]
```

### 24-Hour Reminder
```
Lupe's Barber Shop: Reminder - Your appointment is tomorrow [date] at [time] with [barber]. See you soon! [phone]
```

### 1-Hour Reminder
```
You're almost up! Your appointment is in 1 hour at Lupe's Barber Shop. See you soon!
```

### Cancellation
```
Lupe's Barber Shop: Your appointment on [date] at [time] has been cancelled. Call us to reschedule. [phone]
```

### Reschedule
```
Lupe's Barber Shop: Your appointment has been rescheduled to [date] at [time] with [barber]. [phone]
```

### OTP Verification
```
Your verification code is: [6-digit-code]. Valid for 10 minutes.
```

---

## 🔗 Important URLs

- **Production Site:** https://lupesbarbershop.com
- **Admin Dashboard:** https://admin.lupesbarbershop.com
- **Booking Page:** https://lupesbarbershop.com/client/book
- **My Appointments:** https://lupesbarbershop.com/client/appointments
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Twilio Console:** https://console.twilio.com
- **Supabase Dashboard:** https://app.supabase.com/project/jkmpbrneddgvekjoglhj

---

## ✅ DEPLOYMENT COMPLETE

All code is deployed and ready. Add your API keys following the steps above to activate Stripe payments and Twilio SMS in production.

**Edge Functions Deployed:**
- ✅ `create-checkout` - Creates Stripe checkout sessions
- ✅ `confirm-payment` - Confirms payments after checkout
- ✅ `stripe-webhook` - Handles Stripe webhook events
- ✅ `send-sms` - Sends SMS via Twilio (owner/admin)
- ✅ `send-notification` - Sends automated SMS notifications
- ✅ `client-otp` - Sends/verifies OTP codes for client portal
- ✅ `test-sms` - Test SMS delivery
- ✅ `send-reminders` - Scheduled reminder processor

**Frontend Integration:**
- ✅ Booking flow with Stripe Checkout
- ✅ Payment confirmation page
- ✅ "My Appointments" with OTP verification
- ✅ Pay Now button for unpaid appointments
- ✅ SMS automation on all booking actions

**Database:**
- ✅ RLS policies allow public booking
- ✅ Payment status tracking
- ✅ SMS message logging
- ✅ OTP verification system
