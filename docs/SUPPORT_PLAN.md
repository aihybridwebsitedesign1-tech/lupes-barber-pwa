# 3-HOUR SUPPORT SESSION - TASK LIST

**Internal Document for Developer**

---

## PRIORITY 1: Twilio Account Correction

**Goal:** Guide Client to create new Twilio "Sole Proprietor" sub-account.

**Steps:**
1. Log into Twilio Console with Client
2. Navigate to Account Settings
3. Create a new sub-account OR correct existing account type
4. Select "Sole Proprietor" as business type
5. Client must provide their SSN for verification
6. Submit A2P 10DLC registration with correct business type
7. Wait for approval (can take 1-7 business days)

**Note:** The software is ready to send SMS. Once Twilio approves the account, messages will work automatically.

---

## PRIORITY 2: Stripe Identity Verification

**Goal:** Verify Stripe account identity documents with Client.

**Steps:**
1. Log into Stripe Dashboard with Client
2. Check account status in Settings > Account Details
3. If identity verification required:
   - Upload government-issued ID
   - Verify business address
   - Complete any pending requirements
4. Ensure payouts are enabled
5. Verify bank account is connected for deposits

---

## PRIORITY 3: Stripe Webhook Configuration

**Goal:** Add `checkout.session.completed` event to Stripe Webhooks.

**Steps:**
1. Log into Stripe Dashboard
2. Navigate to: Developers > Webhooks
3. Click "Add endpoint" (or edit existing endpoint)
4. Endpoint URL: `https://[SUPABASE_PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
5. Click "Select events"
6. Add the following events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
7. Save the webhook
8. Copy the Webhook Signing Secret
9. Add secret to Supabase Edge Function environment variables as `STRIPE_WEBHOOK_SECRET`

---

## Verification Checklist

After completing the above tasks:

- [ ] Twilio A2P registration submitted with "Sole Proprietor" type
- [ ] Stripe identity verified and payouts enabled
- [ ] Stripe webhook configured with all 4 events
- [ ] Test SMS sending (once Twilio approved)
- [ ] Test Stripe payment flow end-to-end

---

## Emergency Contacts

- Twilio Support: https://www.twilio.com/help/contact
- Stripe Support: https://support.stripe.com/

---

**Support session timer starts when Client signs PROJECT_COMPLETION_RECEIPT.md**
