import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

export default function ClientBookSuccess() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    confirmPayment();
  }, []);

  const confirmPayment = async () => {
    const sessionId = searchParams.get('session_id');
    const appointmentId = searchParams.get('appointment_id');

    if (!sessionId || !appointmentId) {
      setError(language === 'en' ? 'Invalid payment confirmation link.' : 'Enlace de confirmación de pago inválido.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, appointmentId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Payment confirmation failed');
      }

      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          client:client_id (first_name, last_name),
          service:service_id (name_en, name_es),
          barber:barber_id (name),
          amount_paid
        `)
        .eq('id', appointmentId)
        .single();

      if (aptError) throw aptError;

      setAppointment({
        ...apt,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
        barber: Array.isArray(apt.barber) ? apt.barber[0] : apt.barber,
      });
    } catch (err) {
      console.error('Error confirming payment:', err);
      setError(language === 'en'
        ? 'There was an issue confirming your payment. Please contact the shop.'
        : 'Hubo un problema al confirmar tu pago. Por favor contacta al negocio.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <ClientHeader />
        <div style={{ textAlign: 'center', padding: '4rem' }}>
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

  if (error || !appointment) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <ClientHeader />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
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

  const appointmentDate = new Date(appointment.scheduled_start);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <ClientHeader />

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
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
            {language === 'en' ? 'Payment Successful!' : '¡Pago Exitoso!'}
          </h1>

          <p style={{ fontSize: '18px', color: '#666', marginBottom: '2rem' }}>
            {language === 'en'
              ? 'Your appointment is confirmed and paid.'
              : 'Tu cita está confirmada y pagada.'}
          </p>

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
                {language === 'es' ? appointment.service.name_es : appointment.service.name_en}
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
                ${appointment.amount_paid.toFixed(2)}
              </div>
            </div>
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
