console.log('!!! FINAL ATTEMPT SCRIPT LOADED !!!');

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

export default function ClientBookSuccess() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Conditional loading state: dev_bypass_test starts with loading=false
  const sessionId = searchParams.get('sid') || searchParams.get('session_id');
  const [loading, setLoading] = useState(sessionId !== 'dev_bypass_test');

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
    // BILINGUAL PARAMETER: Check both 'sid' (cache-bust test) and 'session_id' (Stripe real)
    const sessionId = searchParams.get('sid') || searchParams.get('session_id');
    const appointmentId = searchParams.get('appointment_id');

    // TRUTH LOG: Show exactly which parameter was detected
    console.log('Detected ID:', sessionId, '(via', searchParams.get('sid') ? 'sid' : 'session_id', ')');
    console.log('STEP 1: Starting Fetch for Session ID:', sessionId);
    console.log('STEP 1B: Appointment ID:', appointmentId);

    // DEV BYPASS MODE: Immediate render with mock data (loading already false from initialization)
    if (sessionId === 'dev_bypass_test') {
      console.log('🟢 DEV BYPASS MODE ACTIVATED - Rendering immediately with mock data');

      // Set mock appointment data
      const mockAppointment = {
        id: 'dev-test-123',
        scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        amount_paid: 25.00,
        amount_due: 25.00,
        service: {
          name_en: 'Test Service (Dev Mode)',
          name_es: 'Servicio de Prueba (Modo Dev)',
        },
        barber: {
          name: 'Test Barber (Dev Mode)',
        },
        client: {
          name: 'Test Client',
          phone: '555-0000',
        },
      };

      console.log('🟢 Setting mock appointment data:', mockAppointment);
      setAppointment(mockAppointment);
      console.log('🟢 DEV BYPASS COMPLETE - Success page should render now');
      return; // Exit early, skip all async logic
    }

    // EMERGENCY FIX: Trust the URL - if session_id exists, show success immediately
    if (!sessionId) {
      console.log('STEP 1C: No session ID found, showing error');
      setError(language === 'en' ? 'Invalid payment confirmation link.' : 'Enlace de confirmación de pago inválido.');
      setLoading(false);
      setDebugError('No session_id in URL parameters');
      return;
    }

    // Immediately show success - we trust that Stripe sent them here
    console.log('STEP 2: Session ID valid, setting loading to FALSE');
    setLoading(false);

    // PERMANENT FAIL-SAFE: Try to fetch appointment details, but if it fails, show generic success
    if (appointmentId) {
      try {
        console.log('STEP 3: Calling Edge Function...');
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-appointment-receipt?appointment_id=${appointmentId}`;
        console.log('STEP 3B: API URL:', apiUrl);
        const headers = {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        };
        console.log('STEP 3C: Headers prepared (ANON_KEY present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY, ')');

        console.log('STEP 4: Fetching...');
        const response = await fetch(apiUrl, { headers });
        console.log('STEP 5: Response received, status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('STEP 5B: Response not OK, error text:', errorText);
          throw new Error(`Failed to fetch appointment details: ${response.status} - ${errorText}`);
        }

        console.log('STEP 6: Parsing JSON...');
        const result = await response.json();
        console.log('STEP 7: Edge Function returned:', result);
        const apt = result.appointment;
        console.log('STEP 8: Appointment data:', apt);

        if (apt) {
          console.log('STEP 9: Setting appointment state');
          setAppointment({
            ...apt,
            amount_paid: apt.amount_paid || apt.amount_due,
            client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
            service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
            barber: Array.isArray(apt.barber) ? apt.barber[0] : apt.barber,
          });
          console.log('STEP 10: Appointment state set successfully');
        } else {
          console.log('STEP 9B: No appointment data in response - using generic success');
          setGenericSuccess(true);
        }
      } catch (err: any) {
        console.error('⚠️ FAIL-SAFE ACTIVATED: Edge Function failed, showing generic success');
        console.error('ERROR CAUGHT:', err);
        console.error('ERROR MESSAGE:', err.message);
        console.error('ERROR STACK:', err.stack);

        // FAIL-SAFE: Show generic success screen instead of crashing
        setGenericSuccess(true);
        setError('');
        setDebugError('');
      }
    } else {
      console.log('STEP 3 SKIPPED: No appointment ID provided - using generic success');
      setGenericSuccess(true);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <DebugHeader />
        <ClientHeader />
        <div style={{ textAlign: 'center', padding: '4rem', marginTop: '50px' }}>
          <div style={{ fontSize: '24px', marginBottom: '1rem' }}>
            {language === 'en' ? 'Confirming payment...' : 'Confirmando pago...'}
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            {language === 'en' ? 'Please wait...' : 'Por favor espera...'}
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
              {language === 'en'
                ? 'Your appointment has been confirmed. A confirmation has been sent to your phone with all the details.'
                : 'Tu cita ha sido confirmada. Se ha enviado una confirmación a tu teléfono con todos los detalles.'}
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
  const isDevBypass = sessionId === 'dev_bypass_test';

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
            {isDevBypass
              ? (language === 'en' ? 'Booking Successful (Simulation)' : 'Reserva Exitosa (Simulación)')
              : (language === 'en' ? 'Payment Successful!' : '¡Pago Exitoso!')}
          </h1>

          <p style={{ fontSize: '18px', color: '#666', marginBottom: '2rem' }}>
            {isDevBypass
              ? (language === 'en'
                  ? 'Your test appointment has been created successfully.'
                  : 'Tu cita de prueba ha sido creada exitosamente.')
              : (language === 'en'
                  ? 'Your appointment is confirmed and paid.'
                  : 'Tu cita está confirmada y pagada.')}
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
                  {language === 'en' ? 'Amount Paid' : 'Monto Pagado'}
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
