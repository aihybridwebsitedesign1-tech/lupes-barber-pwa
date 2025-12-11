# Stripe API Migration Guide

This guide explains how to switch from Supabase Edge Functions to Vercel API routes for Stripe payments.

## Current Implementation

The application currently uses Supabase Edge Functions:
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

These functions are called from:
- `src/pages/ClientBook.tsx` (line 530)
- `src/pages/ClientAppointments.tsx` (line 750)

## New Implementation

New Vercel API routes have been created:
- `api/create-checkout-session.ts`
- `api/stripe-webhook.ts`

## Why Migrate?

**Vercel API Routes offer several advantages:**
1. ✅ Native TypeScript support without Deno runtime
2. ✅ Built-in integration with Vercel deployment
3. ✅ Better performance for high-traffic scenarios
4. ✅ Easier debugging with Vercel function logs
5. ✅ Official Stripe SDK support (vs. fetch-based API calls)
6. ✅ Automatic scaling with Vercel Serverless Functions

## Migration Steps

### Option 1: Use Vercel API Routes (Recommended for Production)

#### Step 1: Update Frontend Code

**File: `src/pages/ClientBook.tsx`**

Change line 530 from:
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
```

To:
```typescript
const response = await fetch('/api/create-checkout-session', {
```

**Full context (lines 520-540):**
```typescript
// OLD CODE (Supabase Edge Function)
const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({
    appointmentId: newAppointment.id,
  }),
});

// NEW CODE (Vercel API Route)
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    appointment_id: newAppointment.id,
  }),
});
```

**File: `src/pages/ClientAppointments.tsx`**

Change line 750 from:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
```

To:
```typescript
const response = await fetch('/api/create-checkout-session', {
```

**Full context (lines 740-760):**
```typescript
// OLD CODE (Supabase Edge Function)
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anon_key}`,
  },
  body: JSON.stringify({
    appointmentId: apt.id,
  }),
});

// NEW CODE (Vercel API Route)
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    appointment_id: apt.id,
  }),
});
```

#### Step 2: Configure Vercel Environment Variables

See `STRIPE_API_SETUP.md` for complete instructions.

**Required environment variables in Vercel:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_CLIENT_URL`
- `VITE_ADMIN_URL`

#### Step 3: Update Stripe Webhook URL

In your Stripe Dashboard, update the webhook endpoint from:
```
https://your-supabase-project.supabase.co/functions/v1/stripe-webhook
```

To:
```
https://your-domain.com/api/stripe-webhook
```

#### Step 4: Deploy and Test

1. Push changes to GitHub (triggers Vercel deployment)
2. Test checkout flow in production
3. Monitor Vercel function logs for any issues
4. Verify payments are updating correctly in Supabase

---

### Option 2: Keep Supabase Edge Functions

If you prefer to keep using Supabase Edge Functions, you can:

1. **Keep the existing code unchanged**
2. **Continue using the Edge Functions:**
   - `/functions/v1/create-checkout`
   - `/functions/v1/stripe-webhook`

3. **Configure Supabase secrets:**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Use the Supabase webhook URL in Stripe:**
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

**Note:** Both implementations are fully functional and can coexist. Choose based on your deployment preference.

---

### Option 3: Hybrid Approach

You can use both:
- **Vercel API routes** for the main domain (`lupesbarbershop.com`)
- **Supabase Edge Functions** for Supabase-hosted features

This is useful if you want to transition gradually or A/B test performance.

---

## Key Differences

| Feature | Supabase Edge Functions | Vercel API Routes |
|---------|------------------------|-------------------|
| **Runtime** | Deno | Node.js |
| **Deployment** | Supabase CLI | Vercel (automatic) |
| **Stripe SDK** | Manual fetch calls | Official `stripe` npm package |
| **URL** | `/functions/v1/...` | `/api/...` |
| **Environment** | Supabase Dashboard | Vercel Dashboard |
| **Request Body** | `appointmentId` | `appointment_id` |
| **Auth Header** | Required (Supabase anon key) | Not required |
| **Logs** | Supabase Dashboard | Vercel Dashboard |

---

## Request Body Differences

### Supabase Edge Function
```json
{
  "appointmentId": "uuid-here"
}
```

### Vercel API Route
```json
{
  "appointment_id": "uuid-here",
  "service_id": "optional-uuid",
  "barber_id": "optional-uuid",
  "client_name": "optional-string",
  "client_phone": "optional-string"
}
```

Both accept the appointment ID and will query Supabase for full details.

---

## Testing the Migration

### Test Create Checkout Session

**Vercel API Route:**
```bash
curl -X POST https://your-domain.com/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": "existing-uuid"}'
```

**Supabase Edge Function:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"appointmentId": "existing-uuid"}'
```

### Test Webhook

Use Stripe CLI to forward events:

**Vercel:**
```bash
stripe listen --forward-to https://your-domain.com/api/stripe-webhook
```

**Supabase:**
```bash
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook
```

---

## Rollback Plan

If you encounter issues after migrating to Vercel API routes:

1. **Revert the frontend changes** in `ClientBook.tsx` and `ClientAppointments.tsx`
2. **Restore the Stripe webhook URL** to the Supabase function
3. **Keep the Vercel API routes** - they won't interfere with the old implementation
4. **Debug separately** using Vercel function logs

---

## Recommended Approach

**For Production Deployment:**

✅ **Use Vercel API Routes** (`/api/create-checkout-session` and `/api/stripe-webhook`)

**Why?**
- Better integration with your Vercel-hosted frontend
- Easier debugging with consolidated logs
- Official Stripe SDK with TypeScript support
- Automatic scaling with Vercel Serverless
- No additional CORS configuration needed

**Keep Supabase Edge Functions as backup** in case you need to switch back.

---

## Next Steps

1. ✅ Review this migration guide
2. ✅ Choose Option 1, 2, or 3 above
3. ✅ Update frontend code (if using Option 1)
4. ✅ Configure environment variables
5. ✅ Update Stripe webhook URL
6. ✅ Deploy and test
7. ✅ Monitor for 24-48 hours
8. ✅ Consider disabling old edge functions if migration is successful

---

## Support

If you encounter issues:

1. **Check Vercel function logs** - Dashboard > Functions tab
2. **Check Stripe webhook logs** - Dashboard > Developers > Webhooks
3. **Verify environment variables** - All required variables are set
4. **Test API routes directly** - Use curl to isolate issues
5. **Compare request/response formats** - Ensure compatibility

Both implementations are production-ready. Choose the one that best fits your infrastructure.
