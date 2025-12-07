import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { validateBookingRules, formatBookingRuleError, getShopConfig } from '../lib/bookingRules';
import { sendConfirmation } from '../lib/notificationHelper';
import ClientHeader from '../components/ClientHeader';

type Barber = {
  id: string;
  name: string;
  public_display_name?: string;
  photo_url?: string;
};

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  price: number;
  duration_minutes: number;
};

export default function ClientBook() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [config, setConfig] = useState<{ days_bookable_in_advance: number; min_book_ahead_hours: number; client_booking_interval_minutes: number } | null>(null);
  const [shopInfo, setShopInfo] = useState<{ shop_name: string; phone: string | null }>({ shop_name: "Lupe's Barber", phone: null });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const preselectedBarber = searchParams.get('barber');
    if (preselectedBarber && barbers.length > 0) {
      const barber = barbers.find(b => b.id === preselectedBarber);
      if (barber) {
        setSelectedBarber(preselectedBarber);
      }
    }
  }, [searchParams, barbers]);

  useEffect(() => {
    const preselectedService = searchParams.get('service');
    if (preselectedService && services.length > 0) {
      const service = services.find(s => s.id === preselectedService);
      if (service) {
        setSelectedService(preselectedService);
      }
    }
  }, [searchParams, services]);

  useEffect(() => {
    if (selectedDate && config) {
      generateTimeSlots();
    }
  }, [selectedDate, config]);

  const loadInitialData = async () => {
    setLoading(true);
    console.log('🔵 [ClientBook] Starting loadInitialData...');

    try {
      // Step 1 shows all active barbers that are allowed on the client website.
      // Availability and booking rules are enforced later when generating time slots.
      console.log('🔵 [ClientBook] Building queries...');

      const barbersQuery = supabase
        .from('users')
        .select('id, name, public_display_name, photo_url')
        .eq('role', 'BARBER')
        .eq('active', true)
        .eq('show_on_client_site', true)
        .order('name');

      console.log('🔵 [ClientBook] Executing parallel queries...');
      const [barbersRes, servicesRes, shopConfig, shopConfigFull] = await Promise.all([
        barbersQuery,
        supabase.from('services').select('id, name_en, name_es, price, duration_minutes').eq('active', true).order('name_en'),
        getShopConfig(),
        supabase.from('shop_config').select('shop_name, phone, enable_confirmations').single()
      ]);

      console.log('📊 [ClientBook] Raw query results:', {
        barbersError: barbersRes.error,
        barbersStatus: barbersRes.status,
        barbersData: barbersRes.data,
        barbersCount: barbersRes.data?.length || 0,
        servicesError: servicesRes.error,
        servicesCount: servicesRes.data?.length || 0
      });

      if (barbersRes.error) {
        console.error('❌ [ClientBook] Error loading barbers:', {
          error: barbersRes.error,
          message: barbersRes.error.message,
          details: barbersRes.error.details,
          hint: barbersRes.error.hint,
          code: barbersRes.error.code
        });
        throw barbersRes.error;
      }

      if (servicesRes.error) {
        console.error('❌ [ClientBook] Error loading services:', servicesRes.error);
        throw servicesRes.error;
      }

      const loadedBarbers = barbersRes.data || [];
      const loadedServices = servicesRes.data || [];

      console.log('✅ [ClientBook] Data processed:', {
        barbersCount: loadedBarbers.length,
        barbers: loadedBarbers.map(b => ({
          id: b.id,
          name: b.name,
          public_display_name: b.public_display_name,
          has_photo: !!b.photo_url
        })),
        servicesCount: loadedServices.length,
        hasShopConfig: !!shopConfig
      });

      console.log('🔵 [ClientBook] Setting state with barbers:', loadedBarbers);
      setBarbers(loadedBarbers);
      setServices(loadedServices);

      if (shopConfigFull.data) {
        setShopInfo({
          shop_name: shopConfigFull.data.shop_name || "Lupe's Barber",
          phone: shopConfigFull.data.phone || null
        });
      }

      if (shopConfig) {
        console.log('✅ Using shop config from database');
        setConfig(shopConfig);
      } else {
        console.warn('⚠️ Shop config not available, using fallback defaults');
        const fallbackConfig = {
          days_bookable_in_advance: 30,
          min_book_ahead_hours: 2,
          client_booking_interval_minutes: 15,
        };
        setConfig(fallbackConfig);
      }
    } catch (error) {
      console.error('❌ Error loading booking page data:', error);
      const fallbackConfig = {
        days_bookable_in_advance: 30,
        min_book_ahead_hours: 2,
        client_booking_interval_minutes: 15,
      };
      setConfig(fallbackConfig);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    if (!config) return;

    const slots: string[] = [];
    const intervalMinutes = config.client_booking_interval_minutes || 15;

    for (let hour = 9; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }

    setTimeSlots(slots);
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    if (!config) return '';
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + config.days_bookable_in_advance);
    return maxDate.toISOString().split('T')[0];
  };

  const validateStep = async (currentStep: number): Promise<boolean> => {
    setError('');

    if (currentStep === 1 && !selectedBarber) {
      setError(language === 'en' ? 'Please select a barber' : 'Por favor selecciona un barbero');
      return false;
    }

    if (currentStep === 2 && !selectedService) {
      setError(language === 'en' ? 'Please select a service' : 'Por favor selecciona un servicio');
      return false;
    }

    if (currentStep === 3) {
      if (!selectedDate || !selectedTime) {
        setError(language === 'en' ? 'Please select date and time' : 'Por favor selecciona fecha y hora');
        return false;
      }

      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const validationError = await validateBookingRules(appointmentDateTime, 'create');

      if (validationError) {
        setError(formatBookingRuleError(validationError, language));
        return false;
      }
    }

    if (currentStep === 4) {
      if (!clientName.trim()) {
        setError(language === 'en' ? 'Please enter your name' : 'Por favor ingresa tu nombre');
        return false;
      }
      if (!clientPhone.trim()) {
        setError(language === 'en' ? 'Please enter your phone number' : 'Por favor ingresa tu número de teléfono');
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const isValid = await validateStep(4);
    if (!isValid) return;

    setSubmitting(true);
    setError('');

    try {
      let clientId = null;

      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone)
        .maybeSingle();

      if (existingClients) {
        clientId = existingClients.id;
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

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const selectedServiceData = services.find(s => s.id === selectedService);
      const amountDue = selectedServiceData?.price || 0;

      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barber_id: selectedBarber,
          client_id: clientId,
          service_id: selectedService,
          scheduled_start: appointmentDateTime.toISOString(),
          scheduled_end: new Date(appointmentDateTime.getTime() + (selectedServiceData?.duration_minutes || 30) * 60000).toISOString(),
          status: 'booked',
          notes: clientNotes || null,
          source: 'client_web',
          payment_status: 'unpaid',
          amount_due: amountDue,
          amount_paid: 0,
        })
        .select('id')
        .single();

      if (appointmentError) throw appointmentError;

      // Send confirmation SMS (don't block on failure)
      if (newAppointment && selectedBarberObj && selectedServiceData) {
        const barberName = selectedBarberObj.name;
        const serviceName = language === 'es' ? selectedServiceData.name_es : selectedServiceData.name_en;

        sendConfirmation({
          appointmentId: newAppointment.id,
          clientId: clientId,
          phoneNumber: clientPhone,
          scheduledStart: appointmentDateTime.toISOString(),
          barberName,
          serviceName,
          shopName: shopInfo.shop_name,
          shopPhone: shopInfo.phone || undefined,
          language,
        }).catch(err => {
          console.error('Failed to send confirmation:', err);
        });
      }

      // Create Stripe checkout session
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ appointmentId: newAppointment.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { url } = await response.json();

        if (url) {
          window.location.href = url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (stripeError) {
        console.error('Stripe checkout error:', stripeError);
        alert(language === 'en'
          ? 'Booking confirmed, but payment setup failed. You can pay when you arrive.'
          : 'Reserva confirmada, pero falló la configuración de pago. Puedes pagar cuando llegues.');
        navigate('/client/home');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(language === 'en' ? 'Failed to create booking. Please try again.' : 'Error al crear la reserva. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBarberObj = barbers.find(b => b.id === selectedBarber);
  const selectedServiceObj = services.find(s => s.id === selectedService);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <ClientHeader />
        <div style={{ textAlign: 'center', padding: '4rem', fontSize: '18px', color: '#666' }}>
          {language === 'en' ? 'Loading...' : 'Cargando...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClientHeader />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          {language === 'en' ? 'Book Appointment' : 'Reservar Cita'}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: step >= s ? '#e74c3c' : '#ddd',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #f5c6cb' }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Select Barber' : 'Seleccionar Barbero'}
              </h2>
              {barbers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'No barbers available for booking right now.' : 'No hay barberos disponibles para reservar en este momento.'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {language === 'en' ? 'Please contact the shop for assistance.' : 'Por favor contacta a la tienda para asistencia.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {barbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.id)}
                      style={{
                        padding: '1rem',
                        border: `2px solid ${selectedBarber === barber.id ? '#e74c3c' : '#ddd'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedBarber === barber.id ? '#fee' : 'white',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      {barber.photo_url && (
                        <img
                          src={barber.photo_url}
                          alt={barber.public_display_name || barber.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>
                          {barber.public_display_name || barber.name}
                        </div>
                        {barber.public_display_name && (
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {barber.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Select Service' : 'Seleccionar Servicio'}
              </h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${selectedService === service.id ? '#e74c3c' : '#ddd'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedService === service.id ? '#fee' : 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>
                          {language === 'es' ? service.name_es : service.name_en}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '0.25rem' }}>
                          {service.duration_minutes} {language === 'en' ? 'min' : 'min'}
                        </div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
                        ${service.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Select Date & Time' : 'Seleccionar Fecha y Hora'}
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                  {language === 'en' ? 'Date' : 'Fecha'}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  min={getMinDate()}
                  max={getMaxDate()}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' }}
                />
              </div>

              {selectedDate && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                    {language === 'en' ? 'Time' : 'Hora'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        style={{
                          padding: '0.75rem',
                          border: `2px solid ${selectedTime === time ? '#e74c3c' : '#ddd'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedTime === time ? '#e74c3c' : 'white',
                          color: selectedTime === time ? 'white' : '#000',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Your Information' : 'Tu Información'}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                  {language === 'en' ? 'Full Name' : 'Nombre Completo'}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={language === 'en' ? 'John Doe' : 'Juan Pérez'}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                  {language === 'en' ? 'Phone Number' : 'Número de Teléfono'}
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                  {language === 'en' ? 'Notes (Optional)' : 'Notas (Opcional)'}
                </label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder={language === 'en' ? 'Any special requests?' : '¿Alguna solicitud especial?'}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Confirm Booking' : 'Confirmar Reserva'}
              </h2>

              <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {selectedBarberObj?.name}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Service' : 'Servicio'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {language === 'es' ? selectedServiceObj?.name_es : selectedServiceObj?.name_en}
                  </div>
                  <div style={{ fontSize: '16px', color: '#e74c3c', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    ${selectedServiceObj?.price.toFixed(2)}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Date & Time' : 'Fecha y Hora'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {new Date(selectedDate).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {selectedTime}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Contact' : 'Contacto'}
                  </div>
                  <div style={{ fontSize: '16px' }}>{clientName}</div>
                  <div style={{ fontSize: '16px' }}>{clientPhone}</div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: submitting ? '#999' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                {submitting
                  ? (language === 'en' ? 'Processing...' : 'Procesando...')
                  : (language === 'en' ? 'Pay & Confirm' : 'Pagar y Confirmar')}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  color: '#000',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {language === 'en' ? 'Back' : 'Atrás'}
              </button>
            )}

            {step < 5 && (
              <button
                onClick={handleNext}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {language === 'en' ? 'Next' : 'Siguiente'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
