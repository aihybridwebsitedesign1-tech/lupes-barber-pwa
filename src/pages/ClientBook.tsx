import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { validateBookingRules, formatBookingRuleError, getShopConfig, generateAvailableSlotsForBarber } from '../lib/bookingRules';
import { sendConfirmation } from '../lib/notificationHelper';
import { formatTime12h } from '../utils/dateTime';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

const debug = (...args: any[]) => {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.log('[ClientBook]', ...args);
};

const debugError = (...args: any[]) => {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.error('[ClientBook]', ...args);
};

type Barber = {
  id: string;
  name: string;
  public_display_name?: string;
  photo_url?: string;
  active?: boolean;
  show_on_client_site?: boolean;
  accept_online_bookings?: boolean;
};

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  base_price: number;
  duration_minutes: number;
};

export default function ClientBook() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

  const [step, setStep] = useState(1);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [rawBarbersFromDb, setRawBarbersFromDb] = useState<Barber[]>([]);
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
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');

  const [timeSlots, setTimeSlots] = useState<{ start: string; end: string }[]>([]);
  const [config, setConfig] = useState<{ days_bookable_in_advance: number; min_book_ahead_hours: number; min_cancel_ahead_hours: number; client_booking_interval_minutes: number } | null>(null);
  const [shopInfo, setShopInfo] = useState<{ shop_name: string; phone: string | null }>({ shop_name: "Lupe's Barber Shop", phone: null });
  const [shopSettings, setShopSettings] = useState<{ tax_rate: number; card_processing_fee_rate: number; tip_percentage_presets: number[]; enable_tipping: boolean } | null>(null);

  // TEST MODE: When true, bookings are marked as test data, SMS not sent, payments forced to "pay in shop"
  const [testMode, setTestMode] = useState(false);

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
    if (selectedDate && selectedBarber && selectedService && config) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedBarber, selectedService, config]);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');

    try {
      debug('[ClientBook BARBERS] === STARTING DATA LOAD ===');

      // Check current session
      const { data: sessionData } = await supabase.auth.getSession();
      debug('[ClientBook BARBERS] Current session user:', sessionData.session?.user?.email || 'anonymous');
      debug('[ClientBook BARBERS] Loading barbers as:', sessionData.session ? 'authenticated user' : 'anonymous client');

      // Check if a specific barber was preselected via query param
      const preselectedBarberId = searchParams.get('barber');
      debug('[ClientBook BARBERS] Preselected barber ID from URL:', preselectedBarberId || 'none');

      // ========================================
      // SECTION 1: BARBERS (CRITICAL - MUST SUCCEED FOR STEP 1)
      // ========================================
      let rawDbBarbers: Barber[] = [];
      let loadedBarbers: Barber[] = [];

      try {
        debug('[ClientBook BARBERS] Building query for eligible barbers...');
        debug('[ClientBook BARBERS] Query filters: role=BARBER, active=true, show_on_client_site=true, accept_online_bookings=true');

        // Main query: Get all barbers available for general booking
        const barbersQuery = supabase
          .from('users')
          .select('id, name, public_display_name, photo_url, active, show_on_client_site, accept_online_bookings')
          .eq('role', 'BARBER')
          .eq('active', true)
          .eq('show_on_client_site', true)
          .eq('accept_online_bookings', true)
          .order('name');

        // If there's a preselected barber, also fetch that specific barber
        // This allows direct booking links to work even if accept_online_bookings=false
        let preselectedBarberQuery = null;
        if (preselectedBarberId) {
          preselectedBarberQuery = supabase
            .from('users')
            .select('id, name, public_display_name, photo_url, active, show_on_client_site, accept_online_bookings')
            .eq('id', preselectedBarberId)
            .eq('role', 'BARBER')
            .eq('active', true)
            .maybeSingle();
        }

        debug('[ClientBook BARBERS] Executing barbers queries...');
        const [barbersRes, preselectedBarberRes] = await Promise.all([
          barbersQuery,
          preselectedBarberQuery || Promise.resolve({ data: null, error: null } as any)
        ]);

        debug('[ClientBook BARBERS] === QUERY RESULTS ===');
        if (barbersRes.error) {
          debugError('[ClientBook BARBERS] ❌ ERROR loading barbers:', barbersRes.error);
          debugError('[ClientBook BARBERS] Error details:', JSON.stringify(barbersRes.error, null, 2));
          // Set empty barbers but DO NOT crash the component
          rawDbBarbers = [];
          loadedBarbers = [];
        } else {
          rawDbBarbers = barbersRes.data || [];
          debug('[ClientBook BARBERS] ✅ Query successful!');
          debug('[ClientBook BARBERS] Rows returned from DB:', rawDbBarbers.length);

          if (rawDbBarbers.length > 0) {
            debug('[ClientBook BARBERS] Barbers found:', rawDbBarbers.map(b => ({
              name: b.name,
              display_name: b.public_display_name,
              active: b.active,
              show_on_client_site: b.show_on_client_site,
              accept_online_bookings: b.accept_online_bookings
            })));
          } else {
            console.warn('[ClientBook BARBERS] ⚠️ ZERO barbers returned from query!');
            console.warn('[ClientBook BARBERS] This should not happen if Carlos Martinez exists in DB with correct flags.');
          }

          loadedBarbers = [...rawDbBarbers];

          // If we fetched a preselected barber and it's valid but not in the main list, add it
          if (preselectedBarberRes?.data) {
            const preselectedBarber = preselectedBarberRes.data;
            const alreadyInList = loadedBarbers.find(b => b.id === preselectedBarber.id);

            if (!alreadyInList) {
              debug('[ClientBook BARBERS] Adding preselected barber (direct link):', preselectedBarber.name);
              loadedBarbers = [preselectedBarber, ...loadedBarbers];
            }
          } else if (preselectedBarberId && !preselectedBarberRes?.data) {
            console.warn('[ClientBook BARBERS] ⚠️ Preselected barber not found:', preselectedBarberId);
          }
        }

        // Store the raw DB result and commit to state
        debug('[ClientBook BARBERS] Storing rawBarbersFromDb:', rawDbBarbers.length, 'barbers');
        setRawBarbersFromDb(rawDbBarbers);

        debug('[ClientBook BARBERS] === FINAL BARBERS LIST ===');
        debug('[ClientBook BARBERS] Final barbers count:', loadedBarbers.length);
        if (loadedBarbers.length > 0) {
          debug('[ClientBook BARBERS] Will render these barbers:', loadedBarbers.map(b => b.name).join(', '));
        }

        debug('[ClientBook BARBERS] Calling setBarbers() with', loadedBarbers.length, 'barbers');
        setBarbers(loadedBarbers);
      } catch (error) {
        debugError('[ClientBook BARBERS] ❌ UNEXPECTED ERROR in barbers section:', error);
        // Even on unexpected error, commit empty arrays to state so UI can render
        setRawBarbersFromDb([]);
        setBarbers([]);
      }

      // ========================================
      // SECTION 2: SERVICES (NON-CRITICAL - FAILURE IS OK)
      // ========================================
      try {
        debug('[ClientBook BARBERS] Loading services...');
        const servicesRes = await supabase
          .from('services')
          .select('id, name_en, name_es, base_price, duration_minutes')
          .eq('active', true)
          .order('name_en', { ascending: true });

        if (servicesRes.error) {
          debugError('[ClientBook BARBERS] ❌ ERROR loading services:', servicesRes.error);
          debugError('[ClientBook BARBERS] Services error details:', JSON.stringify(servicesRes.error, null, 2));
          // DO NOT rethrow - just set empty services
          setServices([]);
        } else {
          const loadedServices = servicesRes.data || [];
          debug('[ClientBook BARBERS] ✅ Services loaded:', loadedServices.length);
          setServices(loadedServices);
        }
      } catch (error) {
        debugError('[ClientBook BARBERS] ❌ UNEXPECTED ERROR loading services:', error);
        // DO NOT rethrow - just set empty services
        setServices([]);
      }

      // ========================================
      // SECTION 3: SHOP CONFIG (NON-CRITICAL - FAILURE IS OK)
      // ========================================
      try {
        debug('[ClientBook BARBERS] Loading shop config...');
        const [shopConfig, shopConfigFull] = await Promise.all([
          getShopConfig(),
          supabase.from('shop_config').select('shop_name, phone, enable_confirmations, test_mode_enabled, tax_rate, card_processing_fee_rate, tip_percentage_presets, enable_tipping').single()
        ]);

        if (shopConfigFull.data) {
          setShopInfo({
            shop_name: shopConfigFull.data.shop_name || "Lupe's Barber Shop",
            phone: shopConfigFull.data.phone || null
          });

          // Load payment settings for accurate preview
          // Parse tip_percentage_presets if it's a JSON string, ensure it's always an array
          let tipPresetsArray = [15, 18, 20];
          try {
            const rawPresets = shopConfigFull.data.tip_percentage_presets;
            if (Array.isArray(rawPresets)) {
              tipPresetsArray = rawPresets;
            } else if (typeof rawPresets === 'string') {
              tipPresetsArray = JSON.parse(rawPresets);
            }
          } catch (err) {
            console.error('Error parsing tip presets:', err);
          }

          setShopSettings({
            tax_rate: Number(shopConfigFull.data.tax_rate || 0),
            card_processing_fee_rate: Number(shopConfigFull.data.card_processing_fee_rate || 0),
            tip_percentage_presets: Array.isArray(tipPresetsArray) ? tipPresetsArray : [15, 18, 20],
            enable_tipping: shopConfigFull.data.enable_tipping ?? true
          });

          // TEST MODE: Load test mode setting from database
          setTestMode(shopConfigFull.data.test_mode_enabled ?? false);
        }

        if (shopConfig) {
          setConfig(shopConfig);
        } else {
          console.warn('[ClientBook BARBERS] No shop config, using defaults');
          const fallbackConfig = {
            days_bookable_in_advance: 30,
            min_book_ahead_hours: 2,
            min_cancel_ahead_hours: 24,
            client_booking_interval_minutes: 15,
          };
          setConfig(fallbackConfig);
        }
      } catch (error) {
        debugError('[ClientBook BARBERS] ❌ ERROR loading shop config:', error);
        // Use fallback config
        const fallbackConfig = {
          days_bookable_in_advance: 30,
          min_book_ahead_hours: 2,
          min_cancel_ahead_hours: 24,
          client_booking_interval_minutes: 15,
        };
        setConfig(fallbackConfig);
      }

      // ========================================
      // DONE - Data load complete
      // ========================================
      debug('[ClientBook BARBERS] Data load complete');
    } catch (unexpectedError) {
      debugError('[ClientBook] Unexpected error in loadInitialData:', unexpectedError);
      setError('Failed to load booking page. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = async () => {
    if (!config || !selectedBarber || !selectedService || !selectedDate) {
      setTimeSlots([]);
      return;
    }

    try {
      const selectedServiceData = services.find(s => s.id === selectedService);
      if (!selectedServiceData) {
        setTimeSlots([]);
        return;
      }

      const dayOfWeek = new Date(selectedDate).getDay();

      // Query for ALL appointments on the selected date for this barber
      // Use date range that covers the entire day in shop timezone (America/Chicago)
      const dateStart = new Date(`${selectedDate}T00:00:00-06:00`).toISOString();
      const dateEnd = new Date(`${selectedDate}T23:59:59-06:00`).toISOString();

      const [scheduleRes, appointmentsRes, timeOffRes, barberOverridesRes] = await Promise.all([
        supabase
          .from('barber_schedules')
          .select('day_of_week, active, start_time, end_time')
          .eq('barber_id', selectedBarber)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle(),
        supabase
          .from('appointments')
          .select('id, scheduled_start, scheduled_end, status')
          .eq('barber_id', selectedBarber)
          .gte('scheduled_start', dateStart)
          .lt('scheduled_start', dateEnd)
          .neq('status', 'cancelled')
          .neq('status', 'no_show'),
        supabase
          .from('barber_time_off')
          .select('id, start_time, end_time')
          .eq('barber_id', selectedBarber)
          .lte('start_time', dateEnd)
          .gte('end_time', dateStart),
        supabase
          .from('users')
          .select('min_hours_before_booking_override, min_hours_before_cancellation_override, booking_interval_minutes_override')
          .eq('id', selectedBarber)
          .maybeSingle()
      ]);

      if (scheduleRes.error) {
        debugError('[ClientBook] Error loading barber schedule:', scheduleRes.error);
      }
      if (appointmentsRes.error) {
        debugError('[ClientBook] Error loading appointments:', appointmentsRes.error);
      }
      if (timeOffRes.error) {
        debugError('[ClientBook] Error loading time off:', timeOffRes.error);
      }

      const slots = generateAvailableSlotsForBarber({
        date: selectedDate,
        serviceDurationMinutes: selectedServiceData.duration_minutes,
        shopConfig: config,
        scheduleForDay: scheduleRes.data,
        appointments: appointmentsRes.data || [],
        timeOffBlocks: timeOffRes.data || [],
        barberOverrides: barberOverridesRes.data,
      });

      setTimeSlots(slots);
    } catch (error) {
      debugError('[ClientBook] Error generating time slots:', error);
      setTimeSlots([]);
    }
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

      const appointmentDateTime = new Date(selectedTime);
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
      // SECURE FLOW: For Stripe payments, create/get client first, then pass metadata to Stripe
      // The Stripe webhook will create the appointment AFTER successful payment
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

      const selectedServiceData = services.find(s => s.id === selectedService);
      const servicePrice = selectedServiceData?.base_price || 0;

      // Calculate tip (client's choice)
      const tipAmount = tipPercentage > 0
        ? (servicePrice * tipPercentage / 100)
        : (customTip ? parseFloat(customTip) : 0);

      const selectedSlot = timeSlots.find(slot => slot.start === selectedTime);
      const appointmentStart = selectedTime;
      const appointmentEnd = selectedSlot?.end || new Date(new Date(selectedTime).getTime() + (selectedServiceData?.duration_minutes || 30) * 60000).toISOString();

      // Check if Stripe is enabled
      // TEST MODE: Force "pay in shop" mode when test mode is enabled (no real payments)
      const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY) && !testMode;

      if (stripeEnabled) {
        // SECURE STRIPE FLOW: Pass all appointment metadata to Stripe
        // The Stripe webhook will create the appointment after successful payment
        try {
          const serviceName = language === 'es' ? selectedServiceData?.name_es : selectedServiceData?.name_en;

          const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', {
            body: {
              // Payment details
              service_price: servicePrice,
              service_name: serviceName || 'Barber Service',
              tip_amount: tipAmount,

              // Appointment metadata (webhook will use this to create appointment)
              client_id: clientId,
              barber_id: selectedBarber,
              service_id: selectedService,
              scheduled_start: appointmentStart,
              scheduled_end: appointmentEnd,
              notes: clientNotes || null,
              source: 'client_web',
              language: language,
            }
          });

          if (invokeError) {
            throw invokeError;
          }

          if (!data || !data.url) {
            throw new Error('No checkout URL returned');
          }

          // Redirect to Stripe checkout
          window.location.href = data.url;
        } catch (stripeError) {
          debugError('Stripe checkout error:', stripeError);
          setError(language === 'en'
            ? 'Failed to initiate payment. Please try again.'
            : 'Error al iniciar el pago. Por favor intenta de nuevo.');
        }
      } else if (testMode) {
        // TEST MODE: Create appointment directly for testing (no payment)
        const taxRate = shopSettings?.tax_rate || 0;
        const feeRate = shopSettings?.card_processing_fee_rate || 0;
        const subtotal = servicePrice + tipAmount;
        const tax = subtotal * (taxRate / 100);
        const stripeFee = (subtotal + tax) * feeRate;
        const grandTotal = subtotal + tax + stripeFee;

        const { data: newAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            barber_id: selectedBarber,
            client_id: clientId,
            service_id: selectedService,
            scheduled_start: appointmentStart,
            scheduled_end: appointmentEnd,
            status: 'booked',
            notes: clientNotes || null,
            source: 'client_web',
            payment_status: 'unpaid',
            amount_due: grandTotal,
            amount_paid: 0,
            is_test: true,
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
            scheduledStart: appointmentStart,
            barberName,
            serviceName,
            shopName: shopInfo.shop_name,
            shopPhone: shopInfo.phone || undefined,
            language,
          }).catch(err => {
            debugError('Failed to send confirmation:', err);
          });
        }

        // Redirect to home
        navigate('/client/home');
      } else {
        // Stripe not enabled and not test mode - error
        setError(language === 'en'
          ? 'Online payments are not configured. Please contact the shop.'
          : 'Los pagos en línea no están configurados. Por favor contacta a la tienda.');
      }
    } catch (error) {
      debugError('Error creating booking:', error);
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

  // Compute render list: if DB has barbers, use them; never hide them
  const hasDbBarbers = (rawBarbersFromDb?.length ?? 0) > 0;
  const barbersToRender: Barber[] =
    barbers && barbers.length > 0
      ? barbers
      : (hasDbBarbers ? rawBarbersFromDb : []);

  debug('[ClientBook BARBERS] === RENDER CHECK ===');
  debug('[ClientBook BARBERS] rawDb:', rawBarbersFromDb?.length ?? 0, 'state:', barbers?.length ?? 0, 'render:', barbersToRender.length);
  if (barbersToRender.length > 0) {
    debug('[ClientBook BARBERS] Will render:', barbersToRender.map(b => b.name).join(', '));
  } else {
    console.warn('[ClientBook BARBERS] ⚠️ Will show "No barbers available" message');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
            <>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {language === 'en' ? 'Select Barber' : 'Seleccionar Barbero'}
              </h2>

              {barbersToRender.length === 0 ? (
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
                  {barbersToRender.map((barber) => (
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
            </>
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
                        ${service.base_price.toFixed(2)}
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
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => setSelectedTime(slot.start)}
                        style={{
                          padding: '0.75rem',
                          border: `2px solid ${selectedTime === slot.start ? '#e74c3c' : '#ddd'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedTime === slot.start ? '#e74c3c' : 'white',
                          color: selectedTime === slot.start ? 'white' : '#000',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                        }}
                      >
                        {formatTime12h(slot.start)}
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

          {step === 5 && (() => {
            const servicePrice = selectedServiceObj?.base_price || 0;
            const tipAmount = tipPercentage > 0
              ? (servicePrice * tipPercentage / 100)
              : (customTip ? parseFloat(customTip) : 0);

            // Use dynamic shop settings
            // Note: taxRate is stored as integer (e.g., 8.5 = 8.5%)
            // Note: feeRate is stored as decimal (e.g., 0.04 = 4%)
            const taxRate = shopSettings?.tax_rate || 0;
            const feeRate = shopSettings?.card_processing_fee_rate || 0;
            const tipPresets = (Array.isArray(shopSettings?.tip_percentage_presets) ? shopSettings.tip_percentage_presets : [15, 18, 20]);

            const subtotal = servicePrice + tipAmount;
            const tax = subtotal * (taxRate / 100);
            const stripeFee = stripeEnabled ? ((subtotal + tax) * feeRate) : 0;
            const grandTotal = subtotal + tax + stripeFee;

            return (
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                  {language === 'en' ? 'Review & Pay' : 'Revisar y Pagar'}
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
                      {selectedTime ? formatTime12h(selectedTime) : ''}
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

                {stripeEnabled && !testMode && (
                  <>
                    <div style={{ backgroundColor: 'white', border: '2px solid #e0e0e0', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem' }}>
                        {language === 'en' ? 'Add a Tip?' : '¿Agregar Propina?'}
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                        {tipPresets.map(pct => (
                          <button
                            key={pct}
                            onClick={() => {
                              setTipPercentage(pct);
                              setCustomTip('');
                            }}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: tipPercentage === pct ? '#e74c3c' : 'white',
                              color: tipPercentage === pct ? 'white' : '#000',
                              border: `2px solid ${tipPercentage === pct ? '#e74c3c' : '#ddd'}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setTipPercentage(0);
                            setCustomTip('');
                          }}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: tipPercentage === 0 && !customTip ? '#e74c3c' : 'white',
                            color: tipPercentage === 0 && !customTip ? 'white' : '#000',
                            border: `2px solid ${tipPercentage === 0 && !customTip ? '#e74c3c' : '#ddd'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                          }}
                        >
                          {language === 'en' ? 'No Tip' : 'Sin Propina'}
                        </button>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '0.5rem', color: '#666' }}>
                          {language === 'en' ? 'Custom Tip ($)' : 'Propina Personalizada ($)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customTip}
                          onChange={(e) => {
                            setCustomTip(e.target.value);
                            setTipPercentage(0);
                          }}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '16px',
                            border: '2px solid #ddd',
                            borderRadius: '6px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem' }}>
                        {language === 'en' ? 'Payment Summary' : 'Resumen de Pago'}
                      </h3>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>{language === 'en' ? 'Service' : 'Servicio'}</span>
                        <span>${servicePrice.toFixed(2)}</span>
                      </div>

                      {tipAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>{language === 'en' ? 'Tip' : 'Propina'}</span>
                          <span>${tipAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {tax > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>{language === 'en' ? `Tax (${taxRate}%)` : `Impuesto (${taxRate}%)`}</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                      )}

                      {stripeFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {language === 'en' ? `Processing Fee (${(feeRate * 100).toFixed(2)}%)` : `Tarifa de Procesamiento (${(feeRate * 100).toFixed(2)}%)`}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666' }}>${stripeFee.toFixed(2)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '20px', fontWeight: 'bold' }}>
                        <span>{language === 'en' ? 'Total' : 'Total'}</span>
                        <span style={{ color: '#e74c3c' }}>${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* TEST MODE: Show warning banner when test mode is enabled */}
                {testMode && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {language === 'en' ? '⚠️ Test Mode Enabled' : '⚠️ Modo de Prueba Activado'}
                    </div>
                    {language === 'en'
                      ? 'This booking is for testing only. No real payment will be processed and no SMS notifications will be sent.'
                      : 'Esta reserva es solo para pruebas. No se procesará ningún pago real y no se enviarán notificaciones SMS.'}
                  </div>
                )}

                {!stripeEnabled && !testMode && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    {language === 'en'
                      ? 'Payment will be collected at the shop. You can pay by cash or card when you arrive.'
                      : 'El pago se recogerá en la tienda. Puedes pagar en efectivo o con tarjeta cuando llegues.'}
                  </div>
                )}

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
                    marginBottom: '0.5rem',
                  }}
                >
                  {submitting
                    ? (language === 'en' ? 'Processing...' : 'Procesando...')
                    : testMode
                      ? (language === 'en' ? 'Confirm Test Booking' : 'Confirmar Reserva de Prueba')
                      : stripeEnabled
                        ? (language === 'en' ? `Pay $${grandTotal.toFixed(2)}` : `Pagar $${grandTotal.toFixed(2)}`)
                        : (language === 'en' ? 'Confirm Booking' : 'Confirmar Reserva')}
                </button>
              </div>
            );
          })()}

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

      <Footer />
    </div>
  );
}
