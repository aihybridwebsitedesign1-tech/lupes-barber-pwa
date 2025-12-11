import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ConfirmPaymentRequest {
    sessionId: string;
    appointmentId: string;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS handling
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        if (!STRIPE_SECRET_KEY) {
            throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY)');
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase is not configured (missing credentials)');
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });

        const { sessionId, appointmentId }: ConfirmPaymentRequest = req.body;

        if (!sessionId || !appointmentId) {
            return res.status(400).json({ success: false, error: "Missing session or appointment ID" });
        }

        // 1. Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        if (session.payment_status !== "paid") {
            return res.status(400).json({ success: false, error: "Payment not completed" });
        }

        // 2. Update Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });

        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                payment_status: "paid",
                amount_paid: (session.amount_total || 0) / 100,
                stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
                stripe_session_id: session.id,
            })
            .eq('id', appointmentId);

        if (updateError) {
            console.error('Supabase update error:', updateError);
            throw new Error('Failed to update appointment record');
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error confirming payment:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
}
