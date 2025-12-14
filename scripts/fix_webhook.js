import Stripe from 'stripe';

// 1. PASTE YOUR KEY HERE (Inside the quotes)
const STRIPE_KEY = 'SK_PLACEHOLDER';

const stripe = new Stripe(STRIPE_KEY);
const NEW_WEBHOOK_URL = 'https://jkmpbrneddgvekjoglhj.supabase.co/functions/v1/stripe-webhook';

async function updateWebhookEndpoints() {
  try {
    console.log('Fetching existing webhook endpoints...');
    const endpoints = await stripe.webhookEndpoints.list();
    console.log(`Found ${endpoints.data.length} webhook endpoint(s)\n`);

    if (endpoints.data.length === 0) {
      console.log('No webhook endpoints found.');
      return;
    }

    for (const endpoint of endpoints.data) {
      console.log(`Checking endpoint: ${endpoint.id}`);
      console.log(`  Current URL: ${endpoint.url}`);

      const needsUpdate =
        endpoint.url.includes('vercel.app') ||
        endpoint.url.includes('/api/stripe-webhook');

      if (needsUpdate) {
        console.log('  Status: NEEDS UPDATE');
        try {
          await stripe.webhookEndpoints.update(endpoint.id, {
            url: NEW_WEBHOOK_URL,
            // We do NOT change enabled_events, we just update the URL
          });
          console.log(`  ✅ Success: Updated webhook ${endpoint.id} to ${NEW_WEBHOOK_URL}\n`);
        } catch (updateError) {
          console.error(`  ❌ Error updating webhook ${endpoint.id}:`, updateError.message, '\n');
        }
      } else {
        console.log('  Status: OK (already correct or different endpoint)\n');
      }
    }
    console.log('Webhook update process completed!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateWebhookEndpoints();