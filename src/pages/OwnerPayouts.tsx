import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type BarberPayout = {
  barberId: string;
  barberName: string;
  servicesRevenue: number;
  productsRevenue: number;
  totalTips: number;
  commissionDueToBarber: number;
  dueToShop: number;
};

export default function OwnerPayouts() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payouts, setPayouts] = useState<BarberPayout[]>([]);
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
  }, [userData, navigate]);

  useEffect(() => {
    if (startDate && endDate) {
      loadPayouts();
    }
  }, [startDate, endDate]);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const startDateTime = new Date(startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, users(name)')
        .eq('status', 'completed')
        .not('paid_at', 'is', null)
        .gte('completed_at', startDateTime)
        .lte('completed_at', endDateTime);

      const barberMap = new Map<string, BarberPayout>();

      (appointments || []).forEach((apt) => {
        const barberId = apt.barber_id;
        const barberName = apt.users?.name || 'Unknown';

        if (!barberMap.has(barberId)) {
          barberMap.set(barberId, {
            barberId,
            barberName,
            servicesRevenue: 0,
            productsRevenue: 0,
            totalTips: 0,
            commissionDueToBarber: 0,
            dueToShop: 0,
          });
        }

        const entry = barberMap.get(barberId)!;
        entry.servicesRevenue += Number(apt.services_total || 0);
        entry.productsRevenue += Number(apt.products_total || 0);
        entry.totalTips += Number(apt.tip_amount || 0);
        entry.commissionDueToBarber += Number(apt.service_due_to_barber || 0);
        entry.dueToShop += Number(apt.service_due_to_shop || 0);
      });

      setPayouts(Array.from(barberMap.values()).sort((a, b) =>
        b.commissionDueToBarber - a.commissionDueToBarber
      ));
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const totals = payouts.reduce(
    (acc, p) => ({
      servicesRevenue: acc.servicesRevenue + p.servicesRevenue,
      productsRevenue: acc.productsRevenue + p.productsRevenue,
      totalTips: acc.totalTips + p.totalTips,
      commissionDueToBarber: acc.commissionDueToBarber + p.commissionDueToBarber,
      dueToShop: acc.dueToShop + p.dueToShop,
    }),
    { servicesRevenue: 0, productsRevenue: 0, totalTips: 0, commissionDueToBarber: 0, dueToShop: 0 }
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Payouts (Beta)' : 'Pagos (Beta)'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Commission breakdown by barber for completed, paid appointments.'
              : 'Desglose de comisiones por barbero para citas completadas y pagadas.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
            {language === 'en'
              ? 'TODO: Add CSV export and more detailed breakdown later.'
              : 'TODO: Agregar exportación CSV y desglose más detallado después.'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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

            <button
              onClick={loadPayouts}
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
                ? (language === 'en' ? 'Loading...' : 'Cargando...')
                : (language === 'en' ? 'Load Data' : 'Cargar Datos')}
            </button>
          </div>
        </div>

        {payouts.length === 0 && !loading ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en'
                ? 'No payouts found for the selected date range.'
                : 'No se encontraron pagos para el rango de fechas seleccionado.'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Services' : 'Servicios'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Products' : 'Productos'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Tips' : 'Propinas'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e8f5e9' }}>
                      {language === 'en' ? 'Due to Barber' : 'Debido al Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#fff3e0' }}>
                      {language === 'en' ? 'Due to Shop' : 'Debido a la Tienda'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.barberId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                        {payout.barberName}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        ${payout.servicesRevenue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        ${payout.productsRevenue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        ${payout.totalTips.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#f1f8f4' }}>
                        ${payout.commissionDueToBarber.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#fff9f0' }}>
                        ${payout.dueToShop.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {payouts.length > 0 && (
                    <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '1rem', fontSize: '14px', fontWeight: 'bold' }}>
                        {language === 'en' ? 'TOTALS' : 'TOTALES'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        ${totals.servicesRevenue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        ${totals.productsRevenue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        ${totals.totalTips.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>
                        ${totals.commissionDueToBarber.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff3e0' }}>
                        ${totals.dueToShop.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {payouts.length > 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', fontSize: '12px', color: '#666' }}>
                <p style={{ margin: 0 }}>
                  {language === 'en'
                    ? 'Current commission rate: 50% of services revenue. Product commissions and tiered rates coming in Phase 7.'
                    : 'Tasa de comisión actual: 50% de ingresos por servicios. Comisiones de productos y tasas escalonadas próximamente en Fase 7.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
