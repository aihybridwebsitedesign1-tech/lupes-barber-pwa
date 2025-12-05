import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type ShopConfig = {
  id: number;
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

type Tab = 'shop_info' | 'booking_rules' | 'retention';

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

  const [taxRate, setTaxRate] = useState('0');
  const [cardFeeRate, setCardFeeRate] = useState('4');

  const [daysBookableInAdvance, setDaysBookableInAdvance] = useState('30');
  const [minBookAheadHours, setMinBookAheadHours] = useState('2');
  const [minCancelAheadHours, setMinCancelAheadHours] = useState('24');
  const [bookingInterval, setBookingInterval] = useState('15');

  const [regularClientMinVisits, setRegularClientMinVisits] = useState('3');
  const [lapsedClientDays, setLapsedClientDays] = useState('90');

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
        setTaxRate(((data.tax_rate || 0) * 100).toFixed(2));
        setCardFeeRate(((data.card_processing_fee_rate || 0) * 100).toFixed(2));
        setDaysBookableInAdvance(String(data.days_bookable_in_advance || 30));
        setMinBookAheadHours(String(data.min_book_ahead_hours || 2));
        setMinCancelAheadHours(String(data.min_cancel_ahead_hours || 24));
        setBookingInterval(String(data.client_booking_interval_minutes || 15));
        setRegularClientMinVisits(String(data.regular_client_min_visits || 3));
        setLapsedClientDays(String(data.lapsed_client_days || 90));
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
          tax_rate: parseFloat(taxRate) / 100,
          card_processing_fee_rate: parseFloat(cardFeeRate) / 100,
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

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const tabs: { id: Tab; labelEn: string; labelEs: string }[] = [
    { id: 'shop_info', labelEn: 'Shop Info', labelEs: 'Info de Tienda' },
    { id: 'booking_rules', labelEn: 'Booking Rules', labelEs: 'Reglas de Reserva' },
    { id: 'retention', labelEn: 'Clients & Retention', labelEs: 'Clientes y Retención' },
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
