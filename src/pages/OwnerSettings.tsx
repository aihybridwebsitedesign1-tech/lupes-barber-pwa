import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type ShopConfig = {
  id: number;
  shop_name: string;
  address: string;
  phone: string;
  shop_hours: any;
  tax_rate: number;
  card_processing_fee_rate: number;
  days_bookable_in_advance: number;
  min_book_ahead_hours: number;
  min_cancel_ahead_hours: number;
  client_booking_interval_minutes: number;
  regular_client_min_visits: number;
  lapsed_client_days: number;
};

type Tab = 'shop_info' | 'booking_rules' | 'retention' | 'commissions' | 'notifications';

export default function OwnerSettings() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('shop_info');
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [shopName, setShopName] = useState("Lupe's Barber Shop");
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [cardFeeRate, setCardFeeRate] = useState('4');
  const [shopInstagramUrl, setShopInstagramUrl] = useState('');
  const [shopFacebookUrl, setShopFacebookUrl] = useState('');
  const [shopTiktokUrl, setShopTiktokUrl] = useState('');
  const [shopWebsiteUrl, setShopWebsiteUrl] = useState('');

  const [daysBookableInAdvance, setDaysBookableInAdvance] = useState('30');
  const [minBookAheadHours, setMinBookAheadHours] = useState('2');
  const [minCancelAheadHours, setMinCancelAheadHours] = useState('24');
  const [bookingInterval, setBookingInterval] = useState('15');

  const [regularClientMinVisits, setRegularClientMinVisits] = useState('3');
  const [lapsedClientDays, setLapsedClientDays] = useState('90');

  const [defaultCommissionRate, setDefaultCommissionRate] = useState('50');
  const [reminderHoursBefore, setReminderHoursBefore] = useState('24');
  const [reminderHoursBeforeSecondary, setReminderHoursBeforeSecondary] = useState('');
  const [barbers, setBarbers] = useState<any[]>([]);

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
    loadShopConfig();
  }, [userData, navigate]);

  const loadShopConfig = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('shop_config')
        .select('*')
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setConfig(data);
        setShopName(data.shop_name || "Lupe's Barber Shop");
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setTaxRate(((data.tax_rate || 0) * 100).toFixed(2));
        setCardFeeRate(((data.card_processing_fee_rate || 0) * 100).toFixed(2));
        setDaysBookableInAdvance(String(data.days_bookable_in_advance || 30));
        setMinBookAheadHours(String(data.min_book_ahead_hours || 2));
        setMinCancelAheadHours(String(data.min_cancel_ahead_hours || 24));
        setBookingInterval(String(data.client_booking_interval_minutes || 15));
        setRegularClientMinVisits(String(data.regular_client_min_visits || 3));
        setLapsedClientDays(String(data.lapsed_client_days || 90));
        setDefaultCommissionRate(((data.default_commission_rate || 0.5) * 100).toFixed(0));
        setReminderHoursBefore(String(data.reminder_hours_before || 24));
        setReminderHoursBeforeSecondary(data.reminder_hours_before_secondary ? String(data.reminder_hours_before_secondary) : '');
        setShopInstagramUrl(data.shop_instagram_url || '');
        setShopFacebookUrl(data.shop_facebook_url || '');
        setShopTiktokUrl(data.shop_tiktok_url || '');
        setShopWebsiteUrl(data.shop_website_url || '');
      }

      const { data: barbersData, error: barbersError } = await supabase
        .from('users')
        .select('id, name, commission_rate_override')
        .eq('role', 'BARBER')
        .order('name');

      if (!barbersError && barbersData) {
        setBarbers(barbersData);
      }
    } catch (err: any) {
      console.error('Error loading shop config:', err);
      setError(language === 'en' ? 'Failed to load settings' : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopInfo = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          shop_name: shopName,
          address: address,
          phone: phone,
          tax_rate: parseFloat(taxRate) / 100,
          card_processing_fee_rate: parseFloat(cardFeeRate) / 100,
          shop_instagram_url: shopInstagramUrl.trim() || null,
          shop_facebook_url: shopFacebookUrl.trim() || null,
          shop_tiktok_url: shopTiktokUrl.trim() || null,
          shop_website_url: shopWebsiteUrl.trim() || null,
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Shop info saved successfully!' : 'Información guardada exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving shop info:', err);
      setError(language === 'en' ? 'Failed to save settings' : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBookingRules = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          days_bookable_in_advance: parseInt(daysBookableInAdvance),
          min_book_ahead_hours: parseInt(minBookAheadHours),
          min_cancel_ahead_hours: parseInt(minCancelAheadHours),
          client_booking_interval_minutes: parseInt(bookingInterval),
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Booking rules saved successfully!' : 'Reglas de reserva guardadas exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving booking rules:', err);
      setError(language === 'en' ? 'Failed to save booking rules' : 'Error al guardar reglas de reserva');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRetention = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          regular_client_min_visits: parseInt(regularClientMinVisits),
          lapsed_client_days: parseInt(lapsedClientDays),
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Retention settings saved successfully!' : 'Configuración de retención guardada exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving retention settings:', err);
      setError(language === 'en' ? 'Failed to save retention settings' : 'Error al guardar configuración de retención');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommissions = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          default_commission_rate: parseFloat(defaultCommissionRate) / 100,
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Commission settings saved successfully!' : '¡Configuración de comisiones guardada exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving commission settings:', err);
      setError(language === 'en' ? 'Failed to save commission settings' : 'Error al guardar configuración de comisiones');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const secondaryValue = reminderHoursBeforeSecondary.trim() ? parseInt(reminderHoursBeforeSecondary) : null;

      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          reminder_hours_before: parseInt(reminderHoursBefore),
          reminder_hours_before_secondary: secondaryValue,
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Notification settings saved successfully!' : '¡Configuración de notificaciones guardada exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      setError(language === 'en' ? 'Failed to save notification settings' : 'Error al guardar configuración de notificaciones');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBarberCommission = async (barberId: string, commissionRate: string) => {
    try {
      const rate = commissionRate.trim() ? parseFloat(commissionRate) / 100 : null;
      const { error } = await supabase
        .from('users')
        .update({ commission_rate_override: rate })
        .eq('id', barberId);

      if (error) throw error;
      loadShopConfig();
    } catch (err: any) {
      console.error('Error updating barber commission:', err);
      alert(language === 'en' ? 'Failed to update commission' : 'Error al actualizar comisión');
    }
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const tabs: { id: Tab; labelEn: string; labelEs: string }[] = [
    { id: 'shop_info', labelEn: 'Shop Info', labelEs: 'Info de Tienda' },
    { id: 'booking_rules', labelEn: 'Booking Rules', labelEs: 'Reglas de Reserva' },
    { id: 'retention', labelEn: 'Clients & Retention', labelEs: 'Clientes y Retención' },
    { id: 'commissions', labelEn: 'Commissions', labelEs: 'Comisiones' },
    { id: 'notifications', labelEn: 'Notifications', labelEs: 'Notificaciones' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Settings' : 'Configuración'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Configure shop settings, booking rules, and client retention thresholds.'
              : 'Configura ajustes de tienda, reglas de reserva y umbrales de retención de clientes.'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '14px',
            }}
          >
            {success}
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ borderBottom: '2px solid #e5e5e5', display: 'flex', overflowX: 'auto' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: activeTab === tab.id ? '#f9f9f9' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #000' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {language === 'en' ? tab.labelEn : tab.labelEs}
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                {language === 'en' ? 'Loading...' : 'Cargando...'}
              </div>
            ) : (
              <>
                {activeTab === 'shop_info' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1.5rem' }}>
                      {language === 'en' ? 'Shop Information' : 'Información de Tienda'}
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Shop Name' : 'Nombre de la Tienda'}
                      </label>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '500px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Name displayed to clients'
                          : 'Nombre mostrado a los clientes'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Address' : 'Dirección'}
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          maxWidth: '500px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Shop address shown on the public website'
                          : 'Dirección mostrada en el sitio web público'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Phone Number' : 'Número de Teléfono'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Contact phone displayed on the public website'
                          : 'Teléfono de contacto mostrado en el sitio web público'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Tax Rate (%)' : 'Tasa de Impuestos (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Sales tax applied to services and products'
                          : 'Impuesto aplicado a servicios y productos'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Card Processing Fee (%)' : 'Tarifa de Procesamiento (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={cardFeeRate}
                        onChange={(e) => setCardFeeRate(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Fee charged for card transactions'
                          : 'Tarifa aplicada a transacciones con tarjeta'}
                      </p>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #eee' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                        {language === 'en' ? 'Shop Social Media' : 'Redes Sociales'}
                      </h4>

                      <div style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Instagram
                          </label>
                          <input
                            type="text"
                            value={shopInstagramUrl}
                            onChange={(e) => setShopInstagramUrl(e.target.value)}
                            placeholder="https://instagram.com/shopname"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Facebook
                          </label>
                          <input
                            type="text"
                            value={shopFacebookUrl}
                            onChange={(e) => setShopFacebookUrl(e.target.value)}
                            placeholder="https://facebook.com/shopname"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem' }}>
                            TikTok
                          </label>
                          <input
                            type="text"
                            value={shopTiktokUrl}
                            onChange={(e) => setShopTiktokUrl(e.target.value)}
                            placeholder="https://tiktok.com/@shopname"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem' }}>
                            {language === 'en' ? 'Website' : 'Sitio Web'}
                          </label>
                          <input
                            type="text"
                            value={shopWebsiteUrl}
                            onChange={(e) => setShopWebsiteUrl(e.target.value)}
                            placeholder="https://yourshop.com"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveShopInfo}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#ccc' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving
                        ? language === 'en'
                          ? 'Saving...'
                          : 'Guardando...'
                        : language === 'en'
                        ? 'Save Changes'
                        : 'Guardar Cambios'}
                    </button>
                  </div>
                )}

                {activeTab === 'booking_rules' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {language === 'en' ? 'Booking Rules' : 'Reglas de Reserva'}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
                      {language === 'en'
                        ? 'These rules apply to all barbers. Barber-specific overrides may be added in a future update.'
                        : 'Estas reglas se aplican a todos los barberos. Las excepciones por barbero pueden agregarse en una actualización futura.'}
                    </p>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Days Bookable in Advance' : 'Días de Anticipación para Reservar'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={daysBookableInAdvance}
                        onChange={(e) => setDaysBookableInAdvance(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Maximum days in advance a client can book'
                          : 'Máximo de días de anticipación para reservar'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Minimum Hours Before Booking' : 'Horas Mínimas Antes de Reservar'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        value={minBookAheadHours}
                        onChange={(e) => setMinBookAheadHours(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Minimum hours in advance required to book'
                          : 'Horas mínimas de anticipación requeridas'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Minimum Hours Before Cancellation' : 'Horas Mínimas Antes de Cancelar'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        value={minCancelAheadHours}
                        onChange={(e) => setMinCancelAheadHours(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Minimum hours before appointment to allow cancellation'
                          : 'Horas mínimas antes de cita para permitir cancelación'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Booking Interval (minutes)' : 'Intervalo de Reserva (minutos)'}
                      </label>
                      <select
                        value={bookingInterval}
                        onChange={(e) => setBookingInterval(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="10">10 {language === 'en' ? 'minutes' : 'minutos'}</option>
                        <option value="15">15 {language === 'en' ? 'minutes' : 'minutos'}</option>
                        <option value="20">20 {language === 'en' ? 'minutes' : 'minutos'}</option>
                        <option value="30">30 {language === 'en' ? 'minutes' : 'minutos'}</option>
                        <option value="60">60 {language === 'en' ? 'minutes' : 'minutos'}</option>
                      </select>
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Time slot intervals for client bookings'
                          : 'Intervalos de tiempo para reservas de clientes'}
                      </p>
                    </div>

                    <button
                      onClick={handleSaveBookingRules}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#ccc' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving
                        ? language === 'en'
                          ? 'Saving...'
                          : 'Guardando...'
                        : language === 'en'
                        ? 'Save Changes'
                        : 'Guardar Cambios'}
                    </button>
                  </div>
                )}

                {activeTab === 'retention' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1.5rem' }}>
                      {language === 'en' ? 'Clients & Retention' : 'Clientes y Retención'}
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Visits to Become Regular Client' : 'Visitas para Ser Cliente Regular'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={regularClientMinVisits}
                        onChange={(e) => setRegularClientMinVisits(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Number of visits required to be considered a "regular" client'
                          : 'Número de visitas requeridas para ser considerado cliente "regular"'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Days Without Visit to Count as Lapsed' : 'Días Sin Visita para Considerarse Inactivo'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={lapsedClientDays}
                        onChange={(e) => setLapsedClientDays(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Days since last visit to consider a client as "lapsed"'
                          : 'Días desde última visita para considerar cliente "inactivo"'}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f0f9ff',
                        borderLeft: '4px solid #0369a1',
                        borderRadius: '4px',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <p style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'These settings affect:' : 'Esta configuración afecta:'}
                      </p>
                      <ul style={{ fontSize: '14px', color: '#0c4a6e', marginLeft: '1.5rem' }}>
                        <li>
                          {language === 'en'
                            ? 'Clients Report (Retention & Acquisition page)'
                            : 'Reporte de Clientes (página de Retención y Adquisición)'}
                        </li>
                        <li>
                          {language === 'en'
                            ? 'Client classification and segmentation'
                            : 'Clasificación y segmentación de clientes'}
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleSaveRetention}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#ccc' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving
                        ? language === 'en'
                          ? 'Saving...'
                          : 'Guardando...'
                        : language === 'en'
                        ? 'Save Changes'
                        : 'Guardar Cambios'}
                    </button>
                  </div>
                )}

                {activeTab === 'commissions' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1.5rem' }}>
                      {language === 'en' ? 'Commission Settings' : 'Configuración de Comisiones'}
                    </h3>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Default Commission Rate for Services (%)' : 'Tasa de Comisión Predeterminada para Servicios (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={defaultCommissionRate}
                        onChange={(e) => setDefaultCommissionRate(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Default commission rate used for all barbers unless overridden. For example, enter "50" for 50%.'
                          : 'Tasa de comisión predeterminada para todos los barberos a menos que se reemplace. Por ejemplo, ingresa "50" para 50%.'}
                      </p>
                    </div>

                    <button
                      onClick={handleSaveCommissions}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#ccc' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        marginBottom: '2rem',
                      }}
                    >
                      {saving
                        ? language === 'en'
                          ? 'Saving...'
                          : 'Guardando...'
                        : language === 'en'
                        ? 'Save Default Rate'
                        : 'Guardar Tasa Predeterminada'}
                    </button>

                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                      {language === 'en' ? 'Per-Barber Commission Overrides' : 'Comisiones Personalizadas por Barbero'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
                      {language === 'en'
                        ? 'Leave blank to use shop default. Enter a percentage (e.g., "60") to override.'
                        : 'Dejar vacío para usar predeterminado. Ingresa un porcentaje (ej., "60") para reemplazar.'}
                    </p>

                    {barbers.length === 0 ? (
                      <p style={{ fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
                        {language === 'en' ? 'No barbers found.' : 'No se encontraron barberos.'}
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                                {language === 'en' ? 'Barber' : 'Barbero'}
                              </th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                                {language === 'en' ? 'Commission Override (%)' : 'Comisión Personalizada (%)'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {barbers.map((barber) => (
                              <tr key={barber.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '0.75rem', fontSize: '14px' }}>{barber.name}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder={language === 'en' ? 'Use default' : 'Usar predeterminado'}
                                    value={barber.commission_rate_override ? (barber.commission_rate_override * 100).toFixed(1) : ''}
                                    onChange={(e) => {
                                      const newBarbers = [...barbers];
                                      const index = newBarbers.findIndex((b) => b.id === barber.id);
                                      newBarbers[index] = { ...newBarbers[index], commission_rate_override: e.target.value ? parseFloat(e.target.value) / 100 : null };
                                      setBarbers(newBarbers);
                                    }}
                                    onBlur={(e) => handleUpdateBarberCommission(barber.id, e.target.value)}
                                    style={{
                                      width: '100%',
                                      maxWidth: '150px',
                                      padding: '0.5rem',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1.5rem' }}>
                      {language === 'en' ? 'Notification Settings' : 'Configuración de Notificaciones'}
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Primary Reminder (hours before)' : 'Recordatorio Primario (horas antes)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={reminderHoursBefore}
                        onChange={(e) => setReminderHoursBefore(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'First reminder sent this many hours before the appointment (e.g., 24 for one day before).'
                          : 'Primer recordatorio enviado esta cantidad de horas antes de la cita (ej., 24 para un día antes).'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Secondary Reminder (hours before, optional)' : 'Recordatorio Secundario (horas antes, opcional)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        placeholder={language === 'en' ? 'Leave blank to disable' : 'Dejar vacío para desactivar'}
                        value={reminderHoursBeforeSecondary}
                        onChange={(e) => setReminderHoursBeforeSecondary(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Optional second reminder (e.g., 1 for one hour before). Leave blank to send only the primary reminder.'
                          : 'Recordatorio secundario opcional (ej., 1 para una hora antes). Dejar vacío para enviar solo el recordatorio primario.'}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f0f9ff',
                        borderLeft: '4px solid #0369a1',
                        borderRadius: '4px',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <p style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {language === 'en' ? 'Automated SMS Notifications' : 'Notificaciones SMS Automatizadas'}
                      </p>
                      <ul style={{ fontSize: '14px', color: '#0c4a6e', marginLeft: '1.5rem' }}>
                        <li>
                          {language === 'en'
                            ? 'Booking confirmations are sent immediately when appointments are booked'
                            : 'Las confirmaciones de reserva se envían inmediatamente cuando se reservan citas'}
                        </li>
                        <li>
                          {language === 'en'
                            ? 'Up to two reminders can be sent automatically before appointments (primary + optional secondary)'
                            : 'Se pueden enviar hasta dos recordatorios automáticamente antes de las citas (primario + secundario opcional)'}
                        </li>
                        <li>
                          {language === 'en'
                            ? 'Cancellation notifications are sent when appointments are cancelled'
                            : 'Las notificaciones de cancelación se envían cuando se cancelan citas'}
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#ccc' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {saving
                        ? language === 'en'
                          ? 'Saving...'
                          : 'Guardando...'
                        : language === 'en'
                        ? 'Save Changes'
                        : 'Guardar Cambios'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
