import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      clientNotes,
      barberId,
      serviceId,
      appointmentStart,
      appointmentEnd,
      grandTotal,
    } = body;

    // Validate required fields
    if (!clientName || !clientPhone || !barberId || !serviceId || !appointmentStart || !appointmentEnd) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create or find client
    let clientId = null;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', clientPhone)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nameParts = clientName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: clientPhone,
          notes: clientNotes || null,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        throw clientError;
      }
      clientId = newClient.id;
    }

    // Create appointment with 'paid' status for dev bypass
    const { data: newAppointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        barber_id: barberId,
        client_id: clientId,
        service_id: serviceId,
        scheduled_start: appointmentStart,
        scheduled_end: appointmentEnd,
        status: 'booked',
        notes: clientNotes || null,
        source: 'client_web',
        payment_status: 'paid',
        amount_due: grandTotal,
        amount_paid: grandTotal,
        is_test: true,
      })
      .select('id')
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw appointmentError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointmentId: newAppointment.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error in create-dev-appointment:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});