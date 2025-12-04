import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type DateRange = 'today' | 'last7' | 'last30' | 'all';

export default function OwnerReports() {
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [selectedBarber, setSelectedBarber] = useState('all');
  const [barbers, setBarbers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [barberStats, setBarberStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER' && !userData.can_view_shop_reports) {
      navigate('/');
      return;
    }
    loadData();
  }, [userData, dateRange, selectedBarber]);

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
    setLoading(true);
    try {
      const { data: barbersList } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'BARBER')
        .eq('active', true);

      setBarbers(barbersList || []);

      let query = supabase
        .from('appointments')
        .select('*, users(name)');

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('scheduled_start', dateFilter.start).lte('scheduled_start', dateFilter.end);
      }

      if (selectedBarber !== 'all') {
        query = query.eq('barber_id', selectedBarber);
      }

      const { data: appointments } = await query;

      const completed = (appointments || []).filter(a => a.status === 'completed' && a.paid_at);
      const noShows = (appointments || []).filter(a => a.status === 'no_show');

      const servicesRevenue = completed.reduce((sum, a) => sum + Number(a.services_total || 0), 0);
      const productsRevenue = completed.reduce((sum, a) => sum + Number(a.products_total || 0), 0);
      const totalTips = completed.reduce((sum, a) => sum + Number(a.tip_amount || 0), 0);
      const grossRevenue = completed.reduce((sum, a) => sum + Number(a.total_charged || 0), 0);
      const netRevenue = completed.reduce((sum, a) => sum + Number(a.net_revenue || 0), 0);
      const avgRating = completed.filter(a => a.rating).reduce((sum, a, _, arr) => sum + a.rating / arr.length, 0);

      setMetrics({
        servicesRevenue,
        productsRevenue,
        totalTips,
        grossRevenue,
        netRevenue,
        completedCount: completed.length,
        noShowCount: noShows.length,
        avgRating: avgRating || 0,
      });

      const barberMap = new Map();
      completed.forEach(apt => {
        const barberId = apt.barber_id || 'unassigned';
        const barberName = apt.users?.name || (language === 'en' ? 'Unassigned' : 'Sin asignar');

        if (!barberMap.has(barberId)) {
          barberMap.set(barberId, {
            name: barberName,
            servicesRevenue: 0,
            productsRevenue: 0,
            tips: 0,
            netRevenue: 0,
            completed: 0,
            avgRating: 0,
            ratings: [],
          });
        }

        const stats = barberMap.get(barberId);
        stats.servicesRevenue += Number(apt.services_total || 0);
        stats.productsRevenue += Number(apt.products_total || 0);
        stats.tips += Number(apt.tip_amount || 0);
        stats.netRevenue += Number(apt.net_revenue || 0);
        stats.completed += 1;
        if (apt.rating) stats.ratings.push(apt.rating);
      });

      const barberStatsArray = Array.from(barberMap.values()).map(stats => ({
        ...stats,
        avgRating: stats.ratings.length ? stats.ratings.reduce((a: number, b: number) => a + b, 0) / stats.ratings.length : 0,
      }));

      setBarberStats(barberStatsArray);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData || (userData.role !== 'OWNER' && !userData.can_view_shop_reports)) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {language === 'en' ? 'You do not have permission to view reports.' : 'No tienes permiso para ver reportes.'}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Reports' : 'Reportes'}
        </h2>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Date Range' : 'Rango de Fechas'}
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="today">{language === 'en' ? 'Today' : 'Hoy'}</option>
                <option value="last7">{language === 'en' ? 'Last 7 Days' : 'Últimos 7 Días'}</option>
                <option value="last30">{language === 'en' ? 'Last 30 Days' : 'Últimos 30 Días'}</option>
                <option value="all">{language === 'en' ? 'All Time' : 'Todo el Tiempo'}</option>
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Barber' : 'Barbero'}
              </label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="all">{language === 'en' ? 'All Barbers' : 'Todos los Barberos'}</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: language === 'en' ? 'Gross Revenue' : 'Ingresos Brutos', value: formatCurrency(metrics.grossRevenue) },
                { label: language === 'en' ? 'Net Revenue' : 'Ingresos Netos', value: formatCurrency(metrics.netRevenue) },
                { label: language === 'en' ? 'Services' : 'Servicios', value: formatCurrency(metrics.servicesRevenue) },
                { label: language === 'en' ? 'Products' : 'Productos', value: formatCurrency(metrics.productsRevenue) },
                { label: language === 'en' ? 'Tips' : 'Propinas', value: formatCurrency(metrics.totalTips) },
                { label: language === 'en' ? 'Completed' : 'Completadas', value: metrics.completedCount },
                { label: language === 'en' ? 'No-Shows' : 'Ausencias', value: metrics.noShowCount },
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
                {language === 'en' ? 'By Barber' : 'Por Barbero'}
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Services' : 'Servicios'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Products' : 'Productos'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Tips' : 'Propinas'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Net Revenue' : 'Ingresos Netos'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Avg Rating' : 'Calif. Prom'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Completed' : 'Completadas'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {barberStats.map((barber, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.servicesRevenue)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.productsRevenue)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.tips)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.netRevenue)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.avgRating.toFixed(1)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.completed}</td>
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
