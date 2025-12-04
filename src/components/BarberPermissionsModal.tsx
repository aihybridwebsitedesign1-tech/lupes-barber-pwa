import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type BarberPermissionsModalProps = {
  barberId: string;
  onClose: () => void;
  onSave: () => void;
};

export default function BarberPermissionsModal({
  barberId,
  onClose,
  onSave,
}: BarberPermissionsModalProps) {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es'>('en');
  const [active, setActive] = useState(true);
  const [canViewOwnStats, setCanViewOwnStats] = useState(false);
  const [canViewShopReports, setCanViewShopReports] = useState(false);
  const [canManageServices, setCanManageServices] = useState(false);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [canManageAppointments, setCanManageAppointments] = useState(false);
  const [canManageClients, setCanManageClients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBarberData();
  }, [barberId]);

  const loadBarberData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', barberId)
        .single();

      if (error) throw error;

      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setPreferredLanguage(data.language || 'en');
      setActive(data.active ?? true);
      setCanViewOwnStats(data.can_view_own_stats ?? false);
      setCanViewShopReports(data.can_view_shop_reports ?? false);
      setCanManageServices(data.can_manage_services ?? false);
      setCanManageProducts(data.can_manage_products ?? false);
      setCanManageAppointments(data.can_manage_appointments ?? false);
      setCanManageClients(data.can_manage_clients ?? false);
    } catch (err: any) {
      console.error('Error loading barber data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (userData?.role !== 'OWNER') {
      setError(language === 'en' ? 'Only owners can modify permissions' : 'Solo los propietarios pueden modificar permisos');
      return;
    }

    setSaving(true);
    setError('');

    if (!name.trim() || !email.trim()) {
      setError(language === 'en' ? 'Name and email are required' : 'Nombre y correo electrónico son requeridos');
      setSaving(false);
      return;
    }

    try {
      console.log('Saving barber permissions:', {
        barberId,
        active,
        name: name.trim(),
        email: email.trim(),
        language: preferredLanguage,
      });

      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          language: preferredLanguage,
          active,
          can_view_own_stats: canViewOwnStats,
          can_view_shop_reports: canViewShopReports,
          can_manage_services: canManageServices,
          can_manage_products: canManageProducts,
          can_manage_appointments: canManageAppointments,
          can_manage_clients: canManageClients,
        })
        .eq('id', barberId)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Update successful, data returned:', updateData);

      alert(
        language === 'en'
          ? 'Permissions saved successfully!'
          : '¡Permisos guardados exitosamente!'
      );

      onSave();
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      const errorMessage = err.message || (language === 'en' ? 'Failed to save permissions' : 'Error al guardar permisos');
      setError(errorMessage);
      alert(
        language === 'en'
          ? `Error saving permissions: ${errorMessage}`
          : `Error al guardar permisos: ${errorMessage}`
      );
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
          <p>{language === 'en' ? 'Only owners can manage permissions' : 'Solo los propietarios pueden gestionar permisos'}</p>
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
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {language === 'en' ? 'Manage Permissions' : 'Gestionar Permisos'}
        </h2>

        {loading ? (
          <p>{language === 'en' ? 'Loading...' : 'Cargando...'}</p>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                {language === 'en' ? 'Barber Information' : 'Información del Barbero'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Name' : 'Nombre'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    {language === 'en' ? 'Email' : 'Correo Electrónico'}
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
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
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
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666', paddingLeft: '0.75rem' }}>
                {language === 'en'
                  ? 'Inactive users cannot log in but their data is preserved'
                  : 'Los usuarios inactivos no pueden iniciar sesión pero sus datos se conservan'}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Permissions' : 'Permisos'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={canManageAppointments}
                    onChange={(e) => setCanManageAppointments(e.target.checked)}
                    style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{language === 'en' ? 'Can manage appointments (edit/delete any)' : 'Puede gestionar citas (editar/eliminar cualquiera)'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={canManageClients}
                    onChange={(e) => setCanManageClients(e.target.checked)}
                    style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{language === 'en' ? 'Can manage clients (add/edit/delete)' : 'Puede gestionar clientes (agregar/editar/eliminar)'}</span>
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
                  marginBottom: '1rem',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
                {saving ? (language === 'en' ? 'Saving...' : 'Guardando...') : language === 'en' ? 'Save' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
