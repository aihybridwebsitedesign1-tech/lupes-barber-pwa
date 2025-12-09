import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const IOS_SEEN_KEY = 'lupe_pwa_ios_seen';

function isIOSSafari(): boolean {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const standalone = (window.navigator as any).standalone;

  return iOS && webkit && !standalone;
}

export default function IOSSafariInstallGuide() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasSeenBanner = localStorage.getItem(IOS_SEEN_KEY) === 'true';

    if (!hasSeenBanner && isIOSSafari()) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(IOS_SEEN_KEY, 'true');
    setShowBanner(false);
    setShowModal(false);
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  if (!showBanner) {
    return null;
  }

  const text = {
    banner: {
      en: "Add Lupe's Barber Shop to your home screen for quick access.",
      es: "Agrega Lupe's Barber Shop a tu pantalla de inicio para acceso rápido.",
    },
    cta: {
      en: 'How to add',
      es: 'Cómo agregar',
    },
    modalTitle: {
      en: 'Add to Home Screen',
      es: 'Añadir a Pantalla de Inicio',
    },
    steps: {
      en: [
        "Tap the share icon (square with arrow) at the bottom of Safari.",
        "Scroll down and tap 'Add to Home Screen'.",
        "Tap 'Add' to finish.",
      ],
      es: [
        "Toca el icono de compartir (cuadrado con flecha) en la parte de abajo.",
        "Desplázate hacia abajo y toca 'Añadir a pantalla de inicio'.",
        "Pulsa 'Añadir' para terminar.",
      ],
    },
    close: {
      en: 'Close',
      es: 'Cerrar',
    },
  };

  const currentLang = language === 'es' ? 'es' : 'en';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: '#1f2937',
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
          {text.banner[currentLang]}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleOpenModal}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            {text.cta[currentLang]}
          </button>
          <button
            onClick={handleDismiss}
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

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={handleDismiss}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '1rem',
                color: '#000',
              }}
            >
              {text.modalTitle[currentLang]}
            </h2>

            <ol
              style={{
                paddingLeft: '1.25rem',
                marginBottom: '1.5rem',
                color: '#374151',
              }}
            >
              {text.steps[currentLang].map((step, index) => (
                <li
                  key={index}
                  style={{
                    marginBottom: '0.75rem',
                    fontSize: '15px',
                    lineHeight: '1.5',
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>

            <button
              onClick={handleDismiss}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {text.close[currentLang]}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
