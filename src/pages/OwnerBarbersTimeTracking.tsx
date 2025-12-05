import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

export default function OwnerBarbersTimeTracking() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
  }, [userData, navigate]);

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Barber Time Tracking' : 'Seguimiento de Tiempo de Barberos'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Track barber work hours, breaks, and time-off requests.'
              : 'Rastrea horas de trabajo, descansos y solicitudes de tiempo libre de barberos.'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '3rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🕐</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>
            {language === 'en' ? 'Coming Soon' : 'Próximamente'}
          </h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {language === 'en'
              ? 'Time tracking features will include clock in/out, break tracking, and time-off management.'
              : 'Las funciones de seguimiento de tiempo incluirán registro de entrada/salida, seguimiento de descansos y gestión de tiempo libre.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
            {language === 'en'
              ? 'TODO: Build clock-in/out UI, break tracking, time-off calendar, and approval workflow.'
              : 'TODO: Construir interfaz de registro, seguimiento de descansos, calendario de tiempo libre y flujo de aprobación.'}
          </p>
        </div>
      </main>
    </div>
  );
}
