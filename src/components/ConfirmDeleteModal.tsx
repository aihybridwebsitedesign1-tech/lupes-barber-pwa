import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmWord: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export default function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmWord,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  const { language } = useLanguage();
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const isMatch = inputValue === confirmWord;

  const handleConfirm = () => {
    if (isMatch && !isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    setInputValue('');
    onCancel();
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleCancel();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '1rem', color: '#d32f2f' }}>
          {title}
        </h2>

        <p style={{ marginBottom: '1.5rem', fontSize: '15px', lineHeight: '1.6', color: '#333' }}>
          {description}
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
            {language === 'en'
              ? `Type "${confirmWord}" to confirm:`
              : `Escriba "${confirmWord}" para confirmar:`}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              border: `2px solid ${isMatch ? '#4caf50' : '#ddd'}`,
              borderRadius: '6px',
              fontSize: '16px',
              fontFamily: 'monospace',
              transition: 'border-color 0.2s',
            }}
            placeholder={confirmWord}
          />
          {inputValue && !isMatch && (
            <p style={{ marginTop: '0.5rem', fontSize: '13px', color: '#d32f2f' }}>
              {language === 'en'
                ? `Must match exactly: ${confirmWord}`
                : `Debe coincidir exactamente: ${confirmWord}`}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch || isLoading}
            style={{
              padding: '10px 24px',
              backgroundColor: isMatch && !isLoading ? '#d32f2f' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !isMatch || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {isLoading
              ? (language === 'en' ? 'Deleting...' : 'Eliminando...')
              : (language === 'en' ? 'Delete Permanently' : 'Eliminar Permanentemente')}
          </button>
        </div>
      </div>
    </div>
  );
}
