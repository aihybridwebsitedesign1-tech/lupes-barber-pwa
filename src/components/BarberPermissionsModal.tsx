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
  const [canSendSms, setCanSendSms] = useState(false);
  const [canManageTransformationPhotos, setCanManageTransformationPhotos] = useState(true);
  const [commissionRateOverride, setCommissionRateOverride] = useState<string>('');
  const [useDefaultBookingRules, setUseDefaultBookingRules] = useState(true);
  const [minHoursBeforeBooking, setMinHoursBeforeBooking] = useState<string>('');
  const [minHoursBeforeCancellation, setMinHoursBeforeCancellation] = useState<string>('');
  const [bookingIntervalMinutes, setBookingIntervalMinutes] = useState<string>('15');
  const [showOnClientSite, setShowOnClientSite] = useState(false);
  const [acceptOnlineBookings, setAcceptOnlineBookings] = useState(true);
  const [publicDisplayName, setPublicDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBarberData();
  }, [barberId]);

  const loadBarberData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, language, role, active,
          can_view_own_stats, can_view_shop_reports,
          can_manage_services, can_manage_products,
          can_manage_appointments, can_manage_clients, can_send_sms,
          can_manage_transformation_photos,
          commission_rate_override,
          min_hours_before_booking_override,
          min_hours_before_cancellation_override,
          booking_interval_minutes_override,
          show_on_client_site, accept_online_bookings, public_display_name, bio, specialties, photo_url,
          instagram_url, tiktok_url, facebook_url, website_url,
          created_at, updated_at
        `)
        .eq('id', barberId)
        .maybeSingle();

      if (error) {
        console.error('Error loading barber data:', error);
        throw error;
      }
      if (!data) {
        console.error('Barber not found');
        throw new Error('Barber not found');
      }

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
      setCanSendSms(data.can_send_sms ?? false);
      setCanManageTransformationPhotos(data.can_manage_transformation_photos ?? true);

      setCommissionRateOverride(data.commission_rate_override ? (data.commission_rate_override * 100).toString() : '');

      const hasBookingOverrides =
        data.min_hours_before_booking_override !== null ||
        data.min_hours_before_cancellation_override !== null ||
        data.booking_interval_minutes_override !== null;

      setUseDefaultBookingRules(!hasBookingOverrides);
      setMinHoursBeforeBooking(data.min_hours_before_booking_override?.toString() || '');
      setMinHoursBeforeCancellation(data.min_hours_before_cancellation_override?.toString() || '');
      setBookingIntervalMinutes(data.booking_interval_minutes_override?.toString() || '15');

      setShowOnClientSite(data.show_on_client_site ?? false);
      setAcceptOnlineBookings(data.accept_online_bookings ?? true);
      setPublicDisplayName(data.public_display_name || '');
      setBio(data.bio || '');
      setSpecialties(data.specialties || '');
      setPhotoUrl(data.photo_url || '');
      setInstagramUrl(data.instagram_url || '');
      setTiktokUrl(data.tiktok_url || '');
      setFacebookUrl(data.facebook_url || '');
      setWebsiteUrl(data.website_url || '');
    } catch (err: any) {
      console.error('Error loading barber data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (userData?.role !== 'OWNER') {
      console.error('Permission denied: user is not OWNER');
      const errorMsg = language === 'en' ? 'Only owners can modify permissions' : 'Solo los propietarios pueden modificar permisos';
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setSaving(true);
    setError('');

    if (!name.trim() || !email.trim()) {
      const errorMsg = language === 'en' ? 'Name and email are required' : 'Nombre y correo electrónico son requeridos';
      setError(errorMsg);
      setSaving(false);
      alert(errorMsg);
      return;
    }

    try {
      const commissionRate = commissionRateOverride.trim()
        ? parseFloat(commissionRateOverride) / 100
        : null;

      const minBookAhead = !useDefaultBookingRules && minHoursBeforeBooking.trim()
        ? parseInt(minHoursBeforeBooking, 10)
        : null;

      const minCancelAhead = !useDefaultBookingRules && minHoursBeforeCancellation.trim()
        ? parseInt(minHoursBeforeCancellation, 10)
        : null;

      const intervalMins = !useDefaultBookingRules && bookingIntervalMinutes.trim()
        ? parseInt(bookingIntervalMinutes, 10)
        : null;

      const updatePayload = {
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
        can_send_sms: canSendSms,
        can_manage_transformation_photos: canManageTransformationPhotos,
        commission_rate_override: commissionRate,
        min_hours_before_booking_override: minBookAhead,
        min_hours_before_cancellation_override: minCancelAhead,
        booking_interval_minutes_override: intervalMins,
        show_on_client_site: showOnClientSite,
        accept_online_bookings: acceptOnlineBookings,
        public_display_name: publicDisplayName?.trim() || null,
        bio: bio?.trim() || null,
        specialties: specialties?.trim() || null,
        photo_url: photoUrl?.trim() || null,
        instagram_url: instagramUrl?.trim() || null,
        tiktok_url: tiktokUrl?.trim() || null,
        facebook_url: facebookUrl?.trim() || null,
        website_url: websiteUrl?.trim() || null,
      };

      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', barberId)
        .select(`
          id, name, email, phone, language, active,
          can_view_own_stats, can_view_shop_reports,
          can_manage_services, can_manage_products,
          can_manage_appointments, can_manage_clients, can_send_sms,
          commission_rate_override,
          show_on_client_site, public_display_name, bio, specialties, photo_url,
          instagram_url, tiktok_url, facebook_url, website_url
        `);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('Update returned no rows - likely blocked by RLS or wrong ID');
        throw new Error('Update failed: No rows were updated. You may not have permission to modify this barber.');
      }

      await loadBarberData();

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

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={canSendSms}
                    onChange={(e) => setCanSendSms(e.target.checked)}
                    style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{language === 'en' ? 'Can send SMS messages (Engage)' : 'Puede enviar mensajes SMS (Engage)'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={canManageTransformationPhotos}
                    onChange={(e) => setCanManageTransformationPhotos(e.target.checked)}
                    style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{language === 'en' ? 'Can manage transformation photos (add/delete)' : 'Puede gestionar fotos de transformación (agregar/eliminar)'}</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Commission Rate' : 'Tasa de Comisión'}
              </h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                  {language === 'en' ? 'Commission rate override (%)' : 'Tasa de comisión personalizada (%)'}
                </label>
                <input
                  type="number"
                  value={commissionRateOverride}
                  onChange={(e) => setCommissionRateOverride(e.target.value)}
                  placeholder={language === 'en' ? 'Leave empty to use shop default' : 'Dejar vacío para usar predeterminado'}
                  min="0"
                  max="100"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Leave empty to use shop default rate. For example, enter "50" for 50%.'
                  : 'Dejar vacío para usar la tasa predeterminada. Por ejemplo, ingresa "50" para 50%.'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Booking Rules for this Barber' : 'Reglas de Reserva para este Barbero'}
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={useDefaultBookingRules}
                  onChange={(e) => setUseDefaultBookingRules(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{language === 'en' ? 'Use shop default rules' : 'Usar reglas predeterminadas'}</span>
              </label>

              {!useDefaultBookingRules && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                      {language === 'en' ? 'Minimum hours before booking' : 'Horas mínimas antes de reservar'}
                    </label>
                    <input
                      type="number"
                      value={minHoursBeforeBooking}
                      onChange={(e) => setMinHoursBeforeBooking(e.target.value)}
                      min="0"
                      step="1"
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                      {language === 'en' ? 'Minimum hours before cancellation' : 'Horas mínimas antes de cancelar'}
                    </label>
                    <input
                      type="number"
                      value={minHoursBeforeCancellation}
                      onChange={(e) => setMinHoursBeforeCancellation(e.target.value)}
                      min="0"
                      step="1"
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                      {language === 'en' ? 'Booking interval' : 'Intervalo de reserva'}
                    </label>
                    <select
                      value={bookingIntervalMinutes}
                      onChange={(e) => setBookingIntervalMinutes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="15">15 {language === 'en' ? 'minutes' : 'minutos'}</option>
                      <option value="30">30 {language === 'en' ? 'minutes' : 'minutos'}</option>
                      <option value="60">60 {language === 'en' ? 'minutes' : 'minutos'}</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                {language === 'en'
                  ? 'Custom rules override shop defaults for this barber only.'
                  : 'Las reglas personalizadas reemplazan los valores predeterminados solo para este barbero.'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #eee' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.75rem' }}>
                {language === 'en' ? 'Public Profile' : 'Perfil Público'}
              </h3>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  backgroundColor: showOnClientSite ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '6px',
                  border: `2px solid ${showOnClientSite ? '#2196f3' : '#ddd'}`,
                  marginBottom: '1rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={showOnClientSite}
                  onChange={(e) => setShowOnClientSite(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500', fontSize: '16px' }}>
                  {language === 'en' ? 'Show on client website' : 'Mostrar en sitio web de clientes'}
                </span>
              </label>
              <div style={{ marginBottom: '1rem', fontSize: '12px', color: '#666', paddingLeft: '0.75rem' }}>
                {language === 'en'
                  ? 'When enabled, this barber will appear on the public "Our Barbers" page with their profile information.'
                  : 'Cuando está habilitado, este barbero aparecerá en la página pública "Nuestros Barberos" con su información de perfil.'}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  backgroundColor: acceptOnlineBookings ? '#e8f5e9' : '#f5f5f5',
                  borderRadius: '6px',
                  border: `2px solid ${acceptOnlineBookings ? '#4caf50' : '#ddd'}`,
                  marginBottom: '1rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptOnlineBookings}
                  onChange={(e) => setAcceptOnlineBookings(e.target.checked)}
                  style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500', fontSize: '16px' }}>
                  {language === 'en' ? 'Available for online booking' : 'Disponible para reservas en línea'}
                </span>
              </label>
              <div style={{ marginBottom: '1.5rem', fontSize: '12px', color: '#666', paddingLeft: '0.75rem' }}>
                {language === 'en'
                  ? "If unchecked, this barber won't appear in the public booking flow, but their personal booking link will still work."
                  : 'Si se desmarca, este barbero no aparecerá en el flujo de reserva público, pero su enlace de reserva personal seguirá funcionando.'}
              </div>

              {showOnClientSite && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Public display name (optional)' : 'Nombre público (opcional)'}
                    </label>
                    <input
                      type="text"
                      value={publicDisplayName}
                      onChange={(e) => setPublicDisplayName(e.target.value)}
                      placeholder={language === 'en' ? 'Leave empty to use real name' : 'Dejar vacío para usar nombre real'}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                      {language === 'en'
                        ? 'Custom name to display publicly. If empty, uses their real name.'
                        : 'Nombre personalizado para mostrar públicamente. Si está vacío, usa su nombre real.'}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Specialties' : 'Especialidades'}
                    </label>
                    <input
                      type="text"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      placeholder={language === 'en' ? 'e.g., Fades, beard trims, kids cuts' : 'ej., Degradados, recorte de barba, cortes para niños'}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                      {language === 'en'
                        ? 'List of services or styles this barber specializes in.'
                        : 'Lista de servicios o estilos en los que este barbero se especializa.'}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Bio (optional)' : 'Biografía (opcional)'}
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={language === 'en' ? 'Brief description or bio' : 'Breve descripción o biografía'}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Photo URL (optional)' : 'URL de Foto (opcional)'}
                    </label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder={language === 'en' ? 'https://...' : 'https://...'}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                      {language === 'en'
                        ? 'URL to profile photo. If empty, shows initials.'
                        : 'URL a foto de perfil. Si está vacío, muestra iniciales.'}
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.75rem' }}>
                      {language === 'en' ? 'Social Media Links (optional)' : 'Redes Sociales (opcional)'}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: '500' }}>
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/username"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: '500' }}>
                          TikTok
                        </label>
                        <input
                          type="text"
                          value={tiktokUrl}
                          onChange={(e) => setTiktokUrl(e.target.value)}
                          placeholder="https://tiktok.com/@username"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: '500' }}>
                          Facebook
                        </label>
                        <input
                          type="text"
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                          placeholder="https://facebook.com/username"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: '500' }}>
                          {language === 'en' ? 'Website' : 'Sitio Web'}
                        </label>
                        <input
                          type="text"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://..."
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
