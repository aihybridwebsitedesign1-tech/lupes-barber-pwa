import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../lib/translations';

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  base_price: number;
  duration_minutes: number;
};

export default function Book() {
  const [step, setStep] = useState(1);
  const [bookingLanguage, setBookingLanguage] = useState<Language>('en');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setLanguage } = useLanguage();

  const getLocalDateString = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  };

  const t = bookingLanguage === 'en' ? {
    chooseLanguage: 'Choose Language',
    chooseService: 'Choose Service',
    chooseDateTime: 'Choose Date & Time',
    enterInfo: 'Enter Your Info',
    back: 'Back',
    next: 'Next',
    confirmBooking: 'Confirm Booking',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    optional: 'optional',
    date: 'Date',
    time: 'Time',
    price: 'Price',
    duration: 'Duration',
    minutes: 'minutes',
    bookingConfirmed: 'Booking Confirmed!',
    yourAppointment: 'Your appointment has been scheduled',
    bookAnother: 'Book Another',
    service: 'Service',
    loading: 'Loading...'
  } : {
    chooseLanguage: 'Elegir Idioma',
    chooseService: 'Elegir Servicio',
    chooseDateTime: 'Elegir Fecha y Hora',
    enterInfo: 'Ingresa Tu Información',
    back: 'Atrás',
    next: 'Siguiente',
    confirmBooking: 'Confirmar Reserva',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    email: 'Correo Electrónico',
    optional: 'opcional',
    date: 'Fecha',
    time: 'Hora',
    price: 'Precio',
    duration: 'Duración',
    minutes: 'minutos',
    bookingConfirmed: '¡Reserva Confirmada!',
    yourAppointment: 'Tu cita ha sido agendada',
    bookAnother: 'Reservar Otra',
    service: 'Servicio',
    loading: 'Cargando...'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('active', true);

    if (servicesData) setServices(servicesData);
  };

  const handleLanguageSelect = (lang: Language) => {
    setBookingLanguage(lang);
    setLanguage(lang);
    setStep(2);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(3);
  };

  const handleDateTimeConfirm = () => {
    if (!appointmentDate || !appointmentTime) {
      alert('Please select date and time');
      return;
    }
    setStep(4);
  };

  const handleConfirmBooking = async () => {
    if (!firstName || !lastName || !phone) {
      alert('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      let clientId = '';
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        await supabase
          .from('clients')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            language: bookingLanguage
          })
          .eq('id', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone,
            email: email || null,
            language: bookingLanguage
          })
          .select()
          .single();

        if (clientError) throw clientError;
        if (!newClient) throw new Error('Failed to create client');
        clientId = newClient.id;
      }

      if (!selectedService) throw new Error('No service selected');

      const startDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);

      const { error: aptError } = await supabase.from('appointments').insert({
        client_id: clientId,
        barber_id: null,
        service_id: selectedService.id,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        status: 'booked',
        channel: 'online_pwa',
        services_total: selectedService.base_price,
        products_total: 0,
        tax_amount: 0,
        tip_amount: 0,
        card_fee_amount: 0,
        total_charged: 0,
        net_revenue: 0
      });

      if (aptError) throw aptError;

      setConfirmed(true);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error creating appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setAppointmentDate('');
    setAppointmentTime('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setConfirmed(false);
  };

  const formatDateTime = () => {
    if (!appointmentDate || !appointmentTime) return '';
    const date = new Date(`${appointmentDate}T${appointmentTime}`);
    return date.toLocaleString(bookingLanguage === 'es' ? 'es-US' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1rem', color: '#28a745' }}>
            {t.bookingConfirmed}
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '2rem' }}>
            {t.yourAppointment}
          </p>
          <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>{t.service}:</strong> {selectedService && (bookingLanguage === 'es' ? selectedService.name_es : selectedService.name_en)}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>{t.date}:</strong> {formatDateTime()}
            </p>
          </div>
          <button
            onClick={resetBooking}
            style={{
              padding: '12px 24px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            {t.bookAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
            Lupe's Barber Shop
          </h1>

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.chooseLanguage}</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9f9f9',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '500',
                    textAlign: 'left'
                  }}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageSelect('es')}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9f9f9',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '500',
                    textAlign: 'left'
                  }}
                >
                  Español
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.chooseService}</h2>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#f9f9f9',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '0.5rem' }}>
                      {bookingLanguage === 'es' ? service.name_es : service.name_en}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                      {bookingLanguage === 'es' ? service.description_es : service.description_en}
                    </div>
                    <div style={{ fontSize: '14px', color: '#000', fontWeight: '500' }}>
                      ${service.base_price} • {service.duration_minutes} {t.minutes}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {t.back}
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.chooseDateTime}</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.date}
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={getLocalDateString()}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.time}
                </label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f5f5f5',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {t.back}
                </button>
                <button
                  onClick={handleDateTimeConfirm}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    flex: 1
                  }}
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.enterInfo}</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.firstName}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.lastName}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.email} ({t.optional})
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f5f5f5',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {t.back}
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    flex: 1,
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? t.loading : t.confirmBooking}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
