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

    const { data: shopConfig } = await supabase
      .from("shop_config")
      .select("tax_rate, card_processing_fee_rate")
      .single();

    const taxRate = Number(shopConfig?.tax_rate || 0);
    const cardFeeRate = Number(shopConfig?.card_processing_fee_rate || 0);

    const numericServicePrice = Number(service_price);
    const safeServicePrice = (isNaN(numericServicePrice) || numericServicePrice <= 0) ? 10.00 : numericServicePrice;
    const servicePriceCents = Math.round(safeServicePrice * 100);

    const taxAmountDollars = safeServicePrice * (taxRate / 100);
    const taxAmountCents = Math.round(taxAmountDollars * 100);

    const subtotal = safeServicePrice + taxAmountDollars;
    const cardFeeAmountDollars = subtotal * (cardFeeRate / 100);
    const cardFeeAmountCents = Math.round(cardFeeAmountDollars * 100);

    const tipAmountNum = Number(tip_amount || 0);
    const tipAmountCents = Math.round(tipAmountNum * 100);

    console.log("Pricing breakdown:", {
      service_price: safeServicePrice,
      servicePriceCents,
      taxRate,
      taxAmountCents,
      cardFeeRate,
      cardFeeAmountCents,
      tipAmountCents,
    });

    const successUrl = `${origin || ALLOWED_ORIGINS[0]}/client/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin || ALLOWED_ORIGINS[0]}/client/book`;

    const formData = new URLSearchParams();
    formData.append("mode", "payment");
    formData.append("payment_method_types[0]", "card");

    let lineItemIndex = 0;

    formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
    formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, service_name || "Barber Service");
    formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, servicePriceCents.toString());
    formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
    lineItemIndex++;

    if (taxAmountCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, "Sales Tax");
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, taxAmountCents.toString());
      formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
      lineItemIndex++;
    }

    if (cardFeeAmountCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, "Card Processing Fee");
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, cardFeeAmountCents.toString());
      formData.append(`line_items[${lineItemIndex}][quantity]`, "1");
      lineItemIndex++;
    }

    if (tipAmountCents > 0) {
      formData.append(`line_items[${lineItemIndex}][price_data][currency]`, "usd");
      formData.append(`line_items[${lineItemIndex}][price_data][product_data][name]`, "Tip");
      formData.append(`line_items[${lineItemIndex}][price_data][unit_amount]`, tipAmountCents.toString());
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
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});