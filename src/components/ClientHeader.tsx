import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import BarberPole from './BarberPole';

export default function ClientHeader() {
  const { language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { label: language === 'en' ? 'Home' : 'Inicio', path: '/client/home' },
    { label: language === 'en' ? 'Services' : 'Servicios', path: '/client/services' },
    { label: language === 'en' ? 'Barbers' : 'Barberos', path: '/client/barbers' },
    { label: language === 'en' ? 'Products' : 'Productos', path: '/client/products' },
    { label: language === 'en' ? 'Book Now' : 'Reservar', path: '/client/book' },
  ];

  return (
    <>
      <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BarberPole variant="icon" height={40} />
            <Link to="/client/home" style={{ textDecoration: 'none' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                Lupe's Barber
              </h1>
            </Link>
          </div>

          {!isMobile && (
            <>
              <nav style={{ display: 'flex', gap: '1rem', flex: '1', minWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      fontSize: '16px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: language === 'en' ? 'white' : 'transparent',
                    color: language === 'en' ? '#000' : 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '40px',
                    fontWeight: '500',
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('es')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: language === 'es' ? 'white' : 'transparent',
                    color: language === 'es' ? '#000' : 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '40px',
                    fontWeight: '500',
                  }}
                >
                  ES
                </button>
              </div>
            </>
          )}

          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Menu"
            >
              <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
              <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
              <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
            </button>
          )}
        </div>
      </header>

      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: 0,
            right: 0,
            backgroundColor: '#000',
            color: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxHeight: 'calc(100vh - 72px)',
            overflowY: 'auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '16px',
                  display: 'block',
                }}
              >
                {item.label}
              </Link>
            ))}

            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', marginRight: '0.5rem' }}>
                {language === 'en' ? 'Language:' : 'Idioma:'}
              </span>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: language === 'en' ? 'white' : 'transparent',
                  color: language === 'en' ? '#000' : 'white',
                  border: '1px solid white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: language === 'es' ? 'white' : 'transparent',
                  color: language === 'es' ? '#000' : 'white',
                  border: '1px solid white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                ES
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
