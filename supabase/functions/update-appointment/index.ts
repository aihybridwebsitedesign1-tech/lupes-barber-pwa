import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://lupesbarbershop.com",
  "https://www.lupesbarbershop.com",
  "http://localhost:5173",
  "http://localhost:5000",
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
    console.log('[Update Appointment] ===== REQUEST RECEIVED =====');

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('[Update Appointment] Request body:', JSON.stringify(body, null, 2));

    const { appointment_id, action, new_date, new_time, cancel_reason } = body;

    if (!appointment_id || !action) {
      throw new Error('Missing required fields: appointment_id, action');
    }

    // Verify appointment exists
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, scheduled_start, scheduled_end, service_id')
      .eq('id', appointment_id)
      .single();

    if (fetchError || !existingAppointment) {
      console.error('[Update Appointment] Appointment not found:', fetchError);
      throw new Error('Appointment not found');
    }

    console.log('[Update Appointment] Found appointment:', existingAppointment.id);

    if (action === 'cancel') {
      console.log('[Update Appointment] Processing cancellation');

      const note = cancel_reason
        ? `Cancelled by client: ${cancel_reason}`
        : 'Cancelled by client self-service';

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: note
        })
        .eq('id', appointment_id);

      if (updateError) {
        console.error('[Update Appointment] Cancel error:', updateError);
        throw updateError;
      }

      console.log('[Update Appointment] Appointment cancelled successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Appointment cancelled' }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === 'reschedule') {
      console.log('[Update Appointment] Processing reschedule');

      if (!new_date || !new_time) {
        throw new Error('Missing required fields for reschedule: new_date, new_time');
      }

      // Get service duration
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', existingAppointment.service_id)
        .single();

      const durationMinutes = service?.duration_minutes || 30;

      // Calculate new start and end times
      // CRITICAL: Interpret incoming date/time as America/Chicago (CST/CDT) timezone
      // Append -06:00 offset to ensure correct interpretation (CST = UTC-6)
      const newDateTime = new Date(`${new_date}T${new_time}:00-06:00`);
      const newEndTime = new Date(newDateTime.getTime() + durationMinutes * 60000);

      console.log('[Update Appointment] New schedule (with CST timezone):', {
        start: newDateTime.toISOString(),
        end: newEndTime.toISOString()
      });

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          scheduled_start: newDateTime.toISOString(),
          scheduled_end: newEndTime.toISOString(),
          notes: 'Rescheduled by client self-service'
        })
        .eq('id', appointment_id);

      if (updateError) {
        console.error('[Update Appointment] Reschedule error:', updateError);
        throw updateError;
      }

      console.log('[Update Appointment] Appointment rescheduled successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Appointment rescheduled',
          new_start: newDateTime.toISOString(),
          new_end: newEndTime.toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error('Invalid action. Must be "cancel" or "reschedule"');

  } catch (error) {
    console.error('[Update Appointment] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
