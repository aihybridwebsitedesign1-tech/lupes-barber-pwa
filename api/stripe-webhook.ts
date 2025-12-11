import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('[Stripe Webhook] Missing configuration');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Stripe Webhook] Missing Supabase configuration');
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('[Stripe Webhook] Missing signature');
      return res.status(400).send('Missing signature');
    }

    const rawBody = await getRawBody(req);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig as string,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return res.status(400).json({
        error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }

    console.log(`[Stripe Webhook] Event received: ${event.type}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    async function updateAppointment(session: any) {
      const appointmentId = session.metadata?.appointment_id;
      if (!appointmentId) return;

      await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          amount_paid: (session.amount_total || 0) / 100,
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          stripe_session_id: session.id
        })
        .eq("id", appointmentId);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Checkout completed`);
        await updateAppointment(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const appointmentId = paymentIntent.metadata?.appointment_id;

        if (appointmentId) {
          console.log(`[Stripe Webhook] Payment succeeded for appointment ${appointmentId}`);

          const amountPaid = paymentIntent.amount_received / 100;

          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              payment_status: 'paid',
              payment_provider: 'stripe',
              stripe_payment_intent_id: paymentIntent.id,
              amount_paid: amountPaid,
              paid_at: new Date().toISOString(),
            })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('[Stripe Webhook] Error updating appointment:', updateError);
          } else {
            console.log(`[Stripe Webhook] Payment intent succeeded for appointment ${appointmentId}`);
          }
        } else {
          console.warn('[Stripe Webhook] No appointment_id in payment intent metadata');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const appointmentId = paymentIntent.metadata?.appointment_id;

        if (appointmentId) {
          console.log(`[Stripe Webhook] Payment failed for appointment ${appointmentId}`);

          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              payment_status: 'failed',
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('[Stripe Webhook] Error updating failed payment:', updateError);
          } else {
            console.log(`[Stripe Webhook] Payment failure recorded for appointment ${appointmentId}`);
          }
        } else {
          console.warn('[Stripe Webhook] No appointment_id in payment intent metadata');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          console.log(`[Stripe Webhook] Refund processed for payment intent ${paymentIntentId}`);

          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              payment_status: 'refunded',
            })
            .eq('stripe_payment_intent_id', paymentIntentId);

          if (updateError) {
            console.error('[Stripe Webhook] Error updating refund:', updateError);
          } else {
            console.log(`[Stripe Webhook] Refund recorded for payment intent ${paymentIntentId}`);
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
