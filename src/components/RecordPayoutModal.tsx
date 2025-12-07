import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  calculateCommissionForPeriod,
  createPayout,
  formatCurrency,
  formatRate,
  type PayoutCalculation,
} from '../lib/commissions';

type RecordPayoutModalProps = {
  barberId: string;
  barberName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function RecordPayoutModal({ barberId, barberName, onClose, onSuccess }: RecordPayoutModalProps) {
  const { language } = useLanguage();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculation, setCalculation] = useState<PayoutCalculation | null>(null);
  const [actualAmount, setActualAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [overrideNote, setOverrideNote] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    handleCalculate();
  }, []);

  const handleCalculate = async () => {
    if (!startDate || !endDate) return;

    setCalculating(true);
    setError('');

    try {
      const calc = await calculateCommissionForPeriod(barberId, startDate, endDate);

      if (!calc) {
        setError(language === 'en' ? 'Failed to calculate commission' : 'Error al calcular la comisión');
        return;
      }

      setCalculation(calc);
      setActualAmount(calc.calculated_amount.toFixed(2));
    } catch (err) {
      console.error('Error calculating commission:', err);
      setError(language === 'en' ? 'Failed to calculate commission' : 'Error al calcular la comisión');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!calculation) {
      setError(language === 'en' ? 'Please calculate commission first' : 'Por favor calcule la comisión primero');
      return;
    }

    const actualNum = parseFloat(actualAmount);
    if (isNaN(actualNum) || actualNum < 0) {
      setError(language === 'en' ? 'Please enter a valid amount' : 'Por favor ingrese una cantidad válida');
      return;
    }

    const calculatedNum = calculation.calculated_amount;
    const isOverride = Math.abs(calculatedNum - actualNum) > 0.01;

    if (isOverride && (!overrideNote || overrideNote.trim().length === 0)) {
      setError(
        language === 'en'
          ? 'Override note is required when actual amount differs from calculated'
          : 'Se requiere nota cuando el monto difiere del calculado'
      );
      return;
    }

    setSaving(true);
    try {
      const result = await createPayout(
        barberId,
        startDate,
        endDate,
        actualNum,
        paymentMethod,
        isOverride ? overrideNote : undefined,
        false
      );

      if (!result.success) {
        setError(result.error || (language === 'en' ? 'Failed to create payout' : 'Error al crear el pago'));
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error recording payout:', err);
      setError(language === 'en' ? 'Failed to record payout' : 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const calculatedAmount = calculation?.calculated_amount || 0;
  const actualNum = parseFloat(actualAmount) || 0;
  const isOverride = Math.abs(calculatedAmount - actualNum) > 0.01;
  const difference = actualNum - calculatedAmount;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Record Commission Payout' : 'Registrar Pago de Comisión'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Barber' : 'Barbero'}
            </label>
            <input
              type="text"
              value={barberName}
              readOnly
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f5f5f5',
                cursor: 'not-allowed',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Start Date' : 'Fecha Inicio'}
                <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'End Date' : 'Fecha Fin'}
                <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: calculating ? '#ccc' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: calculating ? 'not-allowed' : 'pointer',
              marginBottom: '1.5rem',
            }}
          >
            {calculating
              ? language === 'en'
                ? 'Calculating...'
                : 'Calculando...'
              : language === 'en'
              ? 'Calculate Commission'
              : 'Calcular Comisión'}
          </button>

          {calculation && (
            <>
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    {language === 'en' ? 'Commission Summary' : 'Resumen de Comisión'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {showBreakdown
                      ? language === 'en'
                        ? 'Hide Details'
                        : 'Ocultar Detalles'
                      : language === 'en'
                      ? 'Show Details'
                      : 'Mostrar Detalles'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'Services' : 'Servicios'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>
                      {formatCurrency(calculation.breakdown.services.commission_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {calculation.breakdown.services.count}{' '}
                      {language === 'en' ? 'items' : 'items'} •{' '}
                      {formatRate(calculation.breakdown.services.commission_rate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'Products' : 'Productos'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>
                      {formatCurrency(calculation.breakdown.products.commission_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {calculation.breakdown.products.count}{' '}
                      {language === 'en' ? 'items' : 'items'} •{' '}
                      {formatRate(calculation.breakdown.products.commission_rate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                      {language === 'en' ? 'Tips' : 'Propinas'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>
                      {formatCurrency(calculation.breakdown.tips.commission_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {calculation.breakdown.tips.count}{' '}
                      {language === 'en' ? 'items' : 'items'} •{' '}
                      {formatRate(calculation.breakdown.tips.commission_rate)}
                    </div>
                  </div>
                </div>

                {showBreakdown && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                    {calculation.breakdown.services.count > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {language === 'en' ? 'Service Revenue' : 'Ingresos de Servicios'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatCurrency(calculation.breakdown.services.total_revenue)} ×{' '}
                          {formatRate(calculation.breakdown.services.commission_rate)} ={' '}
                          <strong>{formatCurrency(calculation.breakdown.services.commission_amount)}</strong>
                        </div>
                      </div>
                    )}
                    {calculation.breakdown.products.count > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {language === 'en' ? 'Product Revenue' : 'Ingresos de Productos'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatCurrency(calculation.breakdown.products.total_revenue)} ×{' '}
                          {formatRate(calculation.breakdown.products.commission_rate)} ={' '}
                          <strong>{formatCurrency(calculation.breakdown.products.commission_amount)}</strong>
                        </div>
                      </div>
                    )}
                    {calculation.breakdown.tips.count > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {language === 'en' ? 'Tips Received' : 'Propinas Recibidas'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatCurrency(calculation.breakdown.tips.total_amount)} ×{' '}
                          {formatRate(calculation.breakdown.tips.commission_rate)} ={' '}
                          <strong>{formatCurrency(calculation.breakdown.tips.commission_amount)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '2px solid #ddd',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {language === 'en' ? 'Calculated Commission:' : 'Comisión Calculada:'}
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                    {formatCurrency(calculatedAmount)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Actual Amount Paid' : 'Monto Real Pagado'}
                  <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: isOverride ? '2px solid #f59e0b' : '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600',
                    backgroundColor: isOverride ? '#fffbeb' : 'white',
                  }}
                />
                {isOverride && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#fef3c7',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#92400e',
                    }}
                  >
                    ⚠ {language === 'en' ? 'Override detected' : 'Anulación detectada'}: {difference > 0 ? '+' : ''}
                    {formatCurrency(difference)}
                    <br />
                    {language === 'en'
                      ? 'Please provide a reason below'
                      : 'Por favor proporcione una razón a continuación'}
                  </div>
                )}
              </div>

              {isOverride && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'Override Reason' : 'Razón de Anulación'}
                    <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    rows={3}
                    required
                    placeholder={
                      language === 'en'
                        ? 'Explain why the amount differs...'
                        : 'Explique por qué el monto difiere...'
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #f59e0b',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Payment Method' : 'Método de Pago'}
                  <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="Cash">{language === 'en' ? 'Cash' : 'Efectivo'}</option>
                  <option value="Check">{language === 'en' ? 'Check' : 'Cheque'}</option>
                  <option value="Direct Deposit">{language === 'en' ? 'Direct Deposit' : 'Depósito Directo'}</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c00',
                fontSize: '14px',
                marginBottom: '1.5rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={saving || !calculation}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: saving || !calculation ? '#ccc' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving || !calculation ? 'not-allowed' : 'pointer',
              }}
            >
              {saving
                ? language === 'en'
                  ? 'Recording...'
                  : 'Registrando...'
                : language === 'en'
                ? 'Record Payout'
                : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
