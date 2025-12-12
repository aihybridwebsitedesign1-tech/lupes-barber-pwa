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
  const [tempPassword, setTempPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError(language === 'en' ? 'You must be logged in to create barbers' : 'Debes iniciar sesión para crear barberos');
        return;
      }

      const payload = {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        language: preferredLanguage,
        active,
        canViewOwnStats,
        canViewShopReports,
        canManageServices,
        canManageProducts,
      };

      const { data, error } = await supabase.functions.invoke('create-barber', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating barber:', error);
        setError(error.message || (language === 'en' ? 'Failed to create barber' : 'Error al crear barbero'));
        return;
      }

      console.log('Barber created successfully!');
      console.log('Temporary Password:', data.temporaryPassword);

      // Store password and show success message
      setTempPassword(data.temporaryPassword);
      setShowSuccess(true);

      // Show toast notification
      showToast(data.temporaryPassword);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || (language === 'en' ? 'Failed to create barber' : 'Error al crear barbero'));
    } finally {
      setSaving(false);
    }
  };

  const showToast = (password: string) => {
    const message = language === 'en'
      ? `Temporary password: ${password}`
      : `Contraseña temporal: ${password}`;

    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4caf50;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      word-break: break-all;
    `;
    document.body.appendChild(toast);

    // Remove after 8 seconds
    setTimeout(() => {
      toast.remove();
    }, 8000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDone = () => {
    onSave();
    onClose();
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

          {showSuccess && tempPassword && (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '8px',
                marginTop: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <svg
                  style={{ width: '24px', height: '24px', marginRight: '0.5rem', color: '#28a745' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#155724', margin: 0 }}>
                  {language === 'en' ? 'Barber Created Successfully!' : 'Barbero Creado Exitosamente!'}
                </h3>
              </div>

              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb',
                  marginBottom: '1rem',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#155724', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Temporary Password:' : 'Contraseña Temporal:'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#000',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {tempPassword}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: copied ? '#28a745' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied
                      ? language === 'en'
                        ? 'Copied!'
                        : 'Copiado!'
                      : language === 'en'
                      ? 'Copy'
                      : 'Copiar'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#856404', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Important Instructions:' : 'Instrucciones Importantes:'}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '14px', color: '#856404' }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>
                      {language === 'en'
                        ? 'Please save and write down this temporary password. It will not be shown again.'
                        : 'Por favor guarde y anote esta contraseña temporal. No se mostrará nuevamente.'}
                    </strong>
                  </li>
                  <li>
                    {language === 'en'
                      ? 'The barber should log in immediately and change their password.'
                      : 'El barbero debe iniciar sesión inmediatamente y cambiar su contraseña.'}
                  </li>
                </ul>
              </div>

              <button
                onClick={handleDone}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {language === 'en' ? 'Done' : 'Hecho'}
              </button>
            </div>
          )}

          {!showSuccess && (
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
          )}
        </div>
      </div>
    </div>
  );
}
