import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

type Appointment = {
  id: string;
  scheduled_start: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  client_name: string;
  barber_name: string;
  service_name: string;
};

export default function OwnerAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, dateFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          status,
          payment_method,
          paid_at,
          clients!inner(first_name, last_name),
          users(name),
          services(name_en, name_es)
        `)
        .order('scheduled_start', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'today') {
          const endOfToday = new Date(startOfToday);
          endOfToday.setDate(endOfToday.getDate() + 1);
          query = query.gte('scheduled_start', startOfToday.toISOString()).lt('scheduled_start', endOfToday.toISOString());
        } else if (dateFilter === 'next7') {
          const next7Days = new Date(startOfToday);
          next7Days.setDate(next7Days.getDate() + 7);
          query = query.gte('scheduled_start', startOfToday.toISOString()).lt('scheduled_start', next7Days.toISOString());
        } else if (dateFilter === 'last30') {
          const last30Days = new Date(startOfToday);
          last30Days.setDate(last30Days.getDate() - 30);
          query = query.gte('scheduled_start', last30Days.toISOString()).lte('scheduled_start', now.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setAppointments(
          data.map((apt: any) => ({
            id: apt.id,
            scheduled_start: apt.scheduled_start,
            status: apt.status,
            payment_method: apt.payment_method,
            paid_at: apt.paid_at,
            client_name: `${apt.clients.first_name} ${apt.clients.last_name}`,
            barber_name: apt.users?.name || (language === 'en' ? 'Unassigned' : 'Sin asignar'),
            service_name: language === 'en' ? apt.services.name_en : apt.services.name_es,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string } } = {
      completed: { bg: '#d4edda', color: '#155724' },
      booked: { bg: '#fff3cd', color: '#856404' },
      no_show: { bg: '#f8d7da', color: '#721c24' },
      cancelled: { bg: '#f8d7da', color: '#721c24' },
    };
    return styles[status] || { bg: '#e9ecef', color: '#495057' };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <p>{t.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.appointments}</h2>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {t.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">{language === 'en' ? 'All Statuses' : 'Todos los Estados'}</option>
                <option value="booked">{language === 'en' ? 'Booked' : 'Reservada'}</option>
                <option value="completed">{language === 'en' ? 'Completed' : 'Completada'}</option>
                <option value="no_show">{language === 'en' ? 'No-Show' : 'Ausencia'}</option>
                <option value="cancelled">{language === 'en' ? 'Cancelled' : 'Cancelada'}</option>
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Date Range' : 'Rango de Fechas'}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">{language === 'en' ? 'All Time' : 'Todo el Tiempo'}</option>
                <option value="today">{language === 'en' ? 'Today' : 'Hoy'}</option>
                <option value="next7">{language === 'en' ? 'Next 7 Days' : 'Próximos 7 Días'}</option>
                <option value="last30">{language === 'en' ? 'Last 30 Days' : 'Últimos 30 Días'}</option>
              </select>
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'No appointments found' : 'No se encontraron citas'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Date/Time' : 'Fecha/Hora'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Client' : 'Cliente'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Service' : 'Servicio'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.status}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Payment' : 'Pago'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const statusStyle = getStatusBadgeStyle(apt.status);
                  return (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatDateTime(apt.scheduled_start)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.barber_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.client_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.service_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: apt.paid_at ? '#d4edda' : '#f8d7da',
                            color: apt.paid_at ? '#155724' : '#721c24',
                          }}
                        >
                          {apt.paid_at
                            ? language === 'en'
                              ? 'Paid'
                              : 'Pagado'
                            : language === 'en'
                            ? 'Unpaid'
                            : 'Sin pagar'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <button
                          onClick={() => navigate(`/owner/appointments/${apt.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {language === 'en' ? 'View' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
