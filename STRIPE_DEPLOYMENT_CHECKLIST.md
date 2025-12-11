# Stripe Production Deployment Checklist

## ✅ Files Created

### API Routes (Vercel Serverless Functions)
- ✅ `/api/create-checkout-session.ts` - Creates Stripe Checkout sessions
- ✅ `/api/stripe-webhook.ts` - Handles Stripe webhook events

### Documentation
- ✅ `STRIPE_API_SETUP.md` - Complete setup guide
- ✅ `STRIPE_MIGRATION_GUIDE.md` - Migration instructions
- ✅ `STRIPE_DEPLOYMENT_CHECKLIST.md` - This checklist

### Configuration Updates
- ✅ `package.json` - Added Stripe SDK and Vercel dependencies
- ✅ `vercel.json` - Configured API route rewrites
- ✅ `.env.example` - Updated with API route environment variables

---

## 🚀 Pre-Deployment Checklist

### 1. Dependencies
- [ ] Run `npm install` to install new packages:
  - `stripe` - Official Stripe Node.js SDK
  - `@vercel/node` - Vercel serverless function types
  - `@types/node` - Node.js TypeScript types

### 2. Stripe Account Setup
- [ ] Log in to [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] Ensure account is in **Live Mode**
- [ ] Copy **Secret Key** from Developers > API Keys (starts with `sk_live_...`)
- [ ] Keep tab open for webhook setup

### 3. Vercel Environment Variables
- [ ] Go to [Vercel Dashboard](https://vercel.com)
- [ ] Navigate to Project Settings > Environment Variables
- [ ] Add the following variables for **Production**:

| Variable | Where to Get It |
|----------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Skip for now - will add after webhook setup |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `VITE_CLIENT_URL` | Your client domain (e.g., `https://lupesbarbershop.com`) |
| `VITE_ADMIN_URL` | Your admin domain (e.g., `https://admin.lupesbarbershop.com`) |

### 4. Code Changes (Optional - See Migration Guide)
- [ ] Review `STRIPE_MIGRATION_GUIDE.md`
- [ ] Decide: Keep Supabase Edge Functions OR migrate to Vercel API routes
- [ ] If migrating, update `ClientBook.tsx` line 530
- [ ] If migrating, update `ClientAppointments.tsx` line 750

---

## 🚢 Deployment Steps

### 1. Deploy to Vercel
- [ ] Commit all changes to Git
- [ ] Push to GitHub (or your Git provider)
- [ ] Vercel will automatically deploy
- [ ] Wait for deployment to complete
- [ ] Note your deployment URL (e.g., `https://your-domain.com`)

### 2. Verify API Routes Are Live
- [ ] Check that `/api/create-checkout-session` is accessible
- [ ] Check that `/api/stripe-webhook` is accessible
- [ ] View Vercel Dashboard > Functions tab to confirm they're deployed

### 3. Configure Stripe Webhook
- [ ] Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
- [ ] Click **Add Endpoint**
- [ ] Enter webhook URL:
  ```
  https://your-domain.com/api/stripe-webhook
  ```
- [ ] Select **API version:** Latest
- [ ] Select events to listen for:
  - ✅ `checkout.session.completed`
  - ✅ `payment_intent.succeeded`
  - ✅ `payment_intent.payment_failed`
  - ✅ `charge.refunded` (optional)
- [ ] Click **Add Endpoint**

### 4. Get Webhook Signing Secret
- [ ] In Stripe Dashboard, click on the webhook you just created
- [ ] Click **Reveal** under **Signing Secret**
- [ ] Copy the secret (starts with `whsec_...`)
- [ ] Add it to Vercel Environment Variables:
  - Variable: `STRIPE_WEBHOOK_SECRET`
  - Value: `whsec_...`
  - Environment: Production
- [ ] Redeploy Vercel (if needed to pick up new env variable)

---

## ✅ Testing Checklist

### Test Create Checkout Session

**Method 1: Via Frontend**
- [ ] Go to your live site
- [ ] Navigate to booking flow
- [ ] Complete booking details
- [ ] Click "Pay & Confirm"
- [ ] Should redirect to Stripe Checkout page

**Method 2: Direct API Test**
- [ ] Use curl to test API directly:
  ```bash
  curl -X POST https://your-domain.com/api/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"appointment_id": "existing-appointment-uuid"}'
  ```
- [ ] Should return `{"sessionId": "cs_...", "url": "https://checkout.stripe.com/..."}`

### Test Webhook

**Method 1: Trigger Real Payment**
- [ ] Complete a test booking with Stripe test card
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete payment on Stripe Checkout
- [ ] Check Supabase `appointments` table
- [ ] Verify `payment_status` updated to `'paid'`
- [ ] Verify `stripe_payment_intent_id` is set
- [ ] Verify `paid_at` timestamp is set

**Method 2: Send Test Event from Stripe**
- [ ] Go to Stripe Dashboard > Developers > Webhooks
- [ ] Click on your webhook
- [ ] Click **Send test webhook**
- [ ] Choose event: `checkout.session.completed`
- [ ] Send event
- [ ] Check "Recent deliveries" tab for status (should be 200)

**Method 3: Use Stripe CLI**
- [ ] Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [ ] Run:
  ```bash
  stripe listen --forward-to https://your-domain.com/api/stripe-webhook
  ```
- [ ] In another terminal:
  ```bash
  stripe trigger checkout.session.completed
  ```
- [ ] Check webhook received event successfully

---

## 🔍 Verification Steps

### Check Vercel Function Logs
- [ ] Go to Vercel Dashboard > Deployments
- [ ] Click on latest deployment
- [ ] Go to **Functions** tab
- [ ] Click on `api/stripe-webhook.func`
- [ ] View recent invocations
- [ ] Verify no errors in logs

### Check Stripe Webhook Deliveries
- [ ] Go to Stripe Dashboard > Developers > Webhooks
- [ ] Click on your webhook
- [ ] Go to **Recent deliveries** tab
- [ ] Verify events are being delivered (200 status)
- [ ] Check response body shows `{"received": true}`

### Check Database
- [ ] Go to Supabase Dashboard
- [ ] Open Table Editor
- [ ] Select `appointments` table
- [ ] Find a test appointment
- [ ] Verify these fields are populated:
  - `payment_status` = `'paid'`
  - `payment_provider` = `'stripe'`
  - `stripe_session_id` = `'cs_...'`
  - `stripe_payment_intent_id` = `'pi_...'`
  - `amount_paid` = actual amount
  - `paid_at` = timestamp

---

## 🐛 Troubleshooting

### API Route Returns 500
- [ ] Check Vercel function logs for errors
- [ ] Verify environment variables are set correctly
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct
- [ ] Verify Stripe API key is in live mode

### Webhook Not Receiving Events
- [ ] Verify webhook URL is publicly accessible
- [ ] Ensure URL uses HTTPS (required by Stripe)
- [ ] Check Stripe webhook logs for delivery errors
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is correct in Vercel

### Payment Status Not Updating
- [ ] Check Vercel function logs during webhook event
- [ ] Verify `appointment_id` is in session metadata
- [ ] Check Supabase RLS policies allow service role updates
- [ ] Ensure `payment_status` field exists in database

### Signature Verification Failed
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] Ensure secret starts with `whsec_`
- [ ] Check that raw body is passed to verification
- [ ] Redeploy Vercel if environment variable was just added

