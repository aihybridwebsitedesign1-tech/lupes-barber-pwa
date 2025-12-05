import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type Appointment = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  notes: string | null;
  barber_name: string | null;
  service_name_en: string;
  service_name_es: string;
};

export default function ClientAppointments() {
  const { language } = useLanguage();

  // Authentication state
  const [authStep, setAuthStep] = useState<'phone' | 'verify' | 'authenticated'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [_sessionToken, setSessionToken] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [_otpSent, setOtpSent] = useState(false);

  // Appointments state
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Handle phone submission and OTP request
  const handleRequestOTP = async () => {
    if (!phoneNumber.trim()) {
      setError(language === 'en' ? 'Please enter your phone number' : 'Por favor ingresa tu número de teléfono');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/client-otp?action=request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          language,
        }),
      });

      const result = await response.json();

      if (result.status === 'sent' || result.status === 'disabled') {
        setOtpSent(true);
        setAuthStep('verify');

        // If SMS is disabled (dev mode), show code in console
        if (result.code) {
          console.log('[DEV MODE] OTP Code:', result.code);
          setError(language === 'en'
            ? `DEV MODE: Your code is ${result.code}`
            : `MODO DEV: Tu código es ${result.code}`);
        }
      } else if (result.status === 'error') {
        setError(result.message || (language === 'en' ? 'Failed to send code. Please try again.' : 'Error al enviar código. Intenta de nuevo.'));
      }
    } catch (err) {
      console.error('[OTP Request] Error:', err);
      setError(language === 'en' ? 'Network error. Please check your connection.' : 'Error de red. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError(language === 'en' ? 'Please enter the 6-digit code' : 'Por favor ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/client-otp?action=verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          code: otpCode,
        }),
      });

      const result = await response.json();

      if (result.status === 'verified') {
        setSessionToken(result.sessionToken);
        setAuthStep('authenticated');
        await loadAppointments();
      } else {
        setError(result.message || (language === 'en' ? 'Invalid code. Please try again.' : 'Código inválido. Intenta de nuevo.'));
      }
    } catch (err) {
      console.error('[OTP Verify] Error:', err);
      setError(language === 'en' ? 'Verification failed. Please try again.' : 'Verificación fallida. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Load appointments for authenticated phone number
  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      // Find client by phone
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', phoneNumber)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!client) {
        setUpcomingAppointments([]);
        setPastAppointments([]);
        return;
      }

      // Fetch appointments
      const { data: appointments, error: apptsError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          scheduled_end,
          status,
          notes,
          users!appointments_barber_id_fkey (name),
          services!inner (name_en, name_es)
        `)
        .eq('client_id', client.id)
        .order('scheduled_start', { ascending: false });

      if (apptsError) throw apptsError;

      const now = new Date();
      const upcoming: Appointment[] = [];
      const past: Appointment[] = [];

      (appointments || []).forEach((apt: any) => {
        const appointment: Appointment = {
          id: apt.id,
          scheduled_start: apt.scheduled_start,
          scheduled_end: apt.scheduled_end,
          status: apt.status,
          notes: apt.notes,
          barber_name: apt.users?.name || null,
          service_name_en: apt.services.name_en,
          service_name_es: apt.services.name_es,
        };

        const aptDate = new Date(apt.scheduled_start);

        if (aptDate >= now && apt.status === 'booked') {
          upcoming.push(appointment);
        } else {
          past.push(appointment);
        }
      });

      setUpcomingAppointments(upcoming);
      setPastAppointments(past);
    } catch (error) {
      console.error('[Appointments] Load error:', error);
      setError(language === 'en' ? 'Failed to load appointments' : 'Error al cargar citas');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const formatAppointmentDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = language === 'es'
      ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = language === 'es'
      ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    return `${dayName}, ${monthName} ${dayNum}, ${year} - ${timeStr}`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; es: string; color: string }> = {
      booked: { en: 'Booked', es: 'Reservada', color: '#2e7d32' },
      completed: { en: 'Completed', es: 'Completada', color: '#1565c0' },
      cancelled: { en: 'Cancelled', es: 'Cancelada', color: '#d32f2f' },
      no_show: { en: 'No Show', es: 'No Asistió', color: '#f57c00' },
    };

    const label = labels[status] || { en: status, es: status, color: '#666' };
    return {
      text: language === 'en' ? label.en : label.es,
      color: label.color,
    };
  };

  // Phone input screen
  if (authStep === 'phone') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <ClientHeader />

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '3rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
              {language === 'en' ? 'My Appointments' : 'Mis Citas'}
            </h1>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
              {language === 'en'
                ? 'Enter your phone number to view and manage your appointments.'
                : 'Ingresa tu número de teléfono para ver y gestionar tus citas.'}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {language === 'en' ? 'Phone Number' : 'Número de Teléfono'}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={language === 'en' ? '+1 555-123-4567' : '+1 555-123-4567'}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleRequestOTP();
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', marginBottom: '1rem', color: '#856404' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleRequestOTP}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: loading ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading
                ? (language === 'en' ? 'Sending...' : 'Enviando...')
                : (language === 'en' ? 'Send Verification Code' : 'Enviar Código')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // OTP verification screen
  if (authStep === 'verify') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <ClientHeader />

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '3rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
              {language === 'en' ? 'Verify Code' : 'Verificar Código'}
            </h1>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
              {language === 'en'
                ? `We sent a 6-digit code to ${phoneNumber}. Please enter it below.`
                : `Enviamos un código de 6 dígitos a ${phoneNumber}. Ingrésalo a continuación.`}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {language === 'en' ? 'Verification Code' : 'Código de Verificación'}
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                disabled={loading}
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '0.5rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && otpCode.length === 6) handleVerifyOTP();
                }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ padding: '1rem', backgroundColor: '#ffe5e5', border: '1px solid #ffcccc', borderRadius: '8px', marginBottom: '1rem', color: '#d32f2f' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otpCode.length !== 6}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: loading || otpCode.length !== 6 ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || otpCode.length !== 6 ? 'default' : 'pointer',
                marginBottom: '1rem',
              }}
            >
              {loading
                ? (language === 'en' ? 'Verifying...' : 'Verificando...')
                : (language === 'en' ? 'Verify' : 'Verificar')}
            </button>

            <button
              onClick={() => {
                setAuthStep('phone');
                setOtpCode('');
                setError('');
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '16px',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Back' : 'Atrás'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated - show appointments
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClientHeader />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {language === 'en' ? 'My Appointments' : 'Mis Citas'}
          </h1>
          <button
            onClick={() => {
              setAuthStep('phone');
              setSessionToken(null);
              setPhoneNumber('');
              setOtpCode('');
              setUpcomingAppointments([]);
              setPastAppointments([]);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {language === 'en' ? 'Sign Out' : 'Cerrar Sesión'}
          </button>
        </div>

        {loadingAppointments ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
            {language === 'en' ? 'Loading...' : 'Cargando...'}
          </div>
        ) : (
          <>
            {/* Upcoming Appointments */}
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
                {language === 'en' ? 'Upcoming' : 'Próximas'}
              </h2>

              {upcomingAppointments.length === 0 ? (
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#666' }}>
                  {language === 'en'
                    ? 'No upcoming appointments.'
                    : 'No hay citas próximas.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: '2px solid #e3f2fd',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {language === 'es' ? apt.service_name_es : apt.service_name_en}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                            {formatAppointmentDateTime(apt.scheduled_start)}
                          </div>
                          {apt.barber_name && (
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              {language === 'en' ? 'with' : 'con'} {apt.barber_name}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#e3f2fd',
                            color: getStatusLabel(apt.status).color,
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        >
                          {getStatusLabel(apt.status).text}
                        </span>
                      </div>

                      {/* Cancel and Reschedule buttons will be added here */}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past Appointments */}
            <section>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
                {language === 'en' ? 'Past' : 'Pasadas'}
              </h2>

              {pastAppointments.length === 0 ? (
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#666' }}>
                  {language === 'en'
                    ? 'No past appointments.'
                    : 'No hay citas pasadas.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {pastAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        opacity: 0.8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {language === 'es' ? apt.service_name_es : apt.service_name_en}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                            {formatAppointmentDateTime(apt.scheduled_start)}
                          </div>
                          {apt.barber_name && (
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              {language === 'en' ? 'with' : 'con'} {apt.barber_name}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f5f5f5',
                            color: getStatusLabel(apt.status).color,
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        >
                          {getStatusLabel(apt.status).text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
