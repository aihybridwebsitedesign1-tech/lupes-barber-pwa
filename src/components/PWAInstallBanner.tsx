import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';
import { useLanguage } from '../contexts/LanguageContext';

export default function PWAInstallBanner() {
  const { canInstall, install, dismiss } = usePWAInstallPrompt();
  const { language } = useLanguage();

  if (!canInstall) {
    return null;
  }

  const text = {
    en: "Add Lupe's Barber Shop to your home screen for faster booking.",
    es: "Agrega Lupe's Barber Shop a tu pantalla de inicio para reservar más rápido.",
  };

  const buttonText = {
    en: 'Install App',
    es: 'Instalar app',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: '#000',
        color: 'white',
        padding: '1rem',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}
    >
      <p style={{ margin: 0, fontSize: '14px', flex: 1, minWidth: '200px' }}>
        {language === 'es' ? text.es : text.en}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={install}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'es' ? buttonText.es : buttonText.en}
        </button>
        <button
          onClick={dismiss}
          style={{
            padding: '10px',
            backgroundColor: 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: '1',
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
