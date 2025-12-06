import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type RecordPayoutModalProps = {
  barberId: string;
  barberName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function RecordPayoutModal({ barberId, barberName, onClose, onSuccess }: RecordPayoutModalProps) {
  const { language } = useLanguage();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(language === 'en' ? 'Please enter a valid amount' : 'Por favor ingrese una cantidad válida');
      return;
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('payouts').insert({
        barber_id: barberId,
        amount: amountNum,
        method,
        date_paid: datePaid,
        notes: notes.trim() || null,
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Error recording payout:', err);
      setError(language === 'en' ? 'Failed to record payout' : 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Record Payout' : 'Registrar Pago'}
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
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f5f5f5',
                cursor: 'not-allowed',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Amount' : 'Cantidad'}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Payment Method' : 'Método de Pago'}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="Cash">{language === 'en' ? 'Cash' : 'Efectivo'}</option>
              <option value="Card">{language === 'en' ? 'Card' : 'Tarjeta'}</option>
              <option value="Transfer">{language === 'en' ? 'Transfer' : 'Transferencia'}</option>
              <option value="Other">{language === 'en' ? 'Other' : 'Otro'}</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Date Paid' : 'Fecha de Pago'}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Notes' : 'Notas'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
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
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: saving ? '#ccc' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving
                ? language === 'en'
                  ? 'Saving...'
                  : 'Guardando...'
                : language === 'en'
                ? 'Save'
                : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
