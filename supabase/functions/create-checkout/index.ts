import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY env var");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('[Create Checkout] ===== REQUEST RECEIVED =====');
    console.log('[Create Checkout] FULL REQUEST BODY:', JSON.stringify(body, null, 2));

    const {
      service_name,
      tip_amount,
      barber_id,
      service_id,
      scheduled_start,
      start_time,
      client_id,
      customer_email,
      appointment_id,
    } = body;

    console.log('[Create Checkout] EXTRACTED METADATA:', {
      barber_id,
      service_id,
      scheduled_start,
      start_time,
      client_id,
      customer_email,
      appointment_id,
    });

    const rawPrice = body.service_price || body.price || body.amount || body.cost || body.servicePrice;

    let numericPrice = typeof rawPrice === 'number'
      ? rawPrice
      : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));

    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new Error(`Price is MISSING or INVALID. Received Body: ${JSON.stringify(body)}`);
    }

    const { data: shopConfig } = await supabase
      .from("shop_config")
      .select("tax_rate, card_processing_fee_rate")
      .single();

    // Note: Both rates are stored as decimals (e.g., 0.04 = 4%)
    let taxRate = 0;
    let cardFeeRate = 0;

    if (shopConfig) {
      taxRate = Number(shopConfig.tax_rate || 0);
      cardFeeRate = Number(shopConfig.card_processing_fee_rate || 0);
    }

    const baseCents = Math.round(numericPrice * 100);
    // Tax formula: same as processing fee - rate is already decimal (0.04 = 4%)
    const taxCents = Math.round(baseCents * taxRate);
    const feeCents = Math.round((baseCents + taxCents) * cardFeeRate);

    const tipAmountNum = Number(tip_amount || 0);
    const tipCents = Math.round(tipAmountNum * 100);

    console.log("Final calculated line items (cents):", {
      service: baseCents,
      tax: taxCents,
      processingFee: feeCents,
      tip: tipCents,
      taxRate,
      cardFeeRate,
    });

    const successUrl = `${origin || ALLOWED_ORIGINS[0]}/client/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin || ALLOWED_ORIGINS[0]}/client/book`;

    const formData = new URLSearchParams();
    formData.append("mode", "payment");
    formData.append("payment_method_types[0]", "card");

    let lineItemIndex = 0;

    formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
    formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, service_name || "Barber Service");
    formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, baseCents.toString());
    formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
    lineItemIndex++;

    if (taxCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, `Tax (${taxRate}%)`);
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, taxCents.toString());
      formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
      lineItemIndex++;
    }

    if (feeCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, `Processing Fee (${(cardFeeRate * 100).toFixed(2)}%)`);
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, feeCents.toString());
      formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
      lineItemIndex++;
    }

    if (tipCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, "Tip");
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, tipCents.toString());
      formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
    }

    formData.append("success_url", successUrl);
    formData.append("cancel_url", cancelUrl);

    const metadata: Record<string, string> = {};

    if (appointment_id) metadata.appointment_id = String(appointment_id);
    if (barber_id) metadata.barber_id = String(barber_id);
    if (service_id) metadata.service_id = String(service_id);
    if (scheduled_start || start_time) metadata.start_time = String(scheduled_start || start_time);
    if (client_id) metadata.client_id = String(client_id);
    if (customer_email) metadata.customer_email = String(customer_email);

    console.log('[Create Checkout] ===== METADATA TO SEND TO STRIPE =====');
    console.log('[Create Checkout] Metadata object:', JSON.stringify(metadata, null, 2));

    Object.keys(metadata).forEach((key) => {
      formData.append(`metadata[${key}]`, metadata[key]);
      formData.append(`payment_intent_data[metadata][${key}]`, metadata[key]);
    });

    console.log('[Create Checkout] FormData entries with metadata:');
    for (const [key, value] of formData.entries()) {
      if (key.includes('metadata')) {
        console.log(`  ${key} = ${value}`);
      }
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Stripe API error:", responseText);
      throw new Error(`Stripe API error: ${responseText}`);
    }

    const session = JSON.parse(responseText);

    console.log('[Create Checkout] ===== STRIPE SESSION CREATED =====');
    console.log('[Create Checkout] Session ID:', session.id);
    console.log('[Create Checkout] Session URL:', session.url);
    console.log('[Create Checkout] Session metadata from Stripe response:', JSON.stringify(session.metadata, null, 2));
    console.log('[Create Checkout] Payment intent from session:', session.payment_intent);

    if (!session.metadata || Object.keys(session.metadata).length === 0) {
      console.error('[Create Checkout] ❌ WARNING: Session metadata is empty! This will cause webhook failures!');
    } else {
      console.log('[Create Checkout] ✅ Session metadata successfully attached');
    }

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
    console.error("Checkout Error:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});