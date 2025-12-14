import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CLIENT_URL = Deno.env.get("CLIENT_URL") || SUPABASE_URL?.replace(".supabase.co", ".netlify.app") || "http://localhost:5173";

const ALLOWED_ORIGINS = [
  "https://lupesbarbershop.com",
  "https://www.lupesbarbershop.com",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

interface CheckoutRequest {
  appointment_id: string;
}

async function createStripeCheckout(appointmentId: string) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select(`
      id,
      amount_due,
      scheduled_start,
      client:client_id (
        first_name,
        last_name,
        phone,
        email
      ),
      service:service_id (
        name_en
      ),
      barber:barber_id (
        name
      )
    `)
    .eq("id", appointmentId)
    .single();

  if (aptError || !appointment) {
    throw new Error("Appointment not found");
  }

  const amount = Math.round((appointment.amount_due || 0) * 100);

  if (amount <= 0) {
    throw new Error("Invalid amount");
  }

  const client = Array.isArray(appointment.client) ? appointment.client[0] : appointment.client;
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service;
  const barber = Array.isArray(appointment.barber) ? appointment.barber[0] : appointment.barber;

  const checkoutData = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: service?.name_en || "Haircut Service",
            description: `Appointment on ${new Date(appointment.scheduled_start).toLocaleDateString()}${barber?.name ? ` with ${barber.name}` : ''}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    customer_email: client?.email || undefined,
    success_url: `${CLIENT_URL}/client/book/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
    cancel_url: `${CLIENT_URL}/client/book?cancelled=true`,
    metadata: {
      appointment_id: appointmentId,
    },
  };

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(checkoutData as any).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Stripe error:", error);
    throw new Error("Failed to create Stripe checkout session");
  }

  const session = await response.json();

  await supabase
    .from("appointments")
    .update({
      stripe_session_id: session.id,
      payment_provider: "stripe",
    })
    .eq("id", appointmentId);

  return session;
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
    const { appointment_id }: CheckoutRequest = await req.json();

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "appointment_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const session = await createStripeCheckout(appointment_id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});