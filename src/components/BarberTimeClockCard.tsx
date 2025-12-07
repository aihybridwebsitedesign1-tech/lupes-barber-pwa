import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import {
  TimeEntry,
  TimeEntryType,
  parseShiftsForDay,
  validateClockAction,
  formatTime,
} from '../lib/timeTracking';

type BarberTimeClockCardProps = {
  barberId: string;
};

export default function BarberTimeClockCard({ barberId }: BarberTimeClockCardProps) {
  const { language } = useLanguage();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTodayEntries();
  }, [barberId]);

  const loadTodayEntries = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('barber_time_entries')
        .select('*')
        .eq('barber_id', barberId)
        .gte('timestamp', today.toISOString())
        .lt('timestamp', tomorrow.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setTodayEntries((data || []) as TimeEntry[]);
      setError('');
    } catch (error) {
      console.error('Error loading time entries:', error);
      setError(language === 'en' ? 'Error loading entries' : 'Error al cargar registros');
    }
  };

  const handleClockAction = async (entryType: TimeEntryType) => {
    const validation = validateClockAction(todayEntries, entryType);

    if (!validation.valid) {
      alert(validation.reason || (language === 'en' ? 'Invalid action' : 'Acción inválida'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.from('barber_time_entries').insert({
        barber_id: barberId,
        entry_type: entryType,
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;
      await loadTodayEntries();
    } catch (error) {
      console.error('Error recording time:', error);
      setError(language === 'en' ? 'Error recording time' : 'Error al registrar el tiempo');
    } finally {
      setLoading(false);
    }
  };

  const shift = parseShiftsForDay(todayEntries);

  const canPerform = (action: TimeEntryType): boolean => {
    return validateClockAction(todayEntries, action).valid;
  };

  const lastEntry = todayEntries[todayEntries.length - 1] || null;

  const workedHours = (shift.totalWorkedMs / (1000 * 60 * 60)).toFixed(2);
  const breakHours = (shift.breakTimeMs / (1000 * 60 * 60)).toFixed(2);
  const netHours = (shift.netWorkedMs / (1000 * 60 * 60)).toFixed(2);

  const statusDisplay: Record<typeof shift.status, { text: string; color: string }> = {
    complete: {
      text: language === 'en' ? 'Shift Complete' : 'Turno Completo',
      color: '#999',
    },
    in_progress: {
      text: language === 'en' ? 'On the Clock' : 'En Servicio',
      color: '#16a34a',
    },
    on_break: {
      text: language === 'en' ? 'On Break' : 'En Descanso',
      color: '#f59e0b',
    },
    incomplete: {
      text: language === 'en' ? 'Off the Clock' : 'Fuera de Servicio',
      color: '#999',
    },
  };

  const currentStatus = statusDisplay[shift.status];

  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        gridColumn: '1 / -1',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {language === 'en' ? 'Time Clock' : 'Reloj de Tiempo'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: currentStatus.color,
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500', color: currentStatus.color }}>
              {currentStatus.text}
            </span>
          </div>
        </div>

        {lastEntry && (
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            {language === 'en' ? 'Last action: ' : 'Última acción: '}
            {formatTime(lastEntry.timestamp)}
          </p>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleClockAction('clock_in')}
          disabled={!canPerform('clock_in') || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canPerform('clock_in') && !loading ? '#16a34a' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canPerform('clock_in') && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'Clock In' : 'Entrar'}
        </button>

        <button
          onClick={() => handleClockAction('break_start')}
          disabled={!canPerform('break_start') || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canPerform('break_start') && !loading ? '#f59e0b' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canPerform('break_start') && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'Start Break' : 'Iniciar Descanso'}
        </button>

        <button
          onClick={() => handleClockAction('break_end')}
          disabled={!canPerform('break_end') || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canPerform('break_end') && !loading ? '#16a34a' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canPerform('break_end') && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'End Break' : 'Terminar Descanso'}
        </button>

        <button
          onClick={() => handleClockAction('clock_out')}
          disabled={!canPerform('clock_out') || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canPerform('clock_out') && !loading ? '#dc2626' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canPerform('clock_out') && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'Clock Out' : 'Salir'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '6px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
            {language === 'en' ? 'Hours Worked' : 'Horas Trabajadas'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{workedHours}h</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
            {language === 'en' ? 'Break Time' : 'Tiempo de Descanso'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{breakHours}h</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
            {language === 'en' ? 'Net Hours' : 'Horas Netas'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{netHours}h</div>
        </div>
      </div>
    </div>
  );
}
