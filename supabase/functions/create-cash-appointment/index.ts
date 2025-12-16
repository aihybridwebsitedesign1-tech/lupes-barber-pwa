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
    console.log('[Create Cash Appointment] ===== REQUEST RECEIVED =====');

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('[Create Cash Appointment] Request body:', JSON.stringify(body, null, 2));

    const {
      barber_id,
      service_id,
      scheduled_start,
      client_name,
      client_email,
      client_phone,
    } = body;

    if (!barber_id || !service_id || !scheduled_start || !client_name) {
      throw new Error('Missing required fields: barber_id, service_id, scheduled_start, client_name');
    }

    console.log('[Create Cash Appointment] STEP 1: Finding or creating client');

    const nameParts = client_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    let clientId: string;

    if (client_email) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', client_email)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log('[Create Cash Appointment] ✅ Existing client found:', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: client_email,
            phone: client_phone || null,
          })
          .select('id')
          .single();

        if (clientError) {
          console.error('[Create Cash Appointment] Error creating client:', clientError);
          throw clientError;
        }

        clientId = newClient.id;
        console.log('[Create Cash Appointment] ✅ New client created:', clientId);
      }
    } else if (client_phone) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', client_phone)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log('[Create Cash Appointment] ✅ Existing client found by phone:', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: client_phone,
          })
          .select('id')
          .single();

        if (clientError) {
          console.error('[Create Cash Appointment] Error creating client:', clientError);
          throw clientError;
        }

        clientId = newClient.id;
        console.log('[Create Cash Appointment] ✅ New client created:', clientId);
      }
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('[Create Cash Appointment] Error creating client:', clientError);
        throw clientError;
      }

      clientId = newClient.id;
      console.log('[Create Cash Appointment] ✅ New client created (name only):', clientId);
    }

    console.log('[Create Cash Appointment] STEP 2: Getting service details');

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', service_id)
      .single();

    if (serviceError) {
      console.error('[Create Cash Appointment] Error fetching service:', serviceError);
      throw serviceError;
    }

    const duration = service?.duration_minutes || 60;
    const startDate = new Date(scheduled_start);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    console.log('[Create Cash Appointment] STEP 3: Creating appointment');
    console.log('[Create Cash Appointment] Appointment details:', {
      client_id: clientId,
      barber_id,
      service_id,
      scheduled_start,
      scheduled_end: endDate.toISOString(),
      duration,
    });

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: clientId,
        barber_id: barber_id,
        service_id: service_id,
        scheduled_start: scheduled_start,
        scheduled_end: endDate.toISOString(),
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_method: 'cash',
        source: 'client_booking',
      })
      .select('id')
      .single();

    if (appointmentError) {
      console.error('[Create Cash Appointment] Error creating appointment:', appointmentError);
      throw appointmentError;
    }

    console.log('[Create Cash Appointment] ✅ Appointment created:', appointment.id);

    console.log('[Create Cash Appointment] STEP 4: Updating client analytics');

    const { error: analyticsError } = await supabase.rpc('increment_client_visits', {
      p_client_id: clientId,
    });

    if (analyticsError) {
      console.error('[Create Cash Appointment] Error updating analytics:', analyticsError);
    } else {
      console.log('[Create Cash Appointment] ✅ Client analytics updated');
    }

    console.log('[Create Cash Appointment] ===== SUCCESS =====');

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment.id,
        client_id: clientId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('[Create Cash Appointment] ERROR:', error.message);
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