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
    <header style={{ backgroundColor: '#000', color: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Lupe's Barber</h1>

          {userData && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              {isOwner ? (
                <>
                  <Link to="/owner/today" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    {t.today}
                  </Link>
                  <Link to="/owner/appointments" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {t.appointments}
                  </Link>
                  <Link to="/owner/clients" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {t.clients}
                  </Link>
                  <Link to="/owner/barbers" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {t.barbers}
                  </Link>
                  <Link to="/owner/services" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {t.services}
                  </Link>
                  <Link to="/owner/products" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {language === 'en' ? 'Products' : 'Productos'}
                  </Link>
                  <Link to="/owner/settings" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem' }}>
                    {language === 'en' ? 'Settings' : 'Configuración'}
                  </Link>
                </>
              ) : (
                <Link to="/barber/today" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  {t.today}
                </Link>
              )}
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '0.25rem 0.75rem',
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
                padding: '0.25rem 0.75rem',
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

          {userData && (
            <>
              <span style={{ fontSize: '14px' }}>{userData.name}</span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
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
