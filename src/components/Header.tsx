import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Header() {
  const { userData, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
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

  return (
    <>
      <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', gap: '1rem', width: '100%' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Lupe's Barber</h1>

          {/* Desktop Navigation */}
          {!isMobile && userData && (
            <>
              <nav style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: 0 }}>
                {isOwner ? (
                  <>
                    <Link to="/owner/today" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {t.today}
                    </Link>
                    <Link to="/owner/appointments" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {t.appointments}
                    </Link>
                    {(userData.role === 'OWNER' || userData.can_view_shop_reports) && (
                      <Link to="/owner/reports" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {language === 'en' ? 'Reports' : 'Reportes'}
                      </Link>
                    )}
                    {userData.role === 'OWNER' && (
                      <Link to="/owner/payouts" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {language === 'en' ? 'Payouts' : 'Pagos'}
                      </Link>
                    )}
                    {userData.role === 'OWNER' && (
                      <Link to="/owner/clients-report" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {language === 'en' ? 'Clients Stats' : 'Estadísticas'}
                      </Link>
                    )}
                    <Link to="/owner/clients" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {t.clients}
                    </Link>
                    <Link to="/owner/barbers" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {t.barbers}
                    </Link>
                    {(userData.role === 'OWNER' || userData.can_manage_services) && (
                      <Link to="/owner/services" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {t.services}
                      </Link>
                    )}
                    {(userData.role === 'OWNER' || userData.can_manage_products) && (
                      <Link to="/owner/products" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                        {language === 'en' ? 'Products' : 'Productos'}
                      </Link>
                    )}
                    <Link to="/owner/settings" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {language === 'en' ? 'Settings' : 'Configuración'}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/barber/today" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontSize: '14px' }}>
                      {t.today}
                    </Link>
                    {userData.can_view_own_stats && (
                      <Link to="/barber/stats" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '14px' }}>
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
                      minWidth: '32px'
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
                      minWidth: '32px'
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
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.logout}
                </button>
              </div>
            </>
          )}

          {/* Mobile Hamburger Button */}
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
                justifyContent: 'center'
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

      {/* Mobile Menu Dropdown */}
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
            boxSizing: 'border-box'
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
                    display: 'block'
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
                    display: 'block'
                  }}
                >
                  {t.appointments}
                </Link>
                {(userData.role === 'OWNER' || userData.can_view_shop_reports) && (
                  <Link
                    to="/owner/reports"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '16px',
                      display: 'block'
                    }}
                  >
                    {language === 'en' ? 'Reports' : 'Reportes'}
                  </Link>
                )}
                {userData.role === 'OWNER' && (
                  <Link
                    to="/owner/payouts"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '16px',
                      display: 'block'
                    }}
                  >
                    {language === 'en' ? 'Payouts' : 'Pagos'}
                  </Link>
                )}
                {userData.role === 'OWNER' && (
                  <Link
                    to="/owner/clients-report"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '16px',
                      display: 'block'
                    }}
                  >
                    {language === 'en' ? 'Clients Stats' : 'Estadísticas'}
                  </Link>
                )}
                <Link
                  to="/owner/clients"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    display: 'block'
                  }}
                >
                  {t.clients}
                </Link>
                <Link
                  to="/owner/barbers"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    display: 'block'
                  }}
                >
                  {t.barbers}
                </Link>
                {(userData.role === 'OWNER' || userData.can_manage_services) && (
                  <Link
                    to="/owner/services"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '16px',
                      display: 'block'
                    }}
                  >
                    {t.services}
                  </Link>
                )}
                {(userData.role === 'OWNER' || userData.can_manage_products) && (
                  <Link
                    to="/owner/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '16px',
                      display: 'block'
                    }}
                  >
                    {language === 'en' ? 'Products' : 'Productos'}
                  </Link>
                )}
                <Link
                  to="/owner/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    display: 'block'
                  }}
                >
                  {language === 'en' ? 'Settings' : 'Configuración'}
                </Link>
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
                    display: 'block'
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
                      display: 'block'
                    }}
                  >
                    {language === 'en' ? 'My Stats' : 'Mis Estadísticas'}
                  </Link>
                )}
              </>
            )}

            {/* Language Toggle in Mobile Menu */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  fontSize: '14px'
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
                  fontSize: '14px'
                }}
              >
                ES
              </button>
            </div>

            {/* Logout Button in Mobile Menu */}
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
                width: '100%'
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
