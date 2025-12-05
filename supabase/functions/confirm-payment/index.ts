import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfirmRequest {
  sessionId: string;
  appointmentId: string;
}

async function confirmStripePayment(sessionId: string, appointmentId: string) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Stripe error:", error);
    throw new Error("Failed to retrieve Stripe session");
  }

  const session = await response.json();

  if (session.payment_status !== "paid") {
    return {
      success: false,
      status: session.payment_status,
      message: "Payment not completed",
    };
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select("id, amount_due, payment_status")
    .eq("id", appointmentId)
    .single();

  if (aptError || !appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.payment_status === "paid") {
    return {
      success: true,
      alreadyPaid: true,
      message: "Payment already confirmed",
    };
  }

  const amountPaid = session.amount_total / 100;

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
    console.error("Error updating appointment:", updateError);
    throw new Error("Failed to update appointment");
  }

  return {
    success: true,
    alreadyPaid: false,
    amountPaid,
    message: "Payment confirmed successfully",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sessionId, appointmentId }: ConfirmRequest = await req.json();

    if (!sessionId || !appointmentId) {
      return new Response(
        JSON.stringify({ error: "sessionId and appointmentId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await confirmStripePayment(sessionId, appointmentId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
