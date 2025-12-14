import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY env var");
    }

    const body = await req.json();
    const { service_price, service_name } = body;

    const numericPrice = Number(service_price);
    const safePrice = (isNaN(numericPrice) || numericPrice <= 0) ? 1000 : numericPrice;
    const amount = Math.round(safePrice * 100);

    console.log("Creating checkout session:", {
      service_price,
      numericPrice,
      safePrice,
      amount
    });

    const successUrl = `${origin || ALLOWED_ORIGINS[0]}/client/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin || ALLOWED_ORIGINS[0]}/client/book`;

    const formData = new URLSearchParams();
    formData.append("mode", "payment");
    formData.append("payment_method_types[0]", "card");
    formData.append("line_items[0][price_data][currency]", "usd");
    formData.append("line_items[0][price_data][product_data][name]", service_name || "Barber Service");
    formData.append("line_items[0][price_data][unit_amount]", amount.toString());
    formData.append("line_items[0][quantity]", "1");
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