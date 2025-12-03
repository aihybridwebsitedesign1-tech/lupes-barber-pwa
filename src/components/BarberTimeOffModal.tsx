import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type TimeOff = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

type Props = {
  barberId: string;
  barberName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BarberTimeOffModal({ barberId, barberName, onClose, onSuccess }: Props) {
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadTimeOffs();
  }, [barberId]);

  const loadTimeOffs = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_time_off')
        .select('*')
        .eq('barber_id', barberId)
        .order('date', { ascending: true });

      if (error) throw error;

      setTimeOffs(data || []);
    } catch (error) {
      console.error('Error loading time off:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newDate) {
      alert(language === 'en' ? 'Please select a date' : 'Por favor selecciona una fecha');
      return;
    }

    if (!isAllDay && (!newStartTime || !newEndTime)) {
      alert(language === 'en' ? 'Please enter start and end times' : 'Por favor ingresa hora de inicio y fin');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('barber_time_off').insert({
        barber_id: barberId,
        date: newDate,
        start_time: isAllDay ? null : newStartTime,
        end_time: isAllDay ? null : newEndTime,
        reason: newReason || null,
      });

      if (error) throw error;

      setNewDate('');
      setIsAllDay(true);
      setNewStartTime('');
      setNewEndTime('');
      setNewReason('');
      setShowAddForm(false);
      await loadTimeOffs();
      onSuccess();
    } catch (error) {
      console.error('Error adding time off:', error);
      alert(language === 'en' ? 'Error adding time off' : 'Error al agregar tiempo libre');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Delete this time off entry?' : '¿Eliminar esta entrada de tiempo libre?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('barber_time_off')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTimeOffs();
      onSuccess();
    } catch (error) {
      console.error('Error deleting time off:', error);
      alert(language === 'en' ? 'Error deleting time off' : 'Error al eliminar tiempo libre');
    }
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%' }}>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          {language === 'en' ? `Time Off - ${barberName}` : `Tiempo Libre - ${barberName}`}
        </h2>

        {timeOffs.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9f9f9' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Date' : 'Fecha'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Time' : 'Hora'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Reason' : 'Motivo'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeOffs.map((timeOff) => (
                  <tr key={timeOff.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                      {new Date(timeOff.date + 'T00:00:00').toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                      {timeOff.start_time && timeOff.end_time
                        ? `${timeOff.start_time} - ${timeOff.end_time}`
                        : language === 'en' ? 'All day' : 'Todo el día'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                      {timeOff.reason || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                      <button
                        onClick={() => handleDelete(timeOff.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        {language === 'en' ? 'Delete' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '1rem',
            }}
          >
            {language === 'en' ? 'Add Time Off' : 'Agregar Tiempo Libre'}
          </button>
        )}

        {showAddForm && (
          <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'New Time Off' : 'Nuevo Tiempo Libre'}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                {language === 'en' ? 'Date' : 'Fecha'}
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                {language === 'en' ? 'All day' : 'Todo el día'}
              </label>
            </div>

            {!isAllDay && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                    {language === 'en' ? 'Start Time' : 'Hora Inicio'}
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                    {language === 'en' ? 'End Time' : 'Hora Fin'}
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                {language === 'en' ? 'Reason (optional)' : 'Motivo (opcional)'}
              </label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewDate('');
                  setIsAllDay(true);
                  setNewStartTime('');
                  setNewEndTime('');
                  setNewReason('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {saving ? t.loading : language === 'en' ? 'Add' : 'Agregar'}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {language === 'en' ? 'Close' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
