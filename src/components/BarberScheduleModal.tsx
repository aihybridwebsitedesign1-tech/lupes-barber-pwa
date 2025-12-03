import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type Schedule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

type Props = {
  barberId: string;
  barberName: string;
  onClose: () => void;
  onSuccess: () => void;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function BarberScheduleModal({ barberId, barberName, onClose, onSuccess }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadSchedules();
  }, [barberId]);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barberId)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setSchedules(data);
      } else {
        setSchedules([
          { day_of_week: 1, start_time: '10:00', end_time: '19:00', active: true },
          { day_of_week: 2, start_time: '10:00', end_time: '19:00', active: true },
          { day_of_week: 3, start_time: '10:00', end_time: '19:00', active: true },
          { day_of_week: 4, start_time: '10:00', end_time: '19:00', active: true },
          { day_of_week: 5, start_time: '10:00', end_time: '19:00', active: true },
          { day_of_week: 6, start_time: '10:00', end_time: '19:00', active: true },
        ]);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.day_of_week === dayOfWeek
          ? { ...s, active: !s.active }
          : s
      )
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.day_of_week === dayOfWeek
          ? { ...s, [field]: value }
          : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('barber_schedules')
        .delete()
        .eq('barber_id', barberId);

      if (deleteError) throw deleteError;

      const schedulesToInsert = schedules.map((s) => ({
        barber_id: barberId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        active: s.active,
      }));

      const { error: insertError } = await supabase
        .from('barber_schedules')
        .insert(schedulesToInsert);

      if (insertError) throw insertError;

      alert(language === 'en' ? 'Schedule saved successfully!' : '¡Horario guardado exitosamente!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(language === 'en' ? 'Error saving schedule' : 'Error al guardar horario');
    } finally {
      setSaving(false);
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

  const dayNames = language === 'en' ? DAYS : DAYS_ES;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          {language === 'en' ? `Edit Schedule - ${barberName}` : `Editar Horario - ${barberName}`}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const schedule = schedules.find((s) => s.day_of_week === dayIndex);
            const isActive = schedule?.active ?? false;

            return (
              <div
                key={dayIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                <div style={{ width: '100px', fontWeight: '500', fontSize: '14px' }}>
                  {dayNames[dayIndex]}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleDay(dayIndex)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {language === 'en' ? 'Active' : 'Activo'}
                  </span>
                </label>

                {isActive && schedule && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '12px' }}>
                        {language === 'en' ? 'From:' : 'Desde:'}
                      </label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleTimeChange(dayIndex, 'start_time', e.target.value)}
                        style={{
                          padding: '0.25rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '12px' }}>
                        {language === 'en' ? 'To:' : 'Hasta:'}
                      </label>
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleTimeChange(dayIndex, 'end_time', e.target.value)}
                        style={{
                          padding: '0.25rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {saving ? t.loading : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
