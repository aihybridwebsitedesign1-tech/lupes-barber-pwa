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
    const { service_price, service_name, tip_amount } = body;

    let numericPrice = typeof service_price === 'number'
      ? service_price
      : parseFloat(String(service_price).replace(/[^0-9.]/g, ''));

    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new Error(`Invalid Price Received: ${service_price}`);
    }

    const { data: shopConfig } = await supabase
      .from("shop_config")
      .select("tax_rate, card_processing_fee_rate")
      .single();

    let taxRate = 0;
    let cardFeeRate = 0;

    if (shopConfig) {
      taxRate = Number(shopConfig.tax_rate || 0);
      cardFeeRate = Number(shopConfig.card_processing_fee_rate || 0);
    }

    const baseCents = Math.round(numericPrice * 100);
    const taxCents = Math.round(baseCents * (taxRate / 100));
    const feeCents = Math.round((baseCents + taxCents) * (cardFeeRate / 100));

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
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, `Processing Fee (${cardFeeRate}%)`);
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