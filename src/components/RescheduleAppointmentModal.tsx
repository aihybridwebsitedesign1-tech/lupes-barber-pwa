import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { validateBookingRules } from '../lib/bookingRules';
import { getAvailableTimeSlots, TimeSlot } from '../lib/availability';

type Props = {
  appointmentId: string;
  currentStart: string;
  currentEnd: string;
  barberId: string | null;
  serviceId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function RescheduleAppointmentModal({
  appointmentId,
  currentStart,
  currentEnd: _currentEnd,
  barberId,
  serviceId,
  onClose,
  onSuccess,
}: Props) {
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const current = new Date(currentStart);
    setSelectedDate(current.toISOString().split('T')[0]);
  }, [currentStart]);

  useEffect(() => {
    if (selectedDate && barberId && serviceId) {
      loadAvailableSlots();
    }
  }, [selectedDate, barberId, serviceId]);

  const loadAvailableSlots = async () => {
    if (!barberId) return;

    try {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single();

      if (!service) return;

      const slots = await getAvailableTimeSlots(
        selectedDate,
        service.duration_minutes,
        barberId
      );

      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading slots:', err);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError(
        language === 'en'
          ? 'Please select a date and time'
          : 'Por favor selecciona fecha y hora'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single();

      if (!service) throw new Error('Service not found');

      const newStart = new Date(`${selectedDate}T${selectedTime}`);
      const newEnd = new Date(
        newStart.getTime() + service.duration_minutes * 60000
      );

      const validationError = await validateBookingRules(
        newStart,
        'reschedule'
      );
      if (validationError) {
        setError(
          language === 'en'
            ? validationError.message
            : validationError.messageEs
        );
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          scheduled_start: newStart.toISOString(),
          scheduled_end: newEnd.toISOString(),
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error('Error rescheduling:', err);
      setError(
        language === 'en'
          ? `Error rescheduling: ${err.message}`
          : `Error al reprogramar: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          {language === 'en' ? 'Reschedule Appointment' : 'Reprogramar Cita'}
        </h2>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '0.5rem',
            }}
          >
            {language === 'en' ? 'New Date' : 'Nueva Fecha'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        {availableSlots.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '0.5rem',
              }}
            >
              {language === 'en' ? 'Available Times' : 'Horarios Disponibles'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {availableSlots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => setSelectedTime(slot.start)}
                  style={{
                    padding: '0.5rem',
                    border: `2px solid ${selectedTime === slot.start ? '#000' : '#ddd'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: selectedTime === slot.start ? '#f0f0f0' : 'white',
                  }}
                >
                  {slot.start}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDate && availableSlots.length === 0 && !loading && (
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'No available slots for this date'
              : 'No hay horarios disponibles para esta fecha'}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={handleReschedule}
            disabled={loading || !selectedTime}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: loading || !selectedTime ? '#ccc' : '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedTime ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {loading
              ? language === 'en'
                ? 'Rescheduling...'
                : 'Reprogramando...'
              : language === 'en'
              ? 'Reschedule'
              : 'Reprogramar'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: 'white',
              color: '#000',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
