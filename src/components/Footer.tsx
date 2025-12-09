import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { language } = useLanguage();

  return (
    <footer style={{ backgroundColor: '#000', color: 'white', padding: '2rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/terms"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
          </Link>
          <Link
            to="/privacy"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
          </Link>
        </div>
        <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
          &copy; {new Date().getFullYear()} Lupe's Barber Shop. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
        </p>
      </div>
    </footer>
  );
}
