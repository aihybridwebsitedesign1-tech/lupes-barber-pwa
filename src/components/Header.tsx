import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

type DropdownItem = {
  label: string;
  path: string;
  condition?: boolean;
};

type DropdownMenu = {
  label: string;
  items: DropdownItem[];
};

export default function Header() {
  const { userData, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeDesktopDropdown, setActiveDesktopDropdown] = useState<string | null>(null);
  const [activeMobileDropdown, setActiveMobileDropdown] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1100);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isOwner = userData?.role === 'OWNER';

  const clientsMenu: DropdownMenu = {
    label: language === 'en' ? 'Clients' : 'Clientes',
    items: [
      { label: language === 'en' ? 'Clients List' : 'Lista de Clientes', path: '/owner/clients' },
      { label: language === 'en' ? 'Retention & Acquisition' : 'Retención y Adquisición', path: '/owner/clients-report' },
    ],
  };

  const barbersMenu: DropdownMenu = {
    label: language === 'en' ? 'Barbers' : 'Barberos',
    items: [
      { label: language === 'en' ? 'Barbers List' : 'Lista de Barberos', path: '/owner/barbers' },
      { label: language === 'en' ? 'Time Tracking' : 'Seguimiento de Tiempo', path: '/owner/barbers-time-tracking' },
    ],
  };

  const analyticsMenu: DropdownMenu = {
    label: language === 'en' ? 'Analytics' : 'Análisis',
    items: [
      { label: language === 'en' ? 'Overview Reports' : 'Reportes Generales', path: '/owner/reports', condition: userData?.role === 'OWNER' || userData?.can_view_shop_reports },
      { label: language === 'en' ? 'Payouts (Commissions)' : 'Pagos (Comisiones)', path: '/owner/payouts', condition: userData?.role === 'OWNER' },
    ].filter(item => item.condition !== false),
  };

  const inventoryMenu: DropdownMenu = {
    label: language === 'en' ? 'Inventory & Sales' : 'Inventario y Ventas',
    items: [
      { label: language === 'en' ? 'Services' : 'Servicios', path: '/owner/services', condition: userData?.role === 'OWNER' || userData?.can_manage_services },
      { label: language === 'en' ? 'Products' : 'Productos', path: '/owner/products', condition: userData?.role === 'OWNER' || userData?.can_manage_products },
      { label: language === 'en' ? 'Inventory Management' : 'Gestión de Inventario', path: '/owner/inventory', condition: userData?.role === 'OWNER' },
    ].filter(item => item.condition !== false),
  };

  const messagesMenu: DropdownMenu = {
    label: language === 'en' ? 'Messages' : 'Mensajes',
    items: [
      { label: language === 'en' ? 'SMS Campaigns (Engage)' : 'Campañas SMS (Engage)', path: '/owner/engage' },
      { label: language === 'en' ? 'Templates & Automations' : 'Plantillas y Automatizaciones', path: '/owner/sms-settings' },
    ],
  };

  const settingsMenu: DropdownMenu = {
    label: language === 'en' ? 'Settings' : 'Configuración',
    items: [
      { label: language === 'en' ? 'Shop Settings' : 'Configuración de Tienda', path: '/owner/settings' },
    ],
  };

  const renderDropdown = (menu: DropdownMenu, isDesktop: boolean) => {
    const isActive = isDesktop
      ? activeDesktopDropdown === menu.label
      : activeMobileDropdown === menu.label;

    if (isDesktop) {
      return (
        <div
          key={menu.label}
          style={{ position: 'relative' }}
          onMouseEnter={() => setActiveDesktopDropdown(menu.label)}
          onMouseLeave={() => setActiveDesktopDropdown(null)}
        >
          <button
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '0.5rem 0.75rem',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {menu.label}
            <span style={{ fontSize: '10px' }}>▾</span>
          </button>
          {isActive && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#1a1a1a',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                borderRadius: '4px',
                minWidth: '200px',
                zIndex: 1000,
                marginTop: '0.25rem',
              }}
            >
              {menu.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'block',
                    color: 'white',
                    textDecoration: 'none',
                    padding: '0.75rem 1rem',
                    fontSize: '14px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div key={menu.label}>
          <button
            onClick={() => setActiveMobileDropdown(isActive ? null : menu.label)}
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
            {menu.label}
            <span style={{ fontSize: '12px', transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </button>
          {isActive && (
            <div style={{ backgroundColor: '#0a0a0a' }}>
              {menu.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setActiveMobileDropdown(null);
                  }}
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.8)',
                    textDecoration: 'none',
                    padding: '0.75rem 1rem 0.75rem 2rem',
                    fontSize: '14px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <>
      <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', gap: '1rem', width: '100%' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Lupe's Barber</h1>

          {!isMobile && userData && (
            <>
              <nav style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: 0, alignItems: 'center' }}>
                {isOwner ? (
                  <>
                    <Link
                      to="/owner/today"
                      style={{
                        color: 'white',
                        textDecoration: 'none',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                      }}
                    >
                      {t.today}
                    </Link>
                    <Link
                      to="/owner/appointments"
                      style={{
                        color: 'white',
                        textDecoration: 'none',
                        padding: '0.5rem 0.75rem',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                      }}
                    >
                      {language === 'en' ? 'Calendar' : 'Calendario'}
                    </Link>
                    {renderDropdown(clientsMenu, true)}
                    {renderDropdown(barbersMenu, true)}
                    {analyticsMenu.items.length > 0 && renderDropdown(analyticsMenu, true)}
                    {inventoryMenu.items.length > 0 && renderDropdown(inventoryMenu, true)}
                    {renderDropdown(messagesMenu, true)}
                    <div style={{ flex: 1 }} />
                    {renderDropdown(settingsMenu, true)}
                  </>
                ) : (
                  <>
                    <Link
                      to="/barber/today"
                      style={{
                        color: 'white',
                        textDecoration: 'none',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                      }}
                    >
                      {t.today}
                    </Link>
                    {userData.can_view_own_stats && (
                      <Link
                        to="/barber/stats"
                        style={{
                          color: 'white',
                          textDecoration: 'none',
                          padding: '0.5rem 0.75rem',
                          whiteSpace: 'nowrap',
                          fontSize: '14px',
                        }}
                      >
                        {language === 'en' ? 'My Stats' : 'Mis Estadísticas'}
                      </Link>
                    )}
                  </>
                )}
              </nav>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
                  onClick={handleSignOut}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#fff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.logout}
                </button>
              </div>
            </>
          )}

          {isMobile && userData && (
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

      {isMobile && isMobileMenuOpen && userData && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: '#000',
            color: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxHeight: 'calc(100vh - 56px)',
            overflowY: 'auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {isOwner ? (
              <>
                <Link
                  to="/owner/today"
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
                  {t.today}
                </Link>
                <Link
                  to="/owner/appointments"
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
                  {language === 'en' ? 'Calendar' : 'Calendario'}
                </Link>
                {renderDropdown(clientsMenu, false)}
                {renderDropdown(barbersMenu, false)}
                {analyticsMenu.items.length > 0 && renderDropdown(analyticsMenu, false)}
                {inventoryMenu.items.length > 0 && renderDropdown(inventoryMenu, false)}
                {renderDropdown(messagesMenu, false)}
                {renderDropdown(settingsMenu, false)}
              </>
            ) : (
              <>
                <Link
                  to="/barber/today"
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
                  {t.today}
                </Link>
                {userData.can_view_own_stats && (
                  <Link
                    to="/barber/stats"
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
                    {language === 'en' ? 'My Stats' : 'Mis Estadísticas'}
                  </Link>
                )}
              </>
            )}

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
                }}
              >
                ES
              </button>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleSignOut();
              }}
              style={{
                padding: '1rem',
                backgroundColor: '#fff',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {t.logout}
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
