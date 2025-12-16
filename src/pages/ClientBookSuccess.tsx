import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

interface AppointmentDetails {
  id: string;
  scheduled_start: string;
  amount_due: number;
  amount_paid: number;
  payment_status: string;
  status: string;
  service?: {
    name_en: string;
    name_es: string;
  };
  barber?: {
    name: string;
  };
}

export default function ClientBookSuccess() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const appointmentId = searchParams.get('appointment_id');
  const bookingType = searchParams.get('type');
  const isCashBooking = bookingType === 'cash';

  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  useEffect(() => {
    if (!appointmentId) {
      console.log('No appointment ID in URL');
      return;
    }

    console.log('Fetching appointment details in background for ID:', appointmentId);

    const fetchAppointmentDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_start,
            amount_due,
            amount_paid,
            payment_status,
            status,
            service:services(name_en, name_es),
            barber:users(name)
          `)
          .eq('id', appointmentId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching appointment details:', error);
          setDetailsLoaded(true);
          return;
        }

        if (data) {
          console.log('Appointment details loaded:', data);
          setAppointmentDetails({
            ...data,
            service: Array.isArray(data.service) ? data.service[0] : data.service,
            barber: Array.isArray(data.barber) ? data.barber[0] : data.barber,
          });
        }

        setDetailsLoaded(true);
      } catch (err: any) {
        console.error('Exception fetching appointment details:', err.message);
        setDetailsLoaded(true);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId]);

  const appointmentDate = appointmentDetails?.scheduled_start
    ? new Date(appointmentDetails.scheduled_start)
    : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <ClientHeader />

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem', marginTop: '50px', flex: 1 }}>
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
                ? 'Your appointment has been confirmed and paid.'
                : 'Tu cita ha sido confirmada y pagada.')
            }
          </p>

          {appointmentDetails && appointmentDate ? (
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
                  {language === 'es' ? appointmentDetails.service?.name_es : appointmentDetails.service?.name_en}
                </div>
              </div>

              {appointmentDetails.barber && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {appointmentDetails.barber.name}
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
                  {appointmentDetails.payment_status === 'paid'
                    ? (language === 'en' ? 'Amount Paid' : 'Monto Pagado')
                    : (language === 'en' ? 'Amount Due' : 'Monto a Pagar')
                  }
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                  ${(appointmentDetails.amount_paid || appointmentDetails.amount_due || 0).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
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
              <p style={{ fontSize: '16px', color: '#166534', marginBottom: '0' }}>
                {detailsLoaded
                  ? (language === 'en'
                    ? 'Your appointment is confirmed. Check your messages for details.'
                    : 'Tu cita está confirmada. Revisa tus mensajes para los detalles.')
                  : (language === 'en'
                    ? 'Loading appointment details...'
                    : 'Cargando detalles de la cita...')
                }
              </p>
            </div>
          )}

          {appointmentId && (
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
                {`https://lupesbarbershop.com/client/appointments?id=${appointmentId}`}
              </div>
              <button
                onClick={() => {
                  const url = `https://lupesbarbershop.com/client/appointments?id=${appointmentId}`;
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
            {appointmentId && (
              <button
                onClick={() => navigate(`/client/appointments?id=${appointmentId}`)}
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
                {language === 'en' ? '🔗 Manage This Appointment' : '🔗 Gestionar Esta Cita'}
              </button>
            )}

            <button
              onClick={() => navigate('/client/appointments')}
              style={{
                padding: '1rem',
                backgroundColor: appointmentId ? 'white' : '#e74c3c',
                color: appointmentId ? '#000' : 'white',
                border: appointmentId ? '2px solid #ddd' : 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: appointmentId ? '600' : 'bold',
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
