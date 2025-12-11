import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLIENT_URL = process.env.VITE_CLIENT_URL || 'http://localhost:5173';

interface CheckoutRequest {
  appointment_id: string;
  service_id?: string;
  barber_id?: string;
  client_name?: string;
  client_phone?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables:", {
        STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY
      });
      return res.status(500).json({ error: "Server configuration error" });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const {
      appointment_id,
      service_id,
      barber_id,
      client_name,
      client_phone,
    }: CheckoutRequest = req.body;

    if (!appointment_id) {
      return res.status(400).json({ error: 'appointment_id is required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    let query = supabase
      .from('appointments')
      .select(`
        id,
        amount_due,
        scheduled_start,
        service_id,
        barber_id,
        client:client_id (
          first_name,
          last_name,
          phone,
          email
        ),
        service:service_id (
          name_en,
          name_es,
          base_price
        ),
        barber:barber_id (
          name,
          display_name
        )
      `)
      .eq('id', appointment_id);

    const { data: appointment, error: aptError } = await query.single();

    if (aptError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const unwrap = (v: any) => (Array.isArray(v) ? v[0] : v);

    const client = unwrap(appointment.client);
    const service = unwrap(appointment.service);
    const barber = unwrap(appointment.barber);

    const amount = Math.round((appointment.amount_due || service?.base_price || 0) * 100);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const customerName = client_name ||
      (client ? `${client.first_name} ${client.last_name}`.trim() : 'Customer');
    const customerEmail = client?.email;
    const customerPhone = client_phone || client?.phone;

    const barberName = barber?.display_name || barber?.name || 'Staff';
    const serviceName = service?.name_en || 'Service';
    const appointmentDate = new Date(appointment.scheduled_start).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
              description: `Appointment on ${appointmentDate} with ${barberName}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      phone_number_collection: {
        enabled: true,
      },
      success_url: `${CLIENT_URL}/client/book/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointment_id}`,
      cancel_url: `${CLIENT_URL}/client/book?cancelled=true`,
      metadata: {
        appointment_id: appointment_id,
        service_id: service?.id || '',
        barber_id: barber?.id || '',
        customer_name: customerName,
        customer_phone: customerPhone || ''
      },
    });

    try {
      await supabase
        .from('appointments')
        .update({
          stripe_session_id: session.id,
          payment_provider: 'stripe',
        })
        .eq('id', appointment_id);
    } catch (dbError) {
      console.error('Supabase update error (non-fatal):', dbError);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
