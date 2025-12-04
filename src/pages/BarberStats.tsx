import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type DateRange = 'today' | 'last7' | 'last30' | 'all';

export default function BarberStats() {
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [metrics, setMetrics] = useState<any>({});
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (!userData.can_view_own_stats) {
      navigate('/');
      return;
    }
    loadData();
  }, [userData, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return { start: startOfToday.toISOString(), end: endOfToday.toISOString() };
    } else if (dateRange === 'last7') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    } else if (dateRange === 'last30') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    return null;
  };

  const loadData = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select('*, clients(first_name, last_name), services(name_en, name_es)')
        .eq('barber_id', userData.id)
        .eq('status', 'completed')
        .not('paid_at', 'is', null);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('scheduled_start', dateFilter.start).lte('scheduled_start', dateFilter.end);
      }

      const { data } = await query.order('scheduled_start', { ascending: false });

      const completed = data || [];
      const uniqueClients = new Set(completed.map(a => a.client_id)).size;
      const servicesRevenue = completed.reduce((sum, a) => sum + Number(a.services_total || 0), 0);
      const productsRevenue = completed.reduce((sum, a) => sum + Number(a.products_total || 0), 0);
      const totalTips = completed.reduce((sum, a) => sum + Number(a.tip_amount || 0), 0);
      const netRevenue = completed.reduce((sum, a) => sum + Number(a.net_revenue || 0), 0);
      const ratings = completed.filter(a => a.rating);
      const avgRating = ratings.length ? ratings.reduce((sum, a) => sum + a.rating, 0) / ratings.length : 0;

      setMetrics({
        clientsServed: uniqueClients,
        servicesRevenue,
        productsRevenue,
        totalTips,
        netRevenue,
        avgRating,
      });

      setAppointments(completed);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData || !userData.can_view_own_stats) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {language === 'en' ? 'You do not have permission to view stats.' : 'No tienes permiso para ver estadísticas.'}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'My Stats' : 'Mis Estadísticas'}
        </h2>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Date Range' : 'Rango de Fechas'}
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            style={{ width: '100%', maxWidth: '300px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="today">{language === 'en' ? 'Today' : 'Hoy'}</option>
            <option value="last7">{language === 'en' ? 'Last 7 Days' : 'Últimos 7 Días'}</option>
            <option value="last30">{language === 'en' ? 'Last 30 Days' : 'Últimos 30 Días'}</option>
            <option value="all">{language === 'en' ? 'All Time' : 'Todo el Tiempo'}</option>
          </select>
        </div>

        {loading ? (
          <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: language === 'en' ? 'Clients Served' : 'Clientes Atendidos', value: metrics.clientsServed },
                { label: language === 'en' ? 'Services Revenue' : 'Ingresos Servicios', value: formatCurrency(metrics.servicesRevenue) },
                { label: language === 'en' ? 'Products Revenue' : 'Ingresos Productos', value: formatCurrency(metrics.productsRevenue) },
                { label: language === 'en' ? 'Tips' : 'Propinas', value: formatCurrency(metrics.totalTips) },
                { label: language === 'en' ? 'Net Revenue' : 'Ingresos Netos', value: formatCurrency(metrics.netRevenue) },
                { label: language === 'en' ? 'Avg Rating' : 'Calificación Prom', value: metrics.avgRating.toFixed(1) },
              ].map((card, i) => (
                <div key={i} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>{card.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <h3 style={{ padding: '1.5rem', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                {language === 'en' ? 'Completed Appointments' : 'Citas Completadas'}
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Date/Time' : 'Fecha/Hora'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Client' : 'Cliente'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Service' : 'Servicio'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Total' : 'Total'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Tip' : 'Propina'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Rating' : 'Calificación'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatDateTime(apt.scheduled_start)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        {apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        {apt.services ? (language === 'es' ? apt.services.name_es : apt.services.name_en) : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(Number(apt.total_charged || 0))}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(Number(apt.tip_amount || 0))}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.rating || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
