import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { exportToCSV } from '../lib/csvExport';

type TimeEntry = {
  id: string;
  barber_id: string;
  entry_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
};

type DailyReport = {
  barber_id: string;
  barber_name: string;
  date: string;
  total_hours: number;
  break_hours: number;
  net_hours: number;
  entry_count: number;
};

export default function OwnerBarbersTimeTracking() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    loadBarbers();
  }, [userData, navigate]);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'BARBER')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  };

  const loadTimeData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const startDateTime = new Date(startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();

      let query = supabase
        .from('barber_time_entries')
        .select('*, users!barber_time_entries_barber_id_fkey(name)')
        .gte('timestamp', startDateTime)
        .lte('timestamp', endDateTime)
        .order('timestamp', { ascending: true });

      if (selectedBarber) {
        query = query.eq('barber_id', selectedBarber);
      }

      const { data, error } = await query;

      if (error) throw error;

      const entries: TimeEntry[] = (data || []).map(e => ({
        id: e.id,
        barber_id: e.barber_id,
        entry_type: e.entry_type,
        timestamp: e.timestamp,
      }));

      const dailyReports = calculateDailyReports(entries, data || []);

      setReports(dailyReports);
    } catch (error) {
      console.error('❌ [TimeTracking] Error loading time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyReports = (entries: TimeEntry[], rawData: any[]): DailyReport[] => {
    const reportMap = new Map<string, DailyReport>();

    const barbersByDate = new Map<string, Map<string, TimeEntry[]>>();

    entries.forEach((entry) => {
      const date = entry.timestamp.split('T')[0];
      // Use a separator that won't conflict with UUID dashes
      const key = `${entry.barber_id}|${date}`;

      if (!barbersByDate.has(key)) {
        barbersByDate.set(key, new Map());
      }

      const dateEntries = barbersByDate.get(key)!;
      if (!dateEntries.has(entry.barber_id)) {
        dateEntries.set(entry.barber_id, []);
      }

      dateEntries.get(entry.barber_id)!.push(entry);
    });

    barbersByDate.forEach((dateEntries, key) => {
      // Split by pipe separator to correctly parse barber_id and date
      const [_barberId, date] = key.split('|');

      dateEntries.forEach((dayEntries, bid) => {
        const clockIns = dayEntries.filter(e => e.entry_type === 'clock_in');
        const clockOuts = dayEntries.filter(e => e.entry_type === 'clock_out');
        const breakStarts = dayEntries.filter(e => e.entry_type === 'break_start');
        const breakEnds = dayEntries.filter(e => e.entry_type === 'break_end');

        let totalWorked = 0;
        let totalBreak = 0;

        for (let i = 0; i < clockIns.length; i++) {
          const clockInTime = new Date(clockIns[i].timestamp).getTime();
          const clockOutTime = clockOuts[i] ? new Date(clockOuts[i].timestamp).getTime() : new Date(date + 'T23:59:59').getTime();
          totalWorked += clockOutTime - clockInTime;
        }

        for (let i = 0; i < breakStarts.length; i++) {
          const breakStartTime = new Date(breakStarts[i].timestamp).getTime();
          const breakEndTime = breakEnds[i] ? new Date(breakEnds[i].timestamp).getTime() : breakStartTime;
          totalBreak += breakEndTime - breakStartTime;
        }

        const barberEntry = rawData.find(e => e.barber_id === bid);
        const barberName = barberEntry?.users?.name || 'Unknown';

        const totalHours = totalWorked / (1000 * 60 * 60);
        const breakHours = totalBreak / (1000 * 60 * 60);
        const netHours = (totalWorked - totalBreak) / (1000 * 60 * 60);

        reportMap.set(key, {
          barber_id: bid,
          barber_name: barberName,
          date,
          total_hours: totalHours,
          break_hours: breakHours,
          net_hours: netHours,
          entry_count: dayEntries.length,
        });
      });
    });

    return Array.from(reportMap.values()).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.barber_name.localeCompare(b.barber_name);
    });
  };

  const handleExport = () => {
    const exportData = reports.map((r) => ({
      barber: r.barber_name,
      date: new Date(r.date).toLocaleDateString(),
      total_hours: r.total_hours.toFixed(2),
      break_hours: r.break_hours.toFixed(2),
      net_hours: r.net_hours.toFixed(2),
      entry_count: r.entry_count,
    }));

    exportToCSV(exportData, 'time-tracking', {
      barber: 'Barber',
      date: 'Date',
      total_hours: 'Total Hours',
      break_hours: 'Break Hours',
      net_hours: 'Net Hours',
      entry_count: 'Entry Count',
    });
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Time Tracking' : 'Registro de Tiempo'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {language === 'en'
              ? 'View hours worked by barbers, including breaks and net hours.'
              : 'Ver las horas trabajadas por los barberos, incluyendo descansos y horas netas.'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Start Date' : 'Fecha de Inicio'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'End Date' : 'Fecha de Fin'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Barber' : 'Barbero'}
              </label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">{language === 'en' ? 'All Barbers' : 'Todos los Barberos'}</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadTimeData}
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: loading ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {loading
                ? language === 'en'
                  ? 'Loading...'
                  : 'Cargando...'
                : language === 'en'
                ? 'Load Data'
                : 'Cargar Datos'}
            </button>
          </div>
        </div>

        {reports.length === 0 && !loading ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en'
                ? 'No time entries found for the selected date range.'
                : 'No se encontraron registros de tiempo para el rango de fechas seleccionado.'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                {language === 'en' ? 'Time Report' : 'Informe de Tiempo'}
              </h3>
              <button
                onClick={handleExport}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                {language === 'en' ? 'Export CSV' : 'Exportar CSV'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Date' : 'Fecha'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Total Hours' : 'Horas Totales'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Break Hours' : 'Horas de Descanso'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e8f5e9' }}>
                      {language === 'en' ? 'Net Hours' : 'Horas Netas'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Entries' : 'Registros'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={`${report.barber_id}-${report.date}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                        {report.barber_name}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        {new Date(report.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        {report.total_hours.toFixed(2)}h
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        {report.break_hours.toFixed(2)}h
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#f1f8f4' }}>
                        {report.net_hours.toFixed(2)}h
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                        {report.entry_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
