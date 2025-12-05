import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

export default function OwnerSmsSettings() {
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
            {language === 'en' ? 'SMS Templates & Automations' : 'Plantillas y Automatizaciones de SMS'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Configure SMS templates, automated messages, and notification settings.'
              : 'Configura plantillas de SMS, mensajes automatizados y configuraciones de notificación.'}
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
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💬</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>
            {language === 'en' ? 'Coming Soon' : 'Próximamente'}
          </h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {language === 'en'
              ? 'SMS automation will include templates for appointment confirmations, reminders, review requests, and marketing campaigns.'
              : 'La automatización de SMS incluirá plantillas para confirmaciones de citas, recordatorios, solicitudes de reseñas y campañas de marketing.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
            {language === 'en'
              ? 'TODO: Build template editor, scheduling UI, automated triggers (24h/2h before appointment), and delivery tracking.'
              : 'TODO: Construir editor de plantillas, interfaz de programación, disparadores automáticos (24h/2h antes de cita) y seguimiento de entrega.'}
          </p>
        </div>
      </main>
    </div>
  );
}
