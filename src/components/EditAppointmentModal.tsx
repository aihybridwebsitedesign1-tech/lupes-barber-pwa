import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type EditAppointmentModalProps = {
  appointmentId: string;
  onClose: () => void;
  onSave: () => void;
};

type Barber = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  duration_minutes: number;
  base_price: number;
};

type AppointmentData = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  barber_id: string | null;
  service_id: string;
  status: string;
  client_id: string;
  client: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  };
};

export default function EditAppointmentModal({
  appointmentId,
  onClose,
  onSave,
}: EditAppointmentModalProps) {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('booked');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  const loadData = async () => {
    try {
      const [appointmentRes, barbersRes, servicesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, client:clients(*)')
          .eq('id', appointmentId)
          .single(),
        supabase
          .from('users')
          .select('id, name')
          .eq('role', 'BARBER')
          .eq('active', true)
          .order('name'),
        supabase
          .from('services')
          .select('*')
          .eq('active', true)
          .order('name_en'),
      ]);

      if (appointmentRes.error) throw appointmentRes.error;
      if (barbersRes.error) throw barbersRes.error;
      if (servicesRes.error) throw servicesRes.error;

      const appt = appointmentRes.data as AppointmentData;
      setAppointment(appt);

      const startDate = new Date(appt.scheduled_start);
      setSelectedDate(startDate.toISOString().split('T')[0]);
      setSelectedTime(startDate.toTimeString().slice(0, 5));
      setSelectedBarberId(appt.barber_id || '');
      setSelectedServiceId(appt.service_id);
      setSelectedStatus(appt.status);
      setClientFirstName(appt.client.first_name);
      setClientLastName(appt.client.last_name);
      setClientPhone(appt.client.phone);
      setClientEmail(appt.client.email || '');

      setBarbers(barbersRes.data);
      setServices(servicesRes.data);
    } catch (err: any) {
      console.error('Error loading appointment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!appointment) return;

    setSaving(true);
    setError('');

    if (!selectedDate || !selectedTime || !selectedServiceId) {
      setError(language === 'en' ? 'Please fill in all required fields' : 'Por favor complete todos los campos requeridos');
      setSaving(false);
      return;
    }

    if (!clientFirstName.trim() || !clientLastName.trim() || !clientPhone.trim()) {
      setError(language === 'en' ? 'Client name and phone are required' : 'Nombre y teléfono del cliente son requeridos');
      setSaving(false);
      return;
    }

    try {
      const selectedService = services.find((s) => s.id === selectedServiceId);
      if (!selectedService) {
        throw new Error('Service not found');
      }

      const scheduledStart = new Date(`${selectedDate}T${selectedTime}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + selectedService.duration_minutes * 60000);

      await supabase
        .from('clients')
        .update({
          first_name: clientFirstName.trim(),
          last_name: clientLastName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || null,
        })
        .eq('id', appointment.client_id);

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          barber_id: selectedBarberId || null,
          service_id: selectedServiceId,
          status: selectedStatus,
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      onSave();
    } catch (err: any) {
      console.error('Error saving appointment:', err);
      setError(err.message || (language === 'en' ? 'Failed to save changes' : 'Error al guardar cambios'));
      setSaving(false);
    }
  };

  const canEdit = userData?.role === 'OWNER' || userData?.can_manage_appointments;

  if (!canEdit) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p>{language === 'en' ? 'You do not have permission to edit appointments' : 'No tienes permiso para editar citas'}</p>
          <button
            onClick={onClose}
            style={{
              marginTop: '1rem',
              padding: '10px 24px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Close' : 'Cerrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Edit Appointment' : 'Editar Cita'}
        </h2>

        {loading ? (
          <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                  {language === 'en' ? 'Appointment Details' : 'Detalles de la Cita'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Date' : 'Fecha'}
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Time' : 'Hora'}
                    </label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Barber' : 'Barbero'}
                </label>
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">{language === 'en' ? 'Any barber' : 'Cualquier barbero'}</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Service' : 'Servicio'}
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {language === 'en' ? service.name_en : service.name_es} - ${service.base_price} ({service.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Status' : 'Estado'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="booked">{language === 'en' ? 'Booked' : 'Reservada'}</option>
                  <option value="completed">{language === 'en' ? 'Completed' : 'Completada'}</option>
                  <option value="no_show">{language === 'en' ? 'No Show' : 'No se presentó'}</option>
                  <option value="cancelled">{language === 'en' ? 'Cancelled' : 'Cancelada'}</option>
                </select>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                  {language === 'en' ? 'Client Information' : 'Información del Cliente'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                        {language === 'en' ? 'First Name' : 'Nombre'}
                      </label>
                      <input
                        type="text"
                        value={clientFirstName}
                        onChange={(e) => setClientFirstName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                        {language === 'en' ? 'Last Name' : 'Apellido'}
                      </label>
                      <input
                        type="text"
                        value={clientLastName}
                        onChange={(e) => setClientLastName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Phone' : 'Teléfono'}
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Email (optional)' : 'Email (opcional)'}
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '6px',
                  marginTop: '1rem',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 24px',
                  backgroundColor: saving ? '#ccc' : '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {saving ? (language === 'en' ? 'Saving...' : 'Guardando...') : language === 'en' ? 'Save Changes' : 'Guardar Cambios'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
