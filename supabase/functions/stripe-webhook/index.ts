import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_ORIGINS = [
  "https://lupesbarbershop.com",
  "https://www.lupesbarbershop.com",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
  };
}

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
    ["sign"]
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
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata?.appointment_id;

      console.log(`[Stripe Webhook] ===== PAYMENT INTENT SUCCEEDED =====`);
      console.log(`[Stripe Webhook] Payment Intent ID: ${paymentIntent.id}`);
      console.log(`[Stripe Webhook] Appointment ID from metadata: ${appointmentId}`);
      console.log(`[Stripe Webhook] Amount received: ${paymentIntent.amount_received}`);

      if (appointmentId) {
        try {
          const amountPaid = paymentIntent.amount_received / 100;

          console.log(`[Stripe Webhook] Updating appointment ${appointmentId} to paid...`);

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
            console.error(`[Stripe Webhook] ❌ ERROR updating appointment:`, JSON.stringify(updateError));
          } else {
            console.log(`[Stripe Webhook] ✅ Payment confirmed for appointment ${appointmentId}`);
          }
        } catch (error) {
          console.error(`[Stripe Webhook] ❌ EXCEPTION in payment_intent.succeeded:`, error);
        }
      } else {
        console.log(`[Stripe Webhook] No appointment_id in payment intent metadata`);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata?.appointment_id;

      console.log(`[Stripe Webhook] ===== PAYMENT INTENT FAILED =====`);
      console.log(`[Stripe Webhook] Payment Intent ID: ${paymentIntent.id}`);
      console.log(`[Stripe Webhook] Appointment ID: ${appointmentId}`);
      console.log(`[Stripe Webhook] Failure reason:`, paymentIntent.last_payment_error);

      if (appointmentId) {
        console.log(`[Stripe Webhook] ⚠️ Payment failed for appointment ${appointmentId}`);
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;

      console.log(`[Stripe Webhook] ===== CHARGE REFUNDED =====`);
      console.log(`[Stripe Webhook] Charge ID: ${charge.id}`);
      console.log(`[Stripe Webhook] Payment Intent ID: ${paymentIntentId}`);
      console.log(`[Stripe Webhook] Refund amount: ${charge.amount_refunded}`);

      if (paymentIntentId) {
        try {
          console.log(`[Stripe Webhook] Updating appointment to refunded status...`);

          const { error: updateError } = await supabase
            .from("appointments")
            .update({
              payment_status: "refunded",
            })
            .eq("stripe_payment_intent_id", paymentIntentId);

          if (updateError) {
            console.error(`[Stripe Webhook] ❌ ERROR updating refund:`, JSON.stringify(updateError));
          } else {
            console.log(`[Stripe Webhook] ✅ Refund processed for payment intent ${paymentIntentId}`);
          }
        } catch (error) {
          console.error(`[Stripe Webhook] ❌ EXCEPTION in charge.refunded:`, error);
        }
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointment_id;

      console.log(`[Stripe Webhook] ===== CHECKOUT SESSION COMPLETED =====`);
      console.log(`[Stripe Webhook] Session ID: ${session.id}`);
      console.log(`[Stripe Webhook] Appointment ID from metadata: ${appointmentId}`);
      console.log(`[Stripe Webhook] Session metadata:`, JSON.stringify(session.metadata));
      console.log(`[Stripe Webhook] Amount total: ${session.amount_total}`);
      console.log(`[Stripe Webhook] Payment intent: ${session.payment_intent}`);

      if (appointmentId) {
        try {
          console.log(`[Stripe Webhook] STEP 1: Querying for existing appointment ${appointmentId}...`);

          const { data: existing, error: fetchError } = await supabase
            .from("appointments")
            .select("payment_status, client_id")
            .eq("id", appointmentId)
            .maybeSingle();

          if (fetchError) {
            console.error(`[Stripe Webhook] ❌ ERROR fetching appointment:`, fetchError);
            throw fetchError;
          }

          console.log(`[Stripe Webhook] STEP 2: Existing appointment data:`, JSON.stringify(existing));

          if (existing?.payment_status === "paid") {
            console.log(`[Stripe Webhook] ✅ Appointment ${appointmentId} already paid, skipping update`);
          } else if (existing) {
            const amountPaid = (session.amount_total || 0) / 100;

            console.log(`[Stripe Webhook] STEP 3: Updating appointment to paid status...`);
            console.log(`[Stripe Webhook] Update payload:`, {
              payment_status: "paid",
              payment_provider: "stripe",
              stripe_payment_intent_id: session.payment_intent,
              amount_paid: amountPaid,
              paid_at: new Date().toISOString(),
            });

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
              console.error(`[Stripe Webhook] ❌ ERROR updating appointment:`, JSON.stringify(updateError));
              throw updateError;
            }

            console.log(`[Stripe Webhook] ✅ STEP 4: Appointment ${appointmentId} successfully updated to paid`);

            if (existing?.client_id) {
              console.log(`[Stripe Webhook] STEP 5: Updating client analytics for client ${existing.client_id}...`);

              const { error: clientUpdateError } = await supabase.rpc(
                "increment_client_visits",
                { client_id_param: existing.client_id }
              );

              if (clientUpdateError) {
                console.error(`[Stripe Webhook] ⚠️ WARNING: Error updating client analytics:`, JSON.stringify(clientUpdateError));
              } else {
                console.log(`[Stripe Webhook] ✅ STEP 6: Client analytics updated successfully`);
              }
            } else {
              console.log(`[Stripe Webhook] STEP 5: No client_id found, skipping analytics update`);
            }
          } else {
            console.error(`[Stripe Webhook] ❌ CRITICAL: Appointment ${appointmentId} NOT FOUND in database`);
            console.error(`[Stripe Webhook] This means the appointment was never created before checkout!`);
          }
        } catch (error) {
          console.error(`[Stripe Webhook] ❌❌❌ FATAL ERROR in checkout.session.completed handler:`, error);
          console.error(`[Stripe Webhook] Error details:`, JSON.stringify(error, null, 2));
        }
      } else {
        console.error(`[Stripe Webhook] ❌ No appointment_id in session metadata!`);
      }

      console.log(`[Stripe Webhook] ===== CHECKOUT SESSION COMPLETED HANDLER FINISHED =====`);
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