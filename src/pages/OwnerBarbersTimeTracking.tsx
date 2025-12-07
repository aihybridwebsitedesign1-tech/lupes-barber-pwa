import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { exportToCSV } from '../lib/csvExport';
import {
  TimeEntry,
  DailySummary,
  calculateDailySummaries,
  formatTime,
  formatDuration,
} from '../lib/timeTracking';

export default function OwnerBarbersTimeTracking() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<DailySummary[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
        note: e.note,
      }));

      const barberNamesMap = new Map<string, string>();
      (data || []).forEach((e: any) => {
        if (e.users?.name) {
          barberNamesMap.set(e.barber_id, e.users.name);
        }
      });

      const dailySummaries = calculateDailySummaries(entries, barberNamesMap);

      setReports(dailySummaries);
    } catch (error) {
      console.error('❌ [TimeTracking] Error loading time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = reports.map((r) => ({
      barber: r.barberName,
      date: new Date(r.date).toLocaleDateString(),
      clock_in: r.shift.clockIn ? formatTime(r.shift.clockIn) : 'N/A',
      clock_out: r.shift.clockOut ? formatTime(r.shift.clockOut) : 'N/A',
      total_hours: r.totalHours.toFixed(2),
      break_hours: r.breakHours.toFixed(2),
      net_hours: r.netHours.toFixed(2),
      status: r.shift.status,
      has_issues: r.hasIssues ? 'Yes' : 'No',
      issue: r.issueDescription || '',
    }));

    exportToCSV(exportData, 'time-tracking', {
      barber: 'Barber',
      date: 'Date',
      clock_in: 'Clock In',
      clock_out: 'Clock Out',
      total_hours: 'Total Hours',
      break_hours: 'Break Hours',
      net_hours: 'Net Hours',
      status: 'Status',
      has_issues: 'Has Issues',
      issue: 'Issue',
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
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500', width: '40px' }}></th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Date' : 'Fecha'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Clock In' : 'Entrada'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Clock Out' : 'Salida'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Break' : 'Descanso'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e8f5e9' }}>
                      {language === 'en' ? 'Net Hours' : 'Horas Netas'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Status' : 'Estado'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const rowKey = `${report.barberId}-${report.date}`;
                    const isExpanded = expandedRow === rowKey;

                    return (
                      <>
                        <tr
                          key={rowKey}
                          style={{
                            borderBottom: '1px solid #eee',
                            cursor: 'pointer',
                            backgroundColor: report.hasIssues ? '#fff3cd' : 'transparent',
                          }}
                          onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                        >
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '16px' }}>{isExpanded ? '▼' : '▶'}</span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                            {report.barberName}
                            {report.hasIssues && (
                              <span
                                style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '12px',
                                  padding: '2px 6px',
                                  backgroundColor: '#f59e0b',
                                  color: 'white',
                                  borderRadius: '4px',
                                }}
                              >
                                ⚠
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '14px' }}>
                            {new Date(report.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '13px', color: '#666' }}>
                            {report.shift.clockIn ? formatTime(report.shift.clockIn) : '—'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '13px', color: '#666' }}>
                            {report.shift.clockOut ? formatTime(report.shift.clockOut) : '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                            {report.breakHours.toFixed(2)}h
                          </td>
                          <td
                            style={{
                              padding: '1rem',
                              textAlign: 'right',
                              fontSize: '16px',
                              fontWeight: '600',
                              backgroundColor: '#f1f8f4',
                              color: '#16a34a',
                            }}
                          >
                            {report.netHours.toFixed(2)}h
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontSize: '12px' }}>
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor:
                                  report.shift.status === 'complete'
                                    ? '#d4edda'
                                    : report.shift.status === 'in_progress'
                                    ? '#cfe2ff'
                                    : report.shift.status === 'on_break'
                                    ? '#fff3cd'
                                    : '#f8d7da',
                                color:
                                  report.shift.status === 'complete'
                                    ? '#155724'
                                    : report.shift.status === 'in_progress'
                                    ? '#004085'
                                    : report.shift.status === 'on_break'
                                    ? '#856404'
                                    : '#721c24',
                                fontWeight: '500',
                              }}
                            >
                              {report.shift.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${rowKey}-detail`} style={{ backgroundColor: '#f9f9f9' }}>
                            <td colSpan={8} style={{ padding: '1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.75rem' }}>
                                    {language === 'en' ? 'Shift Details' : 'Detalles del Turno'}
                                  </h4>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                      gap: '1rem',
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                                        {language === 'en' ? 'Total Worked' : 'Total Trabajado'}
                                      </div>
                                      <div style={{ fontSize: '16px', fontWeight: '500' }}>
                                        {formatDuration(report.shift.totalWorkedMs)}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                                        {language === 'en' ? 'Break Time' : 'Tiempo de Descanso'}
                                      </div>
                                      <div style={{ fontSize: '16px', fontWeight: '500' }}>
                                        {formatDuration(report.shift.breakTimeMs)}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                                        {language === 'en' ? 'Net Worked' : 'Neto Trabajado'}
                                      </div>
                                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>
                                        {formatDuration(report.shift.netWorkedMs)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {report.shift.breaks.length > 0 && (
                                  <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                                      {language === 'en' ? 'Breaks' : 'Descansos'}
                                    </h4>
                                    {report.shift.breaks.map((brk, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          gap: '1rem',
                                          alignItems: 'center',
                                          padding: '0.5rem',
                                          backgroundColor: 'white',
                                          borderRadius: '4px',
                                          marginBottom: '0.5rem',
                                        }}
                                      >
                                        <span style={{ fontSize: '13px', color: '#666' }}>
                                          {language === 'en' ? 'Break' : 'Descanso'} #{idx + 1}:
                                        </span>
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                          {formatTime(brk.start)}
                                        </span>
                                        <span>→</span>
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                          {brk.end ? formatTime(brk.end) : language === 'en' ? 'In Progress' : 'En Curso'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {report.hasIssues && report.issueDescription && (
                                  <div
                                    style={{
                                      padding: '0.75rem',
                                      backgroundColor: '#fff3cd',
                                      borderLeft: '4px solid #f59e0b',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#856404', marginBottom: '0.25rem' }}>
                                      ⚠ {language === 'en' ? 'Issue Detected' : 'Problema Detectado'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#856404' }}>{report.issueDescription}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
