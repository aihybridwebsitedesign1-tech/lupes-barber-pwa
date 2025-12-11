# Stripe API Routes Setup Guide

This guide explains how to configure and deploy the Stripe Checkout API routes for production.

## Overview

Two serverless API routes have been created in the `/api` directory:

1. **`/api/create-checkout-session.ts`** - Creates Stripe Checkout sessions for appointments
2. **`/api/stripe-webhook.ts`** - Handles Stripe webhook events (payment confirmations, failures, refunds)

These routes will be automatically deployed as Vercel serverless functions.

---

## Prerequisites

1. **Stripe Account** - Live mode enabled with API keys
2. **Vercel Project** - Deployed and configured
3. **Supabase Database** - Already configured and running

---

## Step 1: Install Dependencies

Run the following command to install required packages:

```bash
npm install
```

This will install:
- `stripe` - Official Stripe Node.js SDK
- `@vercel/node` - Vercel serverless function types
- `@types/node` - Node.js TypeScript types

---

## Step 2: Configure Environment Variables in Vercel

Go to your Vercel project dashboard:
**https://vercel.com/[your-project]/settings/environment-variables**

Add the following environment variables:

### Required Variables

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe Dashboard) | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe Webhook setup) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production |
| `VITE_SUPABASE_URL` | Your Supabase URL | Production |
| `VITE_CLIENT_URL` | `https://lupesbarbershop.com` | Production |
| `VITE_ADMIN_URL` | `https://admin.lupesbarbershop.com` | Production |

### Getting Your Stripe Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers > API Keys**
3. Copy the **Secret key** (starts with `sk_live_...` for production)
4. Add it as `STRIPE_SECRET_KEY` in Vercel

### Getting Your Supabase Service Role Key

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Go to **Settings > API**
3. Copy the **service_role** key (starts with `eyJ...`)
4. Add it as `SUPABASE_SERVICE_ROLE_KEY` in Vercel

---

## Step 3: Configure Stripe Webhook

After deploying to Vercel, your API routes will be available at:

- **Checkout:** `https://your-domain.com/api/create-checkout-session`
- **Webhook:** `https://your-domain.com/api/stripe-webhook`

### Set Up the Webhook in Stripe

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add Endpoint**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded` (optional, for refunds)
5. Click **Add Endpoint**

### Get the Webhook Signing Secret

1. After creating the webhook, click on it to view details
2. Click **Reveal** under **Signing Secret**
3. Copy the secret (starts with `whsec_...`)
4. Add it as `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

---

## Step 4: Deploy to Vercel

When you push your code to GitHub (or your connected Git provider), Vercel will automatically:

1. Detect the `/api` directory
2. Build the TypeScript files as serverless functions
3. Deploy them with the environment variables you configured

### Manual Deployment

If you need to deploy manually:

```bash
npm run build
vercel --prod
```

---

## Step 5: Test the Integration

### Test Checkout Session Creation

Use curl or Postman to test the API:

```bash
curl -X POST https://your-domain.com/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "existing-appointment-id"
  }'
```

Expected response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### Test Webhook Locally

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhook events:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Then trigger a test event:

```bash
stripe trigger checkout.session.completed
```

---

## How It Works

### Create Checkout Session Flow

1. Client calls `/api/create-checkout-session` with `appointment_id`
2. API queries Supabase for appointment, service, and client details
3. Calculates the amount from `amount_due` or `service.base_price`
4. Creates a Stripe Checkout Session in **live mode**
5. Saves `stripe_session_id` to the appointment record
6. Returns the checkout URL to the client
7. Client redirects to Stripe Checkout page

### Webhook Flow

1. Stripe sends events to `/api/stripe-webhook`
2. API verifies the signature using `STRIPE_WEBHOOK_SECRET`
3. Processes the event:
   - `checkout.session.completed` → Sets `payment_status: 'paid'`
   - `payment_intent.succeeded` → Sets `payment_status: 'paid'`
   - `payment_intent.payment_failed` → Sets `payment_status: 'failed'`
   - `charge.refunded` → Sets `payment_status: 'refunded'`
4. Updates the appointment in Supabase with payment details
5. Returns a 200 response to Stripe

---

## Database Fields Updated

The webhook updates these fields in the `appointments` table:

- `payment_status` - `'paid' | 'unpaid' | 'failed' | 'partial' | 'refunded'`
- `payment_provider` - `'stripe'`
- `stripe_session_id` - Checkout session ID
- `stripe_payment_intent_id` - Payment intent ID
- `amount_paid` - Amount paid in USD
- `paid_at` - Timestamp of payment

---

## Troubleshooting

### API Route Returns 500 Error

**Check Vercel Logs:**
1. Go to Vercel Dashboard > Deployments
2. Click on your deployment
3. Go to Functions tab
4. Check logs for errors

**Common Issues:**
- Missing environment variables
- Incorrect Supabase credentials
- Invalid Stripe API key

### Webhook Not Receiving Events

**Verify Webhook URL:**
- Make sure the webhook URL is publicly accessible
- Check that it matches the URL in Stripe Dashboard
- Ensure HTTPS is used (required by Stripe)

**Check Stripe Dashboard:**
- Go to Developers > Webhooks
- Click on your webhook
- Check the "Recent deliveries" tab for errors

**Verify Signing Secret:**
- Make sure `STRIPE_WEBHOOK_SECRET` is correct
- It should start with `whsec_`

### Payment Not Updating in Database

**Check Webhook Event Logs:**
- Look at Vercel function logs during webhook events
- Check Supabase database for appointment record
- Verify `appointment_id` is in the session metadata

**Common Issues:**
- Incorrect appointment ID in metadata
- Database permissions issue
- `payment_status` field doesn't exist

---

## Security Considerations

1. **Always verify webhook signatures** - The API uses `stripe.webhooks.constructEvent()` to verify all incoming webhooks
2. **Use environment variables** - Never hardcode API keys
3. **Use HTTPS** - Required for Stripe webhooks
4. **Restrict CORS** - Consider restricting origins in production
5. **Use live mode keys** - Use `sk_live_...` for production, not test keys

---

## API Endpoint Reference

### POST /api/create-checkout-session

**Request Body:**
```typescript
{
  appointment_id: string;      // Required
  service_id?: string;         // Optional
  barber_id?: string;          // Optional
  client_name?: string;        // Optional
  client_phone?: string;       // Optional
}
```

**Response:**
```typescript
{
  sessionId: string;  // Stripe session ID
  url: string;        // Checkout URL to redirect to
}
```

**Error Response:**
```typescript
{
  error: string;  // Error message
}
```

---

### POST /api/stripe-webhook

**Headers:**
- `stripe-signature` - Webhook signature (required)

**Events Handled:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Response:**
```typescript
{
  received: true
}
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure Vercel environment variables
3. ✅ Deploy to Vercel
4. ✅ Set up Stripe webhook
5. ✅ Test the integration
6. ✅ Monitor webhook deliveries in Stripe Dashboard

Once configured, your booking flow will automatically process payments through Stripe Checkout in live mode.
