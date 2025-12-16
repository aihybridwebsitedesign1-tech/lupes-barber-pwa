console.log('!!! FINAL ATTEMPT SCRIPT LOADED !!!');

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

export default function ClientBookSuccess() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugError, setDebugError] = useState('');
  const [appointment, setAppointment] = useState<any>(null);
  const [genericSuccess, setGenericSuccess] = useState(false);

  // DEBUG HEADER: Always-on-top visual proof of cache bust
  const DebugHeader = () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        background: 'red',
        color: 'white',
        zIndex: 99999,
        textAlign: 'center',
        padding: '10px',
        fontWeight: 'bold',
        fontSize: '16px',
      }}
    >
      DEBUG MODE: V150 - CACHE BUSTED
    </div>
  );

  useEffect(() => {
    console.log('SUCCESS PAGE: Component mounted, starting load...');
    loadSuccessScreen();

    // 5-SECOND ESCAPE HATCH: Force stop loading after 5 seconds
    const timeoutId = setTimeout(() => {
      console.log('TIMEOUT: 5 seconds elapsed, forcing loading to stop');
      setLoading(false);
      setDebugError('TIMEOUT: Database or Edge Function took too long to respond (5 seconds).');
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const loadSuccessScreen = async () => {
    console.log('STEP 0: loadSuccessScreen called');
    const sessionId = searchParams.get('sid') || searchParams.get('session_id');
    const appointmentId = searchParams.get('appointment_id');
    const bookingType = searchParams.get('type');

    console.log('STEP 1: Session ID:', sessionId);
    console.log('STEP 1B: Appointment ID:', appointmentId);
    console.log('STEP 1C: Booking Type:', bookingType);

    // CASH BOOKING MODE: No payment required
    if (bookingType === 'cash' && appointmentId) {
      console.log('STEP 2: Cash booking mode - showing success immediately');
      setGenericSuccess(true);
      setLoading(false);
      return;
    }

    // STRIPE BOOKING MODE: Verify payment
    if (!sessionId) {
      console.log('STEP 1D: No session ID found, showing error');
      setError(language === 'en' ? 'Invalid payment confirmation link.' : 'Enlace de confirmación de pago inválido.');
      setLoading(false);
      setDebugError('No session_id in URL parameters');
      return;
    }

    // RESCUE FLOW: Call verify-transaction to ensure appointment exists
    console.log('STEP 2: Calling verify-transaction to rescue stuck transactions');
    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-transaction', {
        body: { session_id: sessionId }
      });

      if (verifyError) {
        console.error('STEP 2 ERROR:', verifyError);
      } else {
        console.log('STEP 2 SUCCESS:', verifyData);
        if (verifyData?.appointment_id) {
          console.log('STEP 2: Appointment rescued/verified:', verifyData.appointment_id);
        }
      }
    } catch (err: any) {
      console.error('STEP 2 EXCEPTION:', err.message);
    }

    // SMART POLLING: Wait for Stripe webhook to complete
    if (appointmentId) {
      console.log('STEP 2: Starting smart polling for appointment:', appointmentId);
      const maxAttempts = 15;
      const pollInterval = 2000;
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`POLL ATTEMPT ${attempts}/${maxAttempts}`);

        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-appointment-receipt?appointment_id=${appointmentId}`;
          const headers = {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          };

          const response = await fetch(apiUrl, { headers });

          if (response.ok) {
            const result = await response.json();
            const apt = result.appointment;

            // Show success for ANY appointment that exists (except cancelled/no_show)
            if (apt) {
              // Only exclude explicitly failed/cancelled appointments
              if (['cancelled', 'no_show'].includes(apt.status)) {
                console.log(`❌ Appointment found but has invalid status: ${apt.status}`);
                setError(language === 'en' ? 'This appointment has been cancelled.' : 'Esta cita ha sido cancelada.');
                setLoading(false);
                return;
              }

              // For all other statuses, show success immediately
              console.log(`✅ APPOINTMENT FOUND - Status: ${apt.status}, Payment: ${apt.payment_status}`);
              setAppointment({
                ...apt,
                amount_paid: apt.amount_paid || apt.amount_due,
                client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
                service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
                barber: Array.isArray(apt.barber) ? apt.barber[0] : apt.barber,
              });
              setLoading(false);
              return;
            } else {
              console.log('⏳ Appointment not found yet - continuing to poll...');
            }
          } else {
            console.log(`⏳ Response not OK (${response.status}) - continuing to poll...`);
          }
        } catch (err: any) {
          console.log('⏳ Fetch error - continuing to poll...', err.message);
        }

        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }

      console.log('⚠️ POLLING TIMEOUT - Showing generic success with processing message');
      setGenericSuccess(true);
      setLoading(false);
    } else {
      console.log('STEP 2: No appointment ID provided - using generic success');
      setGenericSuccess(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <DebugHeader />
        <ClientHeader />
        <div style={{ textAlign: 'center', padding: '4rem', marginTop: '50px' }}>
          <div style={{ fontSize: '48px', marginBottom: '1.5rem' }}>⏳</div>
          <div style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: '600' }}>
            {language === 'en' ? 'Verifying Payment...' : 'Verificando Pago...'}
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            {language === 'en' ? 'Please wait while we confirm your payment.' : 'Por favor espera mientras confirmamos tu pago.'}
          </div>
        </div>
      </div>
    );
  }

  if (debugError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <DebugHeader />
        <ClientHeader />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', marginTop: '50px' }}>
          <div
            style={{
              backgroundColor: '#ff4444',
              border: '3px solid #cc0000',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              color: 'white',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🔴</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
              DEBUG ERROR
            </div>
            <div
              style={{
                fontSize: '16px',
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                textAlign: 'left',
              }}
            >
              {debugError}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '1.5rem', opacity: 0.9 }}>
              {language === 'en'
                ? 'Check the browser console (F12) for detailed logs.'
                : 'Revisa la consola del navegador (F12) para registros detallados.'}
            </div>
            <button
              onClick={() => navigate('/client/home')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#ff4444',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {language === 'en' ? 'Go Home' : 'Ir al Inicio'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <DebugHeader />
        <ClientHeader />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem', marginTop: '50px' }}>
          <div
            style={{
              backgroundColor: '#fee',
              border: '2px solid #fcc',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Error' : 'Error'}
            </div>
            <div style={{ fontSize: '16px', marginBottom: '1.5rem', color: '#666' }}>
              {error}
            </div>
            <button
              onClick={() => navigate('/client/home')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {language === 'en' ? 'Go Home' : 'Ir al Inicio'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GENERIC SUCCESS SCREEN: Fail-safe for when appointment details cannot be fetched
  if (genericSuccess) {
    const bookingType = searchParams.get('type');
    const isCashBooking = bookingType === 'cash';

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
        <DebugHeader />
        <ClientHeader />

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem', marginTop: '50px' }}>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>✅</div>

            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#10b981' }}>
              {language === 'en' ? 'Booking Successful!' : '¡Reserva Exitosa!'}
            </h1>

            <p style={{ fontSize: '18px', color: '#666', marginBottom: '2rem' }}>
              {isCashBooking
                ? (language === 'en'
                  ? 'Your appointment has been confirmed. You can pay at the shop when you arrive.'
                  : 'Tu cita ha sido confirmada. Puedes pagar en la tienda cuando llegues.')
                : (language === 'en'
                  ? 'Your appointment has been confirmed. A confirmation has been sent to your phone with all the details.'
                  : 'Tu cita ha sido confirmada. Se ha enviado una confirmación a tu teléfono con todos los detalles.')
              }
            </p>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '16px', color: '#166534', marginBottom: '0.5rem' }}>
                {language === 'en'
                  ? 'Check your messages for appointment details including date, time, and barber information.'
                  : 'Revisa tus mensajes para los detalles de la cita, incluyendo fecha, hora e información del barbero.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <button
                onClick={() => navigate('/client/appointments')}
                style={{
                  padding: '1rem',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                {language === 'en' ? 'View My Appointments' : 'Ver Mis Citas'}
              </button>

              <button
                onClick={() => navigate('/client/home')}
                style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  color: '#000',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {language === 'en' ? 'Back to Home' : 'Volver al Inicio'}
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const appointmentDate = appointment ? new Date(appointment.scheduled_start) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <DebugHeader />
      <ClientHeader />

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem', marginTop: '50px' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>✅</div>

          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#10b981' }}>
            {appointment.payment_status === 'paid'
              ? (language === 'en' ? 'Payment Successful!' : '¡Pago Exitoso!')
              : (language === 'en' ? 'Booking Confirmed!' : '¡Reserva Confirmada!')
            }
          </h1>

          <p style={{ fontSize: '18px', color: '#666', marginBottom: '2rem' }}>
            {appointment.payment_status === 'paid'
              ? (language === 'en'
                ? 'Your appointment is confirmed and paid.'
                : 'Tu cita está confirmada y pagada.')
              : (language === 'en'
                ? 'Your appointment is confirmed. You can pay at the shop when you arrive.'
                : 'Tu cita está confirmada. Puedes pagar en la tienda cuando llegues.')
            }
          </p>

          {appointment && appointmentDate && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'left',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                  {language === 'en' ? 'Service' : 'Servicio'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {language === 'es' ? appointment.service?.name_es : appointment.service?.name_en}
                </div>
              </div>

              {appointment.barber && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {appointment.barber.name}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                  {language === 'en' ? 'Date & Time' : 'Fecha y Hora'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {appointmentDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {appointmentDate.toLocaleTimeString(language === 'en' ? 'en-US' : 'es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                  {appointment.payment_status === 'paid'
                    ? (language === 'en' ? 'Amount Paid' : 'Monto Pagado')
                    : (language === 'en' ? 'Amount Due' : 'Monto a Pagar')
                  }
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                  ${(appointment.amount_paid || appointment.amount_due || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {!appointment && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'center',
                color: '#666',
              }}
            >
              {language === 'en'
                ? 'Your appointment details will appear in "My Appointments".'
                : 'Los detalles de tu cita aparecerán en "Mis Citas".'}
            </div>
          )}

          {appointment && (
            <div
              style={{
                backgroundColor: '#fff8e1',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem', color: '#ff6f00' }}>
                {language === 'en' ? '📋 Save This Link to Manage Your Appointment' : '📋 Guarda Este Enlace para Gestionar Tu Cita'}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.75rem' }}>
                {language === 'en'
                  ? 'You will need this link to reschedule or cancel:'
                  : 'Necesitarás este enlace para reprogramar o cancelar:'}
              </div>
              <div
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  marginBottom: '1rem',
                  color: '#333',
                }}
              >
                {`https://lupesbarbershop.com/client/appointments?id=${appointment.id}`}
              </div>
              <button
                onClick={() => {
                  const url = `https://lupesbarbershop.com/client/appointments?id=${appointment.id}`;
                  navigator.clipboard.writeText(url);
                  alert(language === 'en' ? 'Link copied to clipboard!' : '¡Enlace copiado al portapapeles!');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ff6f00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  width: '100%',
                }}
              >
                {language === 'en' ? '📋 Copy Link' : '📋 Copiar Enlace'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <button
              onClick={() => navigate('/client/appointments')}
              style={{
                padding: '1rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {language === 'en' ? 'View My Appointments' : 'Ver Mis Citas'}
            </button>

            <button
              onClick={() => navigate('/client/home')}
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                color: '#000',
                border: '2px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {language === 'en' ? 'Back to Home' : 'Volver al Inicio'}
            </button>
          </div>

          <div style={{ marginTop: '2rem', fontSize: '14px', color: '#666' }}>
            {language === 'en'
              ? 'A confirmation has been sent to your phone.'
              : 'Se ha enviado una confirmación a tu teléfono.'}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
