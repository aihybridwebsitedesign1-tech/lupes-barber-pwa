import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Header() {
  const { userData, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isOwner = userData?.role === 'OWNER';

  return (
    <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', gap: '1rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: '1' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Lupe's Barber</h1>

          {userData && (
            <nav style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', minWidth: 0, flex: '1', paddingBottom: '0.25rem' }}>
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
          )}
        </div>

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

          {userData && (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
