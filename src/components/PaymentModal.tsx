import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

type PaymentModalProps = {
  appointmentId: string;
  servicesTotal: number;
  productsTotal: number;
  onClose: () => void;
  onSave: () => void;
};

export default function PaymentModal({
  appointmentId,
  servicesTotal,
  productsTotal,
  onClose,
  onSave,
}: PaymentModalProps) {
  const { language, t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_in_shop' | 'card_online'>('cash');
  const [tipAmount, setTipAmount] = useState('0.00');
  const [cashBaseAmount, setCashBaseAmount] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [cardFeeRate, setCardFeeRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShopConfig();
  }, []);

  const loadShopConfig = async () => {
    try {
      const { data, error } = await supabase.from('shop_config').select('tax_rate, card_processing_fee_rate').single();

      if (error) throw error;

      setTaxRate(Number(data.tax_rate) || 0);
      setCardFeeRate(Number(data.card_processing_fee_rate) || 0.04);
    } catch (err) {
      console.error('Error loading shop config:', err);
      setTaxRate(0.08);
      setCardFeeRate(0.04);
    }
  };

  const calculateTotals = () => {
    const subtotal = servicesTotal + productsTotal;
    const taxAmount = subtotal * taxRate;
    const totalBeforeTip = subtotal + taxAmount;
    const tip = parseFloat(tipAmount) || 0;
    const totalBeforeFees = totalBeforeTip + tip;
    const processingFeeRate = paymentMethod === 'cash' ? 0 : cardFeeRate;
    const processingFeeAmount = totalBeforeFees * processingFeeRate;
    const totalCharged = totalBeforeFees + processingFeeAmount;
    const netRevenue = totalCharged - processingFeeAmount;

    return {
      subtotal,
      taxAmount,
      totalBeforeTip,
      tip,
      totalBeforeFees,
      processingFeeRate,
      processingFeeAmount,
      totalCharged,
      netRevenue,
    };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    const tip = parseFloat(tipAmount);
    if (isNaN(tip) || tip < 0) {
      setError(language === 'en' ? 'Tip must be a valid number >= 0' : 'La propina debe ser un número válido >= 0');
      return;
    }

    if (paymentMethod === 'cash') {
      const cashBase = parseFloat(cashBaseAmount);
      if (!cashBaseAmount || isNaN(cashBase) || cashBase < 0) {
        setError(
          language === 'en'
            ? 'Cash amount is required and must be >= 0'
            : 'El monto de efectivo es requerido y debe ser >= 0'
        );
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      if (paymentMethod === 'cash') {
        const cashBase = parseFloat(cashBaseAmount);
        const cashTotal = cashBase + tip;
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            services_total: servicesTotal,
            products_total: productsTotal,
            tax_amount: totals.taxAmount,
            tip_amount: tip,
            processing_fee_amount: 0,
            total_charged: cashTotal,
            net_revenue: cashTotal,
            payment_method: 'cash',
            paid_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            services_total: servicesTotal,
            products_total: productsTotal,
            tax_amount: totals.taxAmount,
            tip_amount: totals.tip,
            processing_fee_amount: totals.processingFeeAmount,
            total_charged: totals.totalCharged,
            net_revenue: totals.netRevenue,
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving payment:', err);
      setError(err.message || (language === 'en' ? 'Failed to save payment' : 'Error al guardar el pago'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Record Payment' : 'Registrar Pago'}
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Payment Method' : 'Método de Pago'}
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="cash">{language === 'en' ? 'Cash' : 'Efectivo'}</option>
            <option value="card_in_shop">{language === 'en' ? 'Card (in shop)' : 'Tarjeta (en tienda)'}</option>
            <option value="card_online">{language === 'en' ? 'Card (online)' : 'Tarjeta (en línea)'}</option>
          </select>
        </div>

        {paymentMethod === 'cash' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Cash Amount (before tip)' : 'Monto de Efectivo (antes de propina)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashBaseAmount}
                onChange={(e) => setCashBaseAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Tip Amount' : 'Monto de Propina'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Tip is stored separately and included in the recorded cash total.'
                  : 'La propina se almacena por separado e incluida en el total de efectivo registrado.'}
              </div>
            </div>
          </>
        )}

        {paymentMethod !== 'cash' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Tip Amount' : 'Monto de Propina'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        )}

        <div
          style={{
            backgroundColor: '#f9f9f9',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
            {language === 'en' ? 'Payment Breakdown' : 'Desglose de Pago'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>{language === 'en' ? 'Service:' : 'Servicio:'}</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(servicesTotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>{language === 'en' ? 'Products:' : 'Productos:'}</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(productsTotal)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                paddingTop: '0.5rem',
                borderTop: '1px solid #ddd',
              }}
            >
              <span style={{ fontWeight: '500' }}>{language === 'en' ? 'Subtotal:' : 'Subtotal:'}</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(totals.subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>
                {language === 'en' ? 'Tax' : 'Impuesto'} ({(taxRate * 100).toFixed(1)}%):
              </span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(totals.taxAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>{language === 'en' ? 'Tip:' : 'Propina:'}</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(totals.tip)}</span>
            </div>

            {paymentMethod !== 'cash' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>
                  {language === 'en' ? 'Card Processing Fee' : 'Tarifa de Procesamiento'} (
                  {(totals.processingFeeRate * 100).toFixed(1)}%):
                </span>
                <span style={{ fontWeight: '500' }}>{formatCurrency(totals.processingFeeAmount)}</span>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #ddd',
                    color: '#666',
                  }}
                >
                  <span>{language === 'en' ? 'Suggested Out-the-door Total (Cash):' : 'Total Sugerido (Efectivo):'}</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(totals.totalCharged)}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    paddingTop: '0.75rem',
                    borderTop: '2px solid #000',
                    marginTop: '0.5rem',
                  }}
                >
                  <span>
                    {language === 'en' ? 'Recorded Cash Total (base + tip):' : 'Total de Efectivo Registrado (base + propina):'}
                  </span>
                  <span>
                    {formatCurrency(
                      (parseFloat(cashBaseAmount) || 0) + (parseFloat(tipAmount) || 0)
                    )}
                  </span>
                </div>
              </>
            )}

            {paymentMethod !== 'cash' && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  paddingTop: '0.75rem',
                  borderTop: '2px solid #000',
                  marginTop: '0.5rem',
                }}
              >
                <span>{language === 'en' ? 'Card Total (includes fee):' : 'Total con Tarjeta (incluye tarifa):'}</span>
                <span>{formatCurrency(totals.totalCharged)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#666',
                paddingTop: '0.5rem',
              }}
            >
              <span>{language === 'en' ? 'Net Revenue (after fees):' : 'Ingreso Neto (después de tarifas):'}</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(totals.netRevenue)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              backgroundColor: saving ? '#ccc' : '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {saving ? (language === 'en' ? 'Saving...' : 'Guardando...') : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
