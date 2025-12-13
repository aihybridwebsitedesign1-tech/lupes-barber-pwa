import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { validateBookingRules, formatBookingRuleError, getShopConfig } from '../lib/bookingRules';
import { sendCancellation, sendReschedule, formatAppointmentDate, formatAppointmentTime } from '../lib/notificationHelper';
import ClientHeader from '../components/ClientHeader';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import Footer from '../components/Footer';

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
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'partial' | null;
  amount_due: number;
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

  // Action modals state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [shopInfo, setShopInfo] = useState<{ shop_name: string; phone: string | null }>({ shop_name: "Lupe's Barber Shop", phone: null });

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
      // Find client by phone and load shop config
      const [clientRes, shopConfigRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id')
          .eq('phone', phoneNumber)
          .maybeSingle(),
        supabase
          .from('shop_config')
          .select('shop_name, phone')
          .single()
      ]);

      if (clientRes.error) throw clientRes.error;

      if (!clientRes.data) {
        setUpcomingAppointments([]);
        setPastAppointments([]);
        return;
      }

      const client = clientRes.data;

      // Store shop info for notifications
      if (shopConfigRes.data) {
        setShopInfo({
          shop_name: shopConfigRes.data.shop_name || "Lupe's Barber Shop",
          phone: shopConfigRes.data.phone || null
        });
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
          payment_status,
          amount_due,
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
          payment_status: apt.payment_status,
          amount_due: apt.amount_due || 0,
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

  // Cancel appointment handler
  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    setCancelling(true);
    try {
      // Find client
      const { data: client } = await supabase
        .from('clients')
        .select('id, language')
        .eq('phone', phoneNumber)
        .maybeSingle();

      if (!client) throw new Error('Client not found');

      // Update appointment status
      const note = cancelReason
        ? `Cancelled by client: ${cancelReason}`
        : 'Cancelled by client self-service';

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: selectedAppointment.notes
            ? `${selectedAppointment.notes}\n${note}`
            : note
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Send cancellation notification to client
      const clientLanguage = (client.language || language) as 'en' | 'es';
      sendCancellation({
        appointmentId: selectedAppointment.id,
        clientId: client.id,
        phoneNumber: phoneNumber,
        scheduledStart: selectedAppointment.scheduled_start,
        shopName: shopInfo.shop_name,
        shopPhone: shopInfo.phone || undefined,
        language: clientLanguage,
      }).catch(err => {
        console.error('Failed to send cancellation SMS:', err);
      });

      // Reload appointments
      await loadAppointments();

      // Show success message
      alert(language === 'en'
        ? 'Your appointment has been cancelled.'
        : 'Tu cita ha sido cancelada.');

      // Close modal
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert(language === 'en'
        ? 'Failed to cancel appointment. Please try again or contact the shop.'
        : 'Error al cancelar la cita. Intenta de nuevo o contacta a la tienda.');
    } finally {
      setCancelling(false);
    }
  };

  // Generate time slots for reschedule
  const generateTimeSlotsForReschedule = async () => {
    if (!rescheduleDate) return;

    const config = await getShopConfig();
    const intervalMinutes = config?.client_booking_interval_minutes || 15;

    const { data: shopConfigData } = await supabase
      .from('shop_config')
      .select('shop_hours')
      .single();

    const dayOfWeek = new Date(rescheduleDate).getDay();
    const shopHours = shopConfigData?.shop_hours as Record<string, { open: string; close: string } | null> | undefined;
    const dayHours = shopHours?.[dayOfWeek.toString()];

    let openHour = 9;
    let openMinute = 0;
    let closeHour = 19;
    let closeMinute = 0;

    if (dayHours && dayHours.open && dayHours.close) {
      const [oH, oM] = dayHours.open.split(':').map(Number);
      const [cH, cM] = dayHours.close.split(':').map(Number);
      openHour = oH;
      openMinute = oM;
      closeHour = cH;
      closeMinute = cM;
    }

    const slots: string[] = [];
    let currentHour = openHour;
    let currentMinute = openMinute;

    while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeStr);

      currentMinute += intervalMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    setTimeSlots(slots);
  };

  // Reschedule appointment handler
  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment) return;

    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError(language === 'en'
        ? 'Please select date and time'
        : 'Por favor selecciona fecha y hora');
      return;
    }

    setRescheduling(true);
    setRescheduleError('');

    try {
      // Find client
      const { data: client } = await supabase
        .from('clients')
        .select('id, language')
        .eq('phone', phoneNumber)
        .maybeSingle();

      if (!client) throw new Error('Client not found');

      // Validate booking rules
      const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const validationError = await validateBookingRules(newDateTime, 'reschedule');

      if (validationError) {
        setRescheduleError(formatBookingRuleError(validationError, language));
        return;
      }

      // Get service duration
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', (await supabase
          .from('appointments')
          .select('service_id')
          .eq('id', selectedAppointment.id)
          .single()).data?.service_id)
        .single();

      const durationMinutes = service?.duration_minutes || 30;
      const newEndTime = new Date(newDateTime.getTime() + durationMinutes * 60000);

      // Update appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          scheduled_start: newDateTime.toISOString(),
          scheduled_end: newEndTime.toISOString(),
          notes: selectedAppointment.notes
            ? `${selectedAppointment.notes}\nRescheduled by client self-service`
            : 'Rescheduled by client self-service'
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Send reschedule notification to client
      const clientLanguage = (client.language || language) as 'en' | 'es';
      sendReschedule({
        appointmentId: selectedAppointment.id,
        clientId: client.id,
        phoneNumber: phoneNumber,
        newScheduledStart: newDateTime.toISOString(),
        barberName: selectedAppointment.barber_name || 'our barber',
        shopName: shopInfo.shop_name,
        shopPhone: shopInfo.phone || undefined,
        language: clientLanguage,
      }).catch(err => {
        console.error('Failed to send reschedule SMS:', err);
      });

      // Reload appointments
      await loadAppointments();

      // Show success message
      const dateFormatted = formatAppointmentDate(newDateTime.toISOString(), language);
      const timeFormatted = formatAppointmentTime(newDateTime.toISOString());
      alert(language === 'en'
        ? `Your appointment has been rescheduled to ${dateFormatted} at ${timeFormatted}.`
        : `Tu cita ha sido reprogramada para ${dateFormatted} a las ${timeFormatted}.`);

      // Close modal
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setRescheduleError(language === 'en'
        ? 'Failed to reschedule appointment. Please try again or contact the shop.'
        : 'Error al reprogramar la cita. Intenta de nuevo o contacta a la tienda.');
    } finally {
      setRescheduling(false);
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
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
                          <PaymentStatusBadge status={apt.payment_status} size="small" />
                        </div>
                      </div>

                      {/* Payment info */}
                      {apt.payment_status === 'unpaid' && apt.amount_due > 0 && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          backgroundColor: '#fff3cd',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#856404' }}>
                              {language === 'en' ? 'Amount Due' : 'Monto Pendiente'}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#856404' }}>
                              ${apt.amount_due.toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/create-checkout-session`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ appointment_id: apt.id }),
                                });
                                const { url } = await response.json();
                                if (url) {
                                  window.location.href = url;
                                }
                              } catch (err) {
                                console.error('Error creating checkout:', err);
                                alert(language === 'en' ? 'Payment setup failed. Please try again.' : 'Configuración de pago falló. Intenta de nuevo.');
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                            }}
                          >
                            {language === 'en' ? 'Pay Now' : 'Pagar Ahora'}
                          </button>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setShowRescheduleModal(true);
                            setRescheduleDate('');
                            setRescheduleTime('');
                            setRescheduleError('');
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        >
                          {language === 'en' ? 'Reschedule' : 'Reprogramar'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAppointment(apt);
                            setShowCancelModal(true);
                            setCancelReason('');
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: 'transparent',
                            color: '#d32f2f',
                            border: '1px solid #d32f2f',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                          }}
                        >
                          {language === 'en' ? 'Cancel' : 'Cancelar'}
                        </button>
                      </div>
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

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'Cancel Appointment' : 'Cancelar Cita'}
            </h2>

            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              {language === 'en'
                ? 'Are you sure you want to cancel this appointment?'
                : '¿Estás seguro de que deseas cancelar esta cita?'}
            </p>

            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {language === 'es' ? selectedAppointment.service_name_es : selectedAppointment.service_name_en}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {formatAppointmentDateTime(selectedAppointment.scheduled_start)}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {language === 'en' ? 'Reason (optional)' : 'Razón (opcional)'}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={language === 'en' ? 'Let us know why you\'re cancelling' : 'Dinos por qué cancelas'}
                disabled={cancelling}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedAppointment(null);
                  setCancelReason('');
                }}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: cancelling ? 'default' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {language === 'en' ? 'Keep Appointment' : 'Mantener Cita'}
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: cancelling ? '#ccc' : '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: cancelling ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {cancelling
                  ? (language === 'en' ? 'Cancelling...' : 'Cancelando...')
                  : (language === 'en' ? 'Yes, Cancel' : 'Sí, Cancelar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'Reschedule Appointment' : 'Reprogramar Cita'}
            </h2>

            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Current:' : 'Actual:'}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {formatAppointmentDateTime(selectedAppointment.scheduled_start)}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {language === 'en' ? 'New Date' : 'Nueva Fecha'}
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  generateTimeSlotsForReschedule();
                }}
                disabled={rescheduling}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>

            {rescheduleDate && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {language === 'en' ? 'New Time' : 'Nueva Hora'}
                </label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  disabled={rescheduling}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                >
                  <option value="">
                    {language === 'en' ? 'Select time' : 'Selecciona hora'}
                  </option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rescheduleError && (
              <div style={{ padding: '1rem', backgroundColor: '#ffe5e5', border: '1px solid #ffcccc', borderRadius: '8px', marginBottom: '1rem', color: '#d32f2f' }}>
                {rescheduleError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedAppointment(null);
                  setRescheduleDate('');
                  setRescheduleTime('');
                  setRescheduleError('');
                }}
                disabled={rescheduling}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: rescheduling ? 'default' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleRescheduleAppointment}
                disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: rescheduling || !rescheduleDate || !rescheduleTime ? '#ccc' : '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: rescheduling || !rescheduleDate || !rescheduleTime ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {rescheduling
                  ? (language === 'en' ? 'Saving...' : 'Guardando...')
                  : (language === 'en' ? 'Reschedule' : 'Reprogramar')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
