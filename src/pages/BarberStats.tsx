import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type DailyEarnings = {
  date: string;
  appointmentCount: number;
  servicesRevenue: number;
  tips: number;
  commission: number;
};

export default function BarberStats() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!userData) return;
    if (!userData.can_view_own_stats) {
      navigate('/');
      return;
    }
    if (startDate && endDate) {
      loadData();
    }
  }, [userData, startDate, endDate]);

  const loadData = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_start, services_total, tip_amount, service_due_to_barber')
        .eq('barber_id', userData.id)
        .eq('status', 'completed')
        .gte('scheduled_start', startDateTime.toISOString())
        .lte('scheduled_start', endDateTime.toISOString())
        .order('scheduled_start', { ascending: false });

      if (error) throw error;

      const groupedByDay = new Map<string, DailyEarnings>();

      (data || []).forEach(apt => {
        const date = new Date(apt.scheduled_start).toISOString().split('T')[0];

        if (!groupedByDay.has(date)) {
          groupedByDay.set(date, {
            date,
            appointmentCount: 0,
            servicesRevenue: 0,
            tips: 0,
            commission: 0,
          });
        }

        const dayData = groupedByDay.get(date)!;
        dayData.appointmentCount++;
        dayData.servicesRevenue += Number(apt.services_total || 0);
        dayData.tips += Number(apt.tip_amount || 0);
        dayData.commission += Number(apt.service_due_to_barber || 0);
      });

      const sortedDailyEarnings = Array.from(groupedByDay.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setDailyEarnings(sortedDailyEarnings);
    } catch (error) {
      console.error('Error loading earnings:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalEarnings = dailyEarnings.reduce(
    (acc, day) => ({
      appointments: acc.appointments + day.appointmentCount,
      servicesRevenue: acc.servicesRevenue + day.servicesRevenue,
      tips: acc.tips + day.tips,
      commission: acc.commission + day.commission,
    }),
    { appointments: 0, servicesRevenue: 0, tips: 0, commission: 0 }
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'My Earnings' : 'Mis Ganancias'}
        </h2>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem' }}>
            {language === 'en' ? 'Date Range' : 'Rango de Fechas'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#666' }}>
                {language === 'en' ? 'Start Date' : 'Fecha Inicio'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#666' }}>
                {language === 'en' ? 'End Date' : 'Fecha Fin'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Total Appointments' : 'Total Citas'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totalEarnings.appointments}</div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Services Revenue' : 'Ingresos Servicios'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(totalEarnings.servicesRevenue)}</div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Total Tips' : 'Total Propinas'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(totalEarnings.tips)}</div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'My Commission' : 'Mi Comisión'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(totalEarnings.commission)}</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <h3 style={{ padding: '1.5rem', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                {language === 'en' ? 'Daily Breakdown' : 'Desglose Diario'}
              </h3>
              {dailyEarnings.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  {language === 'en' ? 'No completed appointments in this date range.' : 'No hay citas completadas en este rango de fechas.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9f9f9' }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                        {language === 'en' ? 'Date' : 'Fecha'}
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                        {language === 'en' ? 'Appointments' : 'Citas'}
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                        {language === 'en' ? 'Services' : 'Servicios'}
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                        {language === 'en' ? 'Tips' : 'Propinas'}
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                        {language === 'en' ? 'Commission' : 'Comisión'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyEarnings.map((day) => (
                      <tr key={day.date} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '1rem', fontSize: '14px' }}>{formatDate(day.date)}</td>
                        <td style={{ padding: '1rem', fontSize: '14px', textAlign: 'center', fontWeight: '600' }}>
                          {day.appointmentCount}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '14px', textAlign: 'right' }}>
                          {formatCurrency(day.servicesRevenue)}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '14px', textAlign: 'right' }}>
                          {formatCurrency(day.tips)}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '14px', textAlign: 'right', fontWeight: '600', color: '#28a745' }}>
                          {formatCurrency(day.commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
