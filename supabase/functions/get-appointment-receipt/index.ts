import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const appointmentId = url.searchParams.get('appointment_id');

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing appointment_id parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_start,
        scheduled_end,
        amount_due,
        amount_paid,
        payment_status,
        status,
        notes,
        client:client_id (
          id,
          first_name,
          last_name,
          phone
        ),
        service:service_id (
          id,
          name_en,
          name_es,
          base_price,
          duration_minutes
        ),
        barber:barber_id (
          id,
          name,
          email
        )
      `)
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching appointment:', error);
      throw error;
    }

    if (!appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ appointment }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error in get-appointment-receipt:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});