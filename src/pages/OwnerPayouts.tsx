import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import RecordPayoutModal from '../components/RecordPayoutModal';
import { exportToCSV } from '../lib/csvExport';
import { getBarbersSummary, formatCurrency, formatRate, type BarberSummary } from '../lib/commissions';

type PayoutRecord = {
  id: string;
  barber_id: string;
  barber_name: string;
  actual_amount_paid: number;
  calculated_amount: number;
  payment_method: string;
  date_paid: string;
  override_flag: boolean;
  override_note: string | null;
  start_date: string;
  end_date: string;
};

export default function OwnerPayouts() {
  const [barberSummaries, setBarberSummaries] = useState<BarberSummary[]>([]);
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

    loadData();
  }, [userData, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const summaries = await getBarbersSummary();
      setBarberSummaries(summaries);

      const { data: payoutData } = await supabase
        .from('payouts')
        .select('*, users!payouts_barber_id_fkey(name)')
        .order('date_paid', { ascending: false })
        .limit(50);

      const records: PayoutRecord[] = (payoutData || []).map((p) => ({
        id: p.id,
        barber_id: p.barber_id,
        barber_name: p.users?.name || 'Unknown',
        actual_amount_paid: parseFloat(p.actual_amount_paid),
        calculated_amount: parseFloat(p.calculated_amount),
        payment_method: p.payment_method,
        date_paid: p.date_paid,
        override_flag: p.override_flag,
        override_note: p.override_note,
        start_date: p.start_date,
        end_date: p.end_date,
      }));
      setPayoutRecords(records);
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
    loadData();
  };

  const handleExportSummary = () => {
    const exportData = barberSummaries.map((s) => ({
      barber: s.barber_name,
      service_revenue: s.service_revenue.toFixed(2),
      product_revenue: s.product_revenue.toFixed(2),
      tip_revenue: s.tip_revenue.toFixed(2),
      service_rate: formatRate(s.commission_rates.service_commission_rate),
      product_rate: formatRate(s.commission_rates.product_commission_rate),
      tip_rate: formatRate(s.commission_rates.tip_commission_rate),
      total_commission_due: s.total_commission_due.toFixed(2),
      total_paid: s.total_paid.toFixed(2),
      balance_due: s.balance_due.toFixed(2),
    }));

    exportToCSV(exportData, 'commission-summary', {
      barber: 'Barber',
      service_revenue: 'Service Revenue',
      product_revenue: 'Product Revenue',
      tip_revenue: 'Tip Revenue',
      service_rate: 'Service Rate',
      product_rate: 'Product Rate',
      tip_rate: 'Tip Rate',
      total_commission_due: 'Total Commission Due',
      total_paid: 'Total Paid',
      balance_due: 'Balance Due',
    });
  };

  const handleExportPayouts = () => {
    const exportData = payoutRecords.map((p) => ({
      barber: p.barber_name,
      start_date: new Date(p.start_date).toLocaleDateString(),
      end_date: new Date(p.end_date).toLocaleDateString(),
      date_paid: new Date(p.date_paid).toLocaleDateString(),
      calculated_amount: p.calculated_amount.toFixed(2),
      actual_amount_paid: p.actual_amount_paid.toFixed(2),
      override: p.override_flag ? 'Yes' : 'No',
      override_note: p.override_note || '',
      payment_method: p.payment_method,
    }));

    exportToCSV(exportData, 'payout-history', {
      barber: 'Barber',
      start_date: 'Period Start',
      end_date: 'Period End',
      date_paid: 'Date Paid',
      calculated_amount: 'Calculated',
      actual_amount_paid: 'Actual Paid',
      override: 'Override',
      override_note: 'Override Note',
      payment_method: 'Payment Method',
    });
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const totals = barberSummaries.reduce(
    (acc, s) => ({
      serviceRevenue: acc.serviceRevenue + s.service_revenue,
      productRevenue: acc.productRevenue + s.product_revenue,
      tipRevenue: acc.tipRevenue + s.tip_revenue,
      totalCommissionDue: acc.totalCommissionDue + s.total_commission_due,
      totalPaid: acc.totalPaid + s.total_paid,
      balanceDue: acc.balanceDue + s.balance_due,
    }),
    { serviceRevenue: 0, productRevenue: 0, tipRevenue: 0, totalCommissionDue: 0, totalPaid: 0, balanceDue: 0 }
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Commission Payouts' : 'Pagos de Comisión'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {language === 'en'
              ? 'Auto-calculated commission earnings with detailed tracking. All unpaid items are shown below.'
              : 'Ganancias de comisión auto-calculadas con seguimiento detallado. Todos los artículos no pagados se muestran a continuación.'}
          </p>
        </div>

        {loading ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'Loading commission data...' : 'Cargando datos de comisión...'}
            </p>
          </div>
        ) : barberSummaries.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en'
                ? 'No active barbers found.'
                : 'No se encontraron barberos activos.'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                {language === 'en' ? 'Unpaid Commissions' : 'Comisiones No Pagadas'}
              </h3>
              <button
                onClick={handleExportSummary}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Service Rev.' : 'Rev. Servicios'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Product Rev.' : 'Rev. Productos'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Tip Rev.' : 'Rev. Propinas'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e8f5e9' }}>
                      {language === 'en' ? 'Commission Due' : 'Comisión Debida'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e3f2fd' }}>
                      {language === 'en' ? 'Total Paid' : 'Total Pagado'}
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
                  {barberSummaries.map((summary) => (
                    <tr key={summary.barber_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                        {summary.barber_name}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        {formatCurrency(summary.service_revenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        {formatCurrency(summary.product_revenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                        {formatCurrency(summary.tip_revenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#f1f8f4' }}>
                        {formatCurrency(summary.total_commission_due)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500', backgroundColor: '#e3f2fd' }}>
                        {formatCurrency(summary.total_paid)}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          textAlign: 'right',
                          fontSize: '16px',
                          fontWeight: '600',
                          backgroundColor: '#fffbec',
                          color: summary.balance_due > 0 ? '#16a34a' : summary.balance_due < 0 ? '#dc2626' : '#666',
                        }}
                      >
                        {formatCurrency(summary.balance_due)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRecordPayout(summary.barber_id, summary.barber_name)}
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
                  {barberSummaries.length > 0 && (
                    <tr style={{ borderTop: '2px solid #000', backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '1rem', fontSize: '14px', fontWeight: 'bold' }}>
                        {language === 'en' ? 'TOTALS' : 'TOTALES'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatCurrency(totals.serviceRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatCurrency(totals.productRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                        {formatCurrency(totals.tipRevenue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>
                        {formatCurrency(totals.totalCommissionDue)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>
                        {formatCurrency(totals.totalPaid)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#fff9c4' }}>
                        {formatCurrency(totals.balanceDue)}
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
                {language === 'en' ? 'Recent Payout History' : 'Historial Reciente de Pagos'}
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
                      {language === 'en' ? 'Date Paid' : 'Fecha Pagada'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Barber' : 'Barbero'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Period' : 'Período'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Calculated' : 'Calculado'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Actual Paid' : 'Pagado Real'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Method' : 'Método'}
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
                      {language === 'en' ? 'Status' : 'Estado'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRecords.map((record) => {
                    const isOverride = record.override_flag;
                    const difference = record.actual_amount_paid - record.calculated_amount;

                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid #eee', backgroundColor: isOverride ? '#fffbeb' : 'white' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '13px' }}>
                          {new Date(record.date_paid).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '13px', fontWeight: '500' }}>
                          {record.barber_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '12px', color: '#666' }}>
                          {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px' }}>
                          {formatCurrency(record.calculated_amount)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                          {formatCurrency(record.actual_amount_paid)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '13px' }}>
                          {record.payment_method}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {isOverride ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}
                              title={record.override_note || ''}
                            >
                              ⚠ OVERRIDE {difference > 0 ? '+' : ''}
                              {formatCurrency(Math.abs(difference))}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                backgroundColor: '#d4edda',
                                color: '#155724',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}
                            >
                              ✓ {language === 'en' ? 'EXACT' : 'EXACTO'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
