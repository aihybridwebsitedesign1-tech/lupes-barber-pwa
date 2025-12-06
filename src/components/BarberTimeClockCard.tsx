import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type TimeEntry = {
  id: string;
  entry_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
};

type BarberTimeClockCardProps = {
  barberId: string;
};

export default function BarberTimeClockCard({ barberId }: BarberTimeClockCardProps) {
  const { language } = useLanguage();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);

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

      setTodayEntries(data || []);
      if (data && data.length > 0) {
        setLastEntry(data[data.length - 1]);
      } else {
        setLastEntry(null);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const handleClockAction = async (entryType: TimeEntry['entry_type']) => {
    setLoading(true);
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
      alert(language === 'en' ? 'Error recording time' : 'Error al registrar el tiempo');
    } finally {
      setLoading(false);
    }
  };

  const calculateTodayHours = () => {
    const clockIns = todayEntries.filter(e => e.entry_type === 'clock_in');
    const clockOuts = todayEntries.filter(e => e.entry_type === 'clock_out');
    const breakStarts = todayEntries.filter(e => e.entry_type === 'break_start');
    const breakEnds = todayEntries.filter(e => e.entry_type === 'break_end');

    let totalWorked = 0;
    let totalBreak = 0;

    for (let i = 0; i < clockIns.length; i++) {
      const clockInTime = new Date(clockIns[i].timestamp).getTime();
      const clockOutTime = clockOuts[i] ? new Date(clockOuts[i].timestamp).getTime() : Date.now();
      totalWorked += clockOutTime - clockInTime;
    }

    for (let i = 0; i < breakStarts.length; i++) {
      const breakStartTime = new Date(breakStarts[i].timestamp).getTime();
      const breakEndTime = breakEnds[i] ? new Date(breakEnds[i].timestamp).getTime() : (lastEntry?.entry_type === 'break_start' ? Date.now() : breakStartTime);
      totalBreak += breakEndTime - breakStartTime;
    }

    const workedHours = (totalWorked / (1000 * 60 * 60)).toFixed(2);
    const breakHours = (totalBreak / (1000 * 60 * 60)).toFixed(2);
    const netHours = ((totalWorked - totalBreak) / (1000 * 60 * 60)).toFixed(2);

    return { workedHours, breakHours, netHours };
  };

  const getStatus = () => {
    if (!lastEntry) return 'off';
    if (lastEntry.entry_type === 'clock_in') return 'clocked_in';
    if (lastEntry.entry_type === 'break_start') return 'on_break';
    if (lastEntry.entry_type === 'break_end') return 'clocked_in';
    return 'off';
  };

  const canClockIn = () => {
    const status = getStatus();
    return status === 'off';
  };

  const canClockOut = () => {
    const status = getStatus();
    return status === 'clocked_in' || status === 'on_break';
  };

  const canStartBreak = () => {
    const status = getStatus();
    return status === 'clocked_in';
  };

  const canEndBreak = () => {
    const status = getStatus();
    return status === 'on_break';
  };

  const status = getStatus();
  const { workedHours, breakHours, netHours } = calculateTodayHours();

  const statusText = {
    off: language === 'en' ? 'Off the Clock' : 'Fuera de Servicio',
    clocked_in: language === 'en' ? 'On the Clock' : 'En Servicio',
    on_break: language === 'en' ? 'On Break' : 'En Descanso',
  }[status];

  const statusColor = {
    off: '#999',
    clocked_in: '#16a34a',
    on_break: '#f59e0b',
  }[status];

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
                backgroundColor: statusColor,
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500', color: statusColor }}>
              {statusText}
            </span>
          </div>
        </div>

        {lastEntry && (
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            {language === 'en' ? 'Last action: ' : 'Última acción: '}
            {new Date(lastEntry.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleClockAction('clock_in')}
          disabled={!canClockIn() || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canClockIn() && !loading ? '#16a34a' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canClockIn() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'Clock In' : 'Entrar'}
        </button>

        <button
          onClick={() => handleClockAction('break_start')}
          disabled={!canStartBreak() || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canStartBreak() && !loading ? '#f59e0b' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canStartBreak() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'Start Break' : 'Iniciar Descanso'}
        </button>

        <button
          onClick={() => handleClockAction('break_end')}
          disabled={!canEndBreak() || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canEndBreak() && !loading ? '#16a34a' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canEndBreak() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {language === 'en' ? 'End Break' : 'Terminar Descanso'}
        </button>

        <button
          onClick={() => handleClockAction('clock_out')}
          disabled={!canClockOut() || loading}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: canClockOut() && !loading ? '#dc2626' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: canClockOut() && !loading ? 'pointer' : 'not-allowed',
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
