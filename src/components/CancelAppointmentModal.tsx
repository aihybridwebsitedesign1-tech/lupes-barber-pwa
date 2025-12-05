import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type Props = {
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CancelAppointmentModal({
  appointmentId,
  onClose,
  onSuccess,
}: Props) {
  const { language } = useLanguage();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setLoading(true);
    setError('');

    try {
      const updateData: any = {
        status: 'cancelled',
      };

      if (note.trim()) {
        const { data: currentAppt } = await supabase
          .from('appointments')
          .select('notes')
          .eq('id', appointmentId)
          .single();

        const existingNotes = currentAppt?.notes || '';
        const cancelNote = `[${language === 'en' ? 'Cancelled' : 'Cancelada'}] ${note}`;
        updateData.notes = existingNotes
          ? `${existingNotes}\n${cancelNote}`
          : cancelNote;
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error('Error cancelling appointment:', err);
      setError(
        language === 'en'
          ? `Error cancelling: ${err.message}`
          : `Error al cancelar: ${err.message}`
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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          {language === 'en' ? 'Cancel Appointment' : 'Cancelar Cita'}
        </h2>

        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '14px' }}>
          {language === 'en'
            ? 'Are you sure you want to cancel this appointment? This action will remove it from completed/earnings calculations.'
            : '¿Estás seguro de que deseas cancelar esta cita? Esta acción la removerá de los cálculos de citas completadas/ganancias.'}
        </p>

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

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '0.5rem',
            }}
          >
            {language === 'en'
              ? 'Reason (optional)'
              : 'Razón (opcional)'}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              language === 'en'
                ? 'e.g., Client cancelled, No-show, etc.'
                : 'ej., Cliente canceló, No se presentó, etc.'
            }
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {loading
              ? language === 'en'
                ? 'Cancelling...'
                : 'Cancelando...'
              : language === 'en'
              ? 'Yes, Cancel Appointment'
              : 'Sí, Cancelar Cita'}
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
            {language === 'en' ? 'No, Keep It' : 'No, Mantener'}
          </button>
        </div>
      </div>
    </div>
  );
}
