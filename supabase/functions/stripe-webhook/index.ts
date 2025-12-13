import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
};

async function verifyStripeSignature(body: string, signature: string): Promise<any> {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("Webhook secret not configured");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${body}`);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !sig) {
    throw new Error("Invalid signature format");
  }

  const payload = `${timestamp}.${body}`;
  const payloadBytes = encoder.encode(payload);
  const expectedSig = await crypto.subtle.sign("HMAC", key, payloadBytes);
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex !== sig) {
    throw new Error("Signature verification failed");
  }

  return JSON.parse(body);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.text();
    const event = await verifyStripeSignature(body, signature);

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle payment_intent.succeeded
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata?.appointment_id;

      if (appointmentId) {
        const amountPaid = paymentIntent.amount_received / 100;

        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            payment_status: "paid",
            payment_provider: "stripe",
            stripe_payment_intent_id: paymentIntent.id,
            amount_paid: amountPaid,
            paid_at: new Date().toISOString(),
          })
          .eq("id", appointmentId);

        if (updateError) {
          console.error("[Stripe Webhook] Error updating appointment:", updateError);
        } else {
          console.log(`[Stripe Webhook] Payment confirmed for appointment ${appointmentId}`);
        }
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata?.appointment_id;

      if (appointmentId) {
        console.log(`[Stripe Webhook] Payment failed for appointment ${appointmentId}`);
      }
    }

    // Handle charge.refunded
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;

      if (paymentIntentId) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            payment_status: "refunded",
          })
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (updateError) {
          console.error("[Stripe Webhook] Error updating refund:", updateError);
        } else {
          console.log(`[Stripe Webhook] Refund processed for payment intent ${paymentIntentId}`);
        }
      }
    }

    // Handle checkout.session.completed (gold standard for Stripe Checkout)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointment_id;

      if (appointmentId) {
        const { data: existing } = await supabase
          .from("appointments")
          .select("payment_status")
          .eq("id", appointmentId)
          .maybeSingle();

        if (existing?.payment_status === "paid") {
          console.log(`[Stripe Webhook] Appointment ${appointmentId} already paid, skipping`);
        } else {
          const amountPaid = (session.amount_total || 0) / 100;

          const { error: updateError } = await supabase
            .from("appointments")
            .update({
              payment_status: "paid",
              payment_provider: "stripe",
              stripe_payment_intent_id: session.payment_intent,
              amount_paid: amountPaid,
              paid_at: new Date().toISOString(),
            })
            .eq("id", appointmentId);

          if (updateError) {
            console.error("[Stripe Webhook] Error updating appointment:", updateError);
          } else {
            console.log(`[Stripe Webhook] Checkout completed for appointment ${appointmentId}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});