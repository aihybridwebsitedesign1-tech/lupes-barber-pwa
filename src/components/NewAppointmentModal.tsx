import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { getAvailableTimeSlots, type TimeSlot } from '../lib/availability';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
};

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  base_price: number;
  duration_minutes: number;
};

type Barber = {
  id: string;
  name: string;
};

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAppointmentModal({ onClose, onSuccess }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { language, t } = useLanguage();

  const getLocalDateString = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedService && selectedBarber && appointmentDate) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
      setAppointmentTime('');
    }
  }, [selectedService, selectedBarber, appointmentDate]);

  const loadAvailableSlots = async () => {
    if (!selectedService || !selectedBarber || !appointmentDate) return;

    setLoadingSlots(true);
    try {
      const service = services.find(s => s.id === selectedService);
      if (!service) return;

      const slots = await getAvailableTimeSlots(
        appointmentDate,
        service.duration_minutes,
        selectedBarber
      );

      setAvailableSlots(slots);
      if (slots.length === 0) {
        setAppointmentTime('');
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadData = async () => {
    const [clientsRes, servicesRes, barbersRes] = await Promise.all([
      supabase.from('clients').select('*').order('first_name'),
      supabase.from('services').select('*').eq('active', true),
      supabase.from('users').select('id, name').eq('role', 'BARBER').eq('active', true)
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
  };

  const handleCreateClient = async () => {
    if (!newClientFirstName || !newClientLastName || !newClientPhone) {
      alert('Please fill all client fields');
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        first_name: newClientFirstName,
        last_name: newClientLastName,
        phone: newClientPhone,
        language
      })
      .select()
      .single();

    if (error) {
      alert('Error creating client: ' + error.message);
      return;
    }

    if (data) {
      setClients([...clients, data]);
      setSelectedClient(data.id);
      setShowNewClient(false);
      setNewClientFirstName('');
      setNewClientLastName('');
      setNewClientPhone('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedService || !selectedBarber || !appointmentDate || !appointmentTime) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const service = services.find(s => s.id === selectedService);
      if (!service) {
        alert('Service not found');
        setLoading(false);
        return;
      }

      // Date/Time Logic:
      // 1. Combine the selected date (YYYY-MM-DD) and time (HH:MM) into a single Date object
      // 2. Calculate end time by adding the service duration in minutes
      // 3. Convert both to ISO strings for Supabase (stored as timestamptz)
      const startDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);

      console.log('Creating appointment:', {
        client_id: selectedClient,
        barber_id: selectedBarber,
        service_id: selectedService,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        date: appointmentDate,
        time: appointmentTime
      });

      const { data, error } = await supabase.from('appointments').insert({
        client_id: selectedClient,
        barber_id: selectedBarber,
        service_id: selectedService,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        status: 'booked',
        channel: 'internal_manual',
        services_total: service.base_price,
        products_total: 0,
        tax_amount: 0,
        tip_amount: 0,
        card_fee_amount: 0,
        total_charged: 0,
        net_revenue: 0
      }).select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Appointment created successfully:', data);
      alert('Appointment created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error creating appointment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.newAppointment}</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {t.selectClient}
          </label>
          {!showNewClient ? (
            <>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}
              >
                <option value="">{t.selectClient}</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name} - {c.phone}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewClient(true)}
                style={{ fontSize: '14px', color: '#0066cc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                + {t.createNewClient}
              </button>
            </>
          ) : (
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder={t.firstName}
                value={newClientFirstName}
                onChange={(e) => setNewClientFirstName(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}
              />
              <input
                type="text"
                placeholder={t.lastName}
                value={newClientLastName}
                onChange={(e) => setNewClientLastName(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}
              />
              <input
                type="tel"
                placeholder={t.phone}
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCreateClient}
                  style={{ padding: '8px 16px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {t.create}
                </button>
                <button
                  onClick={() => setShowNewClient(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {t.selectService}
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">{t.selectService}</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {language === 'es' ? s.name_es : s.name_en} - ${s.base_price}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {t.selectBarber}
          </label>
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">{t.selectBarber}</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {t.date}
          </label>
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            min={getLocalDateString()}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {t.time}
          </label>
          {loadingSlots ? (
            <p style={{ fontSize: '14px', color: '#666' }}>{t.loading}</p>
          ) : availableSlots.length === 0 && selectedService && selectedBarber && appointmentDate ? (
            <p style={{ fontSize: '14px', color: '#dc3545' }}>
              {language === 'en'
                ? 'No available times for this barber on this date.'
                : 'No hay horarios disponibles para este barbero en esta fecha.'}
            </p>
          ) : (
            <select
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              disabled={availableSlots.length === 0}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">
                {availableSlots.length === 0
                  ? (language === 'en' ? 'Select date, service & barber first' : 'Selecciona fecha, servicio y barbero primero')
                  : (language === 'en' ? 'Select a time' : 'Selecciona una hora')}
              </option>
              {availableSlots.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {slot.start} - {slot.end}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? t.loading : t.create}
          </button>
        </div>
      </div>
    </div>
  );
}
