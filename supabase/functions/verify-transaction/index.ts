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
    console.log('[Verify Transaction] ===== REQUEST RECEIVED =====');

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      throw new Error("Missing session_id");
    }

    console.log('[Verify Transaction] Session ID:', session_id);

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('[Verify Transaction] Stripe API error:', errorText);
      throw new Error(`Failed to retrieve Stripe session: ${errorText}`);
    }

    const session = await stripeResponse.json();

    console.log('[Verify Transaction] Session status:', session.payment_status);
    console.log('[Verify Transaction] Session metadata:', JSON.stringify(session.metadata, null, 2));

    if (session.payment_status !== 'paid') {
      console.log('[Verify Transaction] Payment not completed yet');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Payment not completed',
          status: session.payment_status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const metadata = session.metadata || {};
    const appointmentId = metadata.appointment_id;

    if (!appointmentId) {
      console.error('[Verify Transaction] No appointment_id in metadata');
      throw new Error('No appointment_id in session metadata');
    }

    console.log('[Verify Transaction] STEP 1: Checking if appointment exists:', appointmentId);

    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, payment_status')
      .eq('id', appointmentId)
      .maybeSingle();

    if (checkError) {
      console.error('[Verify Transaction] Error checking appointment:', checkError);
      throw checkError;
    }

    if (existingAppointment) {
      console.log('[Verify Transaction] ✅ Appointment already exists');

      if (existingAppointment.payment_status !== 'paid') {
        console.log('[Verify Transaction] STEP 2: Updating payment status to paid');

        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_intent: session.payment_intent,
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.error('[Verify Transaction] Error updating appointment:', updateError);
          throw updateError;
        }

        console.log('[Verify Transaction] ✅ Appointment updated to paid');
      }

      return new Response(
        JSON.stringify({
          success: true,
          appointment_id: appointmentId,
          already_existed: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('[Verify Transaction] ⚠️ Appointment does NOT exist - Creating from metadata');
    console.log('[Verify Transaction] STEP 2: Creating appointment from Stripe metadata');

    const clientId = metadata.client_id;
    const barberId = metadata.barber_id;
    const serviceId = metadata.service_id;
    const startTime = metadata.start_time;
    const customerEmail = metadata.customer_email;

    if (!clientId || !barberId || !serviceId || !startTime) {
      console.error('[Verify Transaction] Missing required metadata:', {
        clientId,
        barberId,
        serviceId,
        startTime,
      });
      throw new Error('Incomplete metadata in Stripe session');
    }

    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    const duration = service?.duration_minutes || 60;
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    console.log('[Verify Transaction] STEP 3: Inserting new appointment');

    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        id: appointmentId,
        client_id: clientId,
        barber_id: barberId,
        service_id: serviceId,
        scheduled_start: startTime,
        scheduled_end: endDate.toISOString(),
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'card',
        payment_intent: session.payment_intent,
        source: 'client_booking',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Verify Transaction] Error creating appointment:', insertError);
      throw insertError;
    }

    console.log('[Verify Transaction] ✅ Appointment created successfully');

    console.log('[Verify Transaction] STEP 4: Updating client analytics');

    const { error: analyticsError } = await supabase.rpc('increment_client_visits', {
      p_client_id: clientId,
    });

    if (analyticsError) {
      console.error('[Verify Transaction] Error updating analytics:', analyticsError);
    } else {
      console.log('[Verify Transaction] ✅ Client analytics updated');
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointmentId,
        created_from_metadata: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('[Verify Transaction] ERROR:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});