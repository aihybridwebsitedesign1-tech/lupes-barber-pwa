import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type ConfirmResetModalProps = {
  title: string;
  description: string;
  warningText: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
};

export default function ConfirmResetModal({
  title,
  description,
  warningText,
  onConfirm,
  onClose,
  isLoading,
}: ConfirmResetModalProps) {
  const { language } = useLanguage();
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText.toUpperCase() === 'RESET';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed && !isLoading) {
      await onConfirm();
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem',
            }}
          >
            <span style={{ fontSize: '24px' }}>⚠️</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
        </div>

        <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
          {description}
        </p>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '2px solid #fcc',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#c00', margin: 0 }}>
            {warningText}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {language === 'en'
                ? 'Type "RESET" to confirm:'
                : 'Escriba "RESET" para confirmar:'}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: !isConfirmed || isLoading ? '#ccc' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: !isConfirmed || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading
                ? language === 'en'
                  ? 'Processing...'
                  : 'Procesando...'
                : language === 'en'
                ? 'Confirm Reset'
                : 'Confirmar Reinicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