---

## 📊 Monitoring (First 48 Hours)

### Daily Checks
- [ ] **Day 1:**
  - Check Vercel function logs (should show webhook events)
  - Check Stripe webhook deliveries (should be 200 status)
  - Verify at least 1 successful payment
  - Monitor error rates

- [ ] **Day 2:**
  - Review any failed webhook deliveries
  - Check database for payment inconsistencies
  - Verify all payments are recording correctly
  - Review customer feedback (if any issues)

### Metrics to Monitor
- [ ] Webhook success rate (should be >99%)
- [ ] Payment success rate
- [ ] API response times (<1s for checkout, <500ms for webhook)
- [ ] Error logs (should be minimal)

---

## 🎉 Success Criteria

Your Stripe integration is fully operational when:

- ✅ API routes are deployed and accessible
- ✅ Stripe webhook is configured and receiving events
- ✅ Test payment completes successfully
- ✅ Database updates with payment status
- ✅ No errors in Vercel or Stripe logs
- ✅ Customer receives confirmation
- ✅ Booking flow works end-to-end

---

## 📝 Post-Deployment Notes

### Optional Improvements
- [ ] Set up Stripe payment failure alerts
- [ ] Configure Stripe email receipts
- [ ] Add Stripe invoice generation
- [ ] Implement refund handling in admin panel
- [ ] Set up webhook monitoring/alerting

### Cleanup (After Successful Migration)
- [ ] Consider disabling Supabase Edge Functions if fully migrated
- [ ] Remove old webhook from Stripe Dashboard
- [ ] Update documentation to reflect production setup

---

## 📞 Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

## Quick Reference

**API Endpoints:**
- Create Checkout: `POST /api/create-checkout-session`
- Webhook: `POST /api/stripe-webhook`

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Live mode: `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` - Webhook signing: `whsec_...`
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `VITE_CLIENT_URL` - Client domain
- `VITE_ADMIN_URL` - Admin domain

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
