import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import RecordPayoutModal from '../components/RecordPayoutModal';
import { exportToCSV } from '../lib/csvExport';

type BarberPayout = {
  barberId: string;
  barberName: string;
  servicesRevenue: number;
  productsRevenue: number;
  totalTips: number;
  commissionDueToBarber: number;
  dueToShop: number;
  payoutsRecorded: number;
  balanceDue: number;
};

type PayoutRecord = {
  id: string;
  barber_id: string;
  barber_name: string;
  amount: number;
  method: string;
  date_paid: string;
  notes: string | null;
};

export default function OwnerPayouts() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payouts, setPayouts] = useState<BarberPayout[]>([]);
  const [payoutRecords, setPayoutRecords] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<{ id: string; name: string } | null>(null);
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

      const { data: payoutData } = await supabase
        .from('payouts')
        .select('*, users!payouts_barber_id_fkey(name)')
        .gte('date_paid', startDate)
        .lte('date_paid', endDate)
        .order('date_paid', { ascending: false });

      const records: PayoutRecord[] = (payoutData || []).map((p) => ({
        id: p.id,
        barber_id: p.barber_id,
        barber_name: p.users?.name || 'Unknown',
        amount: p.amount,
        method: p.method,
        date_paid: p.date_paid,
        notes: p.notes,
      }));
      setPayoutRecords(records);

      const payoutsByBarber = new Map<string, number>();
      records.forEach((p) => {
        payoutsByBarber.set(p.barber_id, (payoutsByBarber.get(p.barber_id) || 0) + p.amount);
      });

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
            payoutsRecorded: 0,
            balanceDue: 0,
          });
        }

        const entry = barberMap.get(barberId)!;
        entry.servicesRevenue += Number(apt.services_total || 0);
        entry.productsRevenue += Number(apt.products_total || 0);
        entry.totalTips += Number(apt.tip_amount || 0);
        entry.commissionDueToBarber += Number(apt.service_due_to_barber || 0);
        entry.dueToShop += Number(apt.service_due_to_shop || 0);
      });

      barberMap.forEach((entry, barberId) => {
        entry.payoutsRecorded = payoutsByBarber.get(barberId) || 0;
        entry.balanceDue = entry.commissionDueToBarber - entry.payoutsRecorded;
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

  const handleRecordPayout = (barberId: string, barberName: string) => {
    setSelectedBarber({ id: barberId, name: barberName });
    setShowRecordModal(true);
  };

  const handlePayoutSuccess = () => {
    setShowRecordModal(false);
    setSelectedBarber(null);
    loadPayouts();
  };

  const handleExportPayouts = () => {
    const exportData = payoutRecords.map((p) => ({
      barber: p.barber_name,
      date_paid: new Date(p.date_paid).toLocaleDateString(),
      amount: p.amount,
      method: p.method,
      notes: p.notes || '',
    }));

    exportToCSV(exportData, 'payout-history', {
      barber: 'Barber',
      date_paid: 'Date Paid',
      amount: 'Amount',
      method: 'Method',
      notes: 'Notes',
    });
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
      payoutsRecorded: acc.payoutsRecorded + p.payoutsRecorded,
      balanceDue: acc.balanceDue + p.balanceDue,
    }),
    { servicesRevenue: 0, productsRevenue: 0, totalTips: 0, commissionDueToBarber: 0, dueToShop: 0, payoutsRecorded: 0, balanceDue: 0 }
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Payouts' : 'Pagos'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {language === 'en'
              ? 'Track commission earnings, record payouts, and manage balances for your barbers.'
              : 'Rastrea ganancias por comisión, registra pagos y administra saldos para tus barberos.'}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
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
                      {language === 'en' ? 'Commission Due' : 'Comisión Debida'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e3f2fd' }}>
                      {language === 'en' ? 'Payouts Recorded' : 'Pagos Registrados'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#fff9c4' }}>
                      {language === 'en' ? 'Balance Due' : 'Saldo Debido'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Actions' : 'Acciones'}
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
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e3f2fd' }}>
                        ${payout.payoutsRecorded.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#fffbec' }}>
                        ${payout.balanceDue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRecordPayout(payout.barberId, payout.barberName)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                          }}
                        >
                          {language === 'en' ? 'Record Payout' : 'Registrar Pago'}
                        </button>
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
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>
                        ${totals.payoutsRecorded.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff9c4' }}>
                        ${totals.balanceDue.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem' }}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {payoutRecords.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                {language === 'en' ? 'Payout History' : 'Historial de Pagos'}
              </h3>
              <button
                onClick={handleExportPayouts}
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
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Date' : 'Fecha'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Amount' : 'Cantidad'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Method' : 'Método'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Notes' : 'Notas'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '13px' }}>
                        {new Date(record.date_paid).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '13px', fontWeight: '500' }}>
                        {record.barber_name}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                        ${record.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '13px' }}>
                        {record.method}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '13px', color: '#666' }}>
                        {record.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showRecordModal && selectedBarber && (
          <RecordPayoutModal
            barberId={selectedBarber.id}
            barberName={selectedBarber.name}
            onClose={() => setShowRecordModal(false)}
            onSuccess={handlePayoutSuccess}
          />
        )}
      </main>
    </div>
  );
}
