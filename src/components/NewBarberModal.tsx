import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type NewBarberModalProps = {
  onClose: () => void;
  onSave: () => void;
};

export default function NewBarberModal({ onClose, onSave }: NewBarberModalProps) {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es'>('en');
  const [active, setActive] = useState(true);
  const [canViewOwnStats, setCanViewOwnStats] = useState(true);
  const [canViewShopReports, setCanViewShopReports] = useState(false);
  const [canManageServices, setCanManageServices] = useState(false);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (userData?.role !== 'OWNER') {
      setError(language === 'en' ? 'Only owners can create barbers' : 'Solo los propietarios pueden crear barberos');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError(language === 'en' ? 'First name, last name, and email are required' : 'Nombre, apellido y correo electrónico son requeridos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(language === 'en' ? 'Please enter a valid email address' : 'Por favor ingresa un correo electrónico válido');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: Math.random().toString(36).slice(-12) + 'Aa1!',
        options: {
          data: {
            name: `${firstName.trim()} ${lastName.trim()}`,
            role: 'BARBER',
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: email.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim() || null,
          role: 'BARBER',
          active,
          language: preferredLanguage,
          can_view_own_stats: canViewOwnStats,
          can_view_shop_reports: canViewShopReports,
          can_manage_services: canManageServices,
          can_manage_products: canManageProducts,
          can_manage_appointments: false,
          can_manage_clients: false,
        });

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      console.error('Error creating barber:', err);
      setError(err.message || (language === 'en' ? 'Failed to create barber' : 'Error al crear barbero'));
    } finally {
      setSaving(false);
    }
  };

  if (!userData || userData.role !== 'OWNER') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p>{language === 'en' ? 'Only owners can create barbers' : 'Solo los propietarios pueden crear barberos'}</p>
          <button
            onClick={onClose}
            style={{
              marginTop: '1rem',
              padding: '10px 24px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Close' : 'Cerrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'New Barber' : 'Nuevo Barbero'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'First Name' : 'Nombre'} <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Last Name' : 'Apellido'} <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Email' : 'Correo Electrónico'} <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Phone' : 'Teléfono'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Preferred Language' : 'Idioma Preferido'}
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'es')}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '0.75rem',
                backgroundColor: active ? '#e8f5e9' : '#ffebee',
                borderRadius: '6px',
                border: `2px solid ${active ? '#4caf50' : '#f44336'}`,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', fontSize: '16px' }}>
                {language === 'en' ? 'Active (can log in)' : 'Activo (puede iniciar sesión)'}
              </span>
            </label>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>
              {language === 'en' ? 'Initial Permissions' : 'Permisos Iniciales'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canViewOwnStats}
                  onChange={(e) => setCanViewOwnStats(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{language === 'en' ? 'Can view own stats' : 'Puede ver sus propias estadísticas'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canViewShopReports}
                  onChange={(e) => setCanViewShopReports(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{language === 'en' ? 'Can view shop-wide reports' : 'Puede ver reportes de toda la tienda'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canManageServices}
                  onChange={(e) => setCanManageServices(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{language === 'en' ? 'Can manage services' : 'Puede gestionar servicios'}</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canManageProducts}
                  onChange={(e) => setCanManageProducts(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{language === 'en' ? 'Can manage products' : 'Puede gestionar productos'}</span>
              </label>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 24px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                backgroundColor: saving ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {saving
                ? language === 'en'
                  ? 'Creating...'
                  : 'Creando...'
                : language === 'en'
                ? 'Create Barber'
                : 'Crear Barbero'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
