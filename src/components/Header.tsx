import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

type MenuItem = {
  label: string;
  path: string;
  condition?: boolean;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

export default function Header() {
  const { userData, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    setActiveSection(null);
    navigate(path);
  };

  const isOwner = userData?.role === 'OWNER';

  const ownerMenuSections: MenuSection[] = [
    {
      label: language === 'en' ? 'Clients' : 'Clientes',
      items: [
        { label: language === 'en' ? 'Clients List' : 'Lista de Clientes', path: '/owner/clients' },
        { label: language === 'en' ? 'Retention & Acquisition' : 'Retención y Adquisición', path: '/owner/clients-report' },
      ],
    },
    {
      label: language === 'en' ? 'Barbers' : 'Barberos',
      items: [
        { label: language === 'en' ? 'Barbers List' : 'Lista de Barberos', path: '/owner/barbers' },
        { label: language === 'en' ? 'Time Tracking' : 'Seguimiento de Tiempo', path: '/owner/barbers-time-tracking' },
      ],
    },
    {
      label: language === 'en' ? 'Analytics' : 'Análisis',
      items: [
        { label: language === 'en' ? 'Overview Reports' : 'Reportes Generales', path: '/owner/reports', condition: userData?.role === 'OWNER' || userData?.can_view_shop_reports },
        { label: language === 'en' ? 'Payouts (Commissions)' : 'Pagos (Comisiones)', path: '/owner/payouts', condition: userData?.role === 'OWNER' },
      ].filter(item => item.condition !== false),
    },
    {
      label: language === 'en' ? 'Inventory & Sales' : 'Inventario y Ventas',
      items: [
        { label: language === 'en' ? 'Services' : 'Servicios', path: '/owner/services', condition: userData?.role === 'OWNER' || userData?.can_manage_services },
        { label: language === 'en' ? 'Products' : 'Productos', path: '/owner/products', condition: userData?.role === 'OWNER' || userData?.can_manage_products },
        { label: language === 'en' ? 'Inventory Management' : 'Gestión de Inventario', path: '/owner/inventory', condition: userData?.role === 'OWNER' },
        { label: language === 'en' ? 'Inventory Reports' : 'Reportes de Inventario', path: '/owner/inventory-reports', condition: userData?.role === 'OWNER' },
      ].filter(item => item.condition !== false),
    },
    {
      label: language === 'en' ? 'Messages' : 'Mensajes',
      items: [
        { label: language === 'en' ? 'SMS Campaigns' : 'Campañas SMS', path: '/owner/engage' },
        { label: language === 'en' ? 'Templates & Automations' : 'Plantillas y Automatizaciones', path: '/owner/sms-settings' },
      ],
    },
    {
      label: language === 'en' ? 'Settings' : 'Configuración',
      items: [
        { label: language === 'en' ? 'Shop Settings' : 'Configuración de Tienda', path: '/owner/settings' },
      ],
    },
  ];

  return (
    <>
      <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', gap: '1rem', width: '100%' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Lupe's Barber</h1>

          {userData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: language === 'en' ? 'white' : 'transparent',
                    color: language === 'en' ? '#000' : 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    minWidth: '32px',
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('es')}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: language === 'es' ? 'white' : 'transparent',
                    color: language === 'es' ? '#000' : 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    minWidth: '32px',
                  }}
                >
                  ES
                </button>
              </div>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                aria-label={language === 'en' ? 'Menu' : 'Menú'}
              >
                <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
                <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
                <div style={{ width: '24px', height: '3px', backgroundColor: 'white', borderRadius: '2px' }}></div>
              </button>
            </div>
          )}
        </div>
      </header>

      {isMenuOpen && userData && (
        <>
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '320px',
              maxWidth: '85vw',
              backgroundColor: '#000',
              color: 'white',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.3)',
              zIndex: 1000,
              overflowY: 'auto',
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                {language === 'en' ? 'Menu' : 'Menú'}
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
                aria-label={language === 'en' ? 'Close' : 'Cerrar'}
              >
                ✕
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {isOwner ? (
                <>
                  <button
                    onClick={() => handleNavigate('/owner/today')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    {t.today}
                  </button>
                  <button
                    onClick={() => handleNavigate('/owner/calendar')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? 'Calendar' : 'Calendario'}
                  </button>
                  <button
                    onClick={() => handleNavigate('/owner/appointments')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? 'Appointments' : 'Citas'}
                  </button>

                  {ownerMenuSections.map((section) => section.items.length > 0 && (
                    <div key={section.label}>
                      <button
                        onClick={() => setActiveSection(activeSection === section.label ? null : section.label)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          color: 'white',
                          background: 'none',
                          border: 'none',
                          padding: '1rem',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        {section.label}
                        <span style={{ fontSize: '12px', transform: activeSection === section.label ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                      </button>
                      {activeSection === section.label && (
                        <div style={{ backgroundColor: '#1a1a1a' }}>
                          {section.items.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => handleNavigate(item.path)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                color: 'rgba(255,255,255,0.9)',
                                padding: '0.75rem 1rem 0.75rem 2rem',
                                fontSize: '14px',
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => handleNavigate('/owner/account')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      marginTop: '1rem',
                    }}
                  >
                    {language === 'en' ? 'My Account' : 'Mi Cuenta'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigate('/barber/today')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    {t.today}
                  </button>
                  <button
                    onClick={() => handleNavigate('/barber/calendar')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? 'My Calendar' : 'Mi Calendario'}
                  </button>
                  {userData.can_view_own_stats && (
                    <button
                      onClick={() => handleNavigate('/barber/stats')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        color: 'white',
                        padding: '1rem',
                        fontSize: '16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? 'My Earnings' : 'Mis Ganancias'}
                    </button>
                  )}

                  <button
                    onClick={() => handleNavigate('/barber/account')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      color: 'white',
                      padding: '1rem',
                      fontSize: '16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      marginTop: '1rem',
                    }}
                  >
                    {language === 'en' ? 'My Account' : 'Mi Cuenta'}
                  </button>
                </>
              )}

              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginTop: 'auto',
                }}
              >
                {t.logout}
              </button>
            </nav>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
