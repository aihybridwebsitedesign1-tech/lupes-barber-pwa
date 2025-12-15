import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import ConfirmResetModal from '../components/ConfirmResetModal';
import {
  resetTestAppointments,
  resetTestPayouts,
  resetTimeTracking,
  resetAllNonCoreData,
  generateDemoData,
  formatResetResult,
} from '../lib/resetTools';

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
  test_mode_enabled: boolean;
};

type Tab = 'shop_info' | 'booking_rules' | 'retention' | 'commissions' | 'payments' | 'notifications' | 'test_mode' | 'data_tools';

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

  const [enableTipping, setEnableTipping] = useState(true);
  const [tipPercentagePresets, setTipPercentagePresets] = useState('15, 18, 20, 25');

  const [businessHours, setBusinessHours] = useState<{
    [key: string]: { open: string; close: string } | null;
  }>({
    '0': null,
    '1': { open: '09:00', close: '18:00' },
    '2': { open: '09:00', close: '18:00' },
    '3': { open: '09:00', close: '18:00' },
    '4': { open: '09:00', close: '18:00' },
    '5': { open: '09:00', close: '18:00' },
    '6': { open: '09:00', close: '18:00' },
  });

  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [showDeleteTestModal, setShowDeleteTestModal] = useState(false);
  const [deletingTestData, setDeletingTestData] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'test_appointments' | 'test_payouts' | 'time_tracking' | 'all_data' | 'generate_demo' | null>(null);
  const [resetting, setResetting] = useState(false);

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

        setEnableTipping(data.enable_tipping ?? true);
        const tipPercents = data.tip_percentage_presets || [15, 18, 20, 25];
        setTipPercentagePresets(Array.isArray(tipPercents) ? tipPercents.join(', ') : '15, 18, 20, 25');

        if (data.shop_hours) {
          setBusinessHours(data.shop_hours);
        }

        setTestModeEnabled(data.test_mode_enabled ?? false);
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
          shop_hours: businessHours,
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

  const savePaymentSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const percentages = tipPercentagePresets
        .split(',')
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p) && p > 0)
        .slice(0, 5);

      // For JSONB columns, pass the array directly (not JSON.stringify)
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          enable_tipping: enableTipping,
          tip_percentage_presets: percentages,
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Payment settings saved successfully!' : '¡Configuración de pagos guardada exitosamente!');
      loadShopConfig();
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      setError(language === 'en' ? 'Failed to save payment settings' : 'Error al guardar configuración de pagos');
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

  const handleSaveTestMode = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('shop_config')
        .update({
          test_mode_enabled: testModeEnabled,
        })
        .eq('id', config?.id || 1);

      if (updateError) throw updateError;

      setSuccess(language === 'en' ? 'Test mode settings saved!' : '¡Configuración de modo de prueba guardada!');
      await loadShopConfig();
    } catch (err: any) {
      console.error('Error saving test mode:', err);
      setError(language === 'en' ? 'Failed to save test mode settings' : 'Error al guardar configuración de modo de prueba');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestBookings = async () => {
    setDeletingTestData(true);
    setError('');
    setSuccess('');

    try {
      // Get all test appointment IDs first
      const { data: testAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('is_test', true);

      const testAppointmentIds = (testAppointments || []).map(a => a.id);

      // Cancel all test appointments (soft delete - set status to cancelled)
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('is_test', true)
        .neq('status', 'cancelled');

      if (cancelError) throw cancelError;

      // Cancel all booking reminders for test appointments (only if there are test appointments)
      if (testAppointmentIds.length > 0) {
        const { error: remindersError } = await supabase
          .from('booking_reminders')
          .update({
            status: 'cancelled',
            error_message: 'Test appointment deleted',
          })
          .eq('status', 'pending')
          .in('appointment_id', testAppointmentIds);

        if (remindersError) {
          console.error('Error cancelling test reminders:', remindersError);
          // Don't throw - reminders are secondary
        }
      }

      setSuccess(language === 'en' ? 'All test bookings have been cancelled!' : '¡Todas las reservas de prueba han sido canceladas!');
      setShowDeleteTestModal(false);
    } catch (err: any) {
      console.error('Error deleting test bookings:', err);
      setError(language === 'en' ? 'Failed to delete test bookings' : 'Error al eliminar reservas de prueba');
    } finally {
      setDeletingTestData(false);
    }
  };

  const handleResetData = async () => {
    if (!resetType) return;

    setResetting(true);
    setError('');
    setSuccess('');

    try {
      let result;

      switch (resetType) {
        case 'test_appointments':
          result = await resetTestAppointments();
          break;
        case 'test_payouts':
          result = await resetTestPayouts();
          break;
        case 'time_tracking':
          result = await resetTimeTracking();
          break;
        case 'all_data':
          result = await resetAllNonCoreData();
          break;
        case 'generate_demo':
          result = await generateDemoData();
          break;
        default:
          throw new Error('Invalid reset type');
      }

      if (!result.success) {
        setError(result.error || (language === 'en' ? 'Operation failed' : 'Operación falló'));
        return;
      }

      const details = formatResetResult(result, language);
      setSuccess(
        resetType === 'generate_demo'
          ? (language === 'en'
              ? `Demo data generated successfully! ${details}`
              : `¡Datos de demostración generados con éxito! ${details}`)
          : (language === 'en'
              ? `Reset completed successfully! ${details}`
              : `¡Reinicio completado con éxito! ${details}`)
      );
      setShowResetModal(false);
      setResetType(null);
    } catch (err: any) {
      console.error('Error performing operation:', err);
      setError(language === 'en' ? 'Operation failed' : 'Operación falló');
    } finally {
      setResetting(false);
    }
  };

  const openResetModal = (type: typeof resetType) => {
    setResetType(type);
    setShowResetModal(true);
    setError('');
    setSuccess('');
  };

  const getResetModalContent = () => {
    switch (resetType) {
      case 'test_appointments':
        return {
          title: language === 'en' ? 'Reset Test Appointments' : 'Reiniciar Citas de Prueba',
          description:
            language === 'en'
              ? 'This will permanently delete all appointments marked as test data, along with related transformation photos and reminders.'
              : 'Esto eliminará permanentemente todas las citas marcadas como datos de prueba, junto con fotos de transformación y recordatorios relacionados.',
          warningText:
            language === 'en'
              ? 'WARNING: This action cannot be undone. All test appointment data will be permanently deleted.'
              : 'ADVERTENCIA: Esta acción no se puede deshacer. Todos los datos de citas de prueba se eliminarán permanentemente.',
        };
      case 'test_payouts':
        return {
          title: language === 'en' ? 'Reset Test Payouts' : 'Reiniciar Pagos de Prueba',
          description:
            language === 'en'
              ? 'This will permanently delete payouts linked only to test appointments and unmark commission_paid flags for affected items.'
              : 'Esto eliminará permanentemente los pagos vinculados solo a citas de prueba y desmarcará las banderas commission_paid para los elementos afectados.',
          warningText:
            language === 'en'
              ? 'WARNING: This action cannot be undone. Test payout data will be permanently deleted.'
              : 'ADVERTENCIA: Esta acción no se puede deshacer. Los datos de pagos de prueba se eliminarán permanentemente.',
        };
      case 'time_tracking':
        return {
          title: language === 'en' ? 'Reset Time Tracking' : 'Reiniciar Seguimiento de Tiempo',
          description:
            language === 'en'
              ? 'This will permanently delete all time tracking entries. Barber profiles and settings will remain intact.'
              : 'Esto eliminará permanentemente todas las entradas de seguimiento de tiempo. Los perfiles de barberos y la configuración permanecerán intactos.',
          warningText:
            language === 'en'
              ? 'WARNING: This action cannot be undone. All time tracking history will be permanently deleted.'
              : 'ADVERTENCIA: Esta acción no se puede deshacer. Todo el historial de seguimiento de tiempo se eliminará permanentemente.',
        };
      case 'all_data':
        return {
          title: language === 'en' ? 'Full Reset (Recommended Before Go-Live)' : 'Reinicio Completo (Recomendado Antes del Lanzamiento)',
          description:
            language === 'en'
              ? 'This will permanently delete ALL appointments, payouts, time tracking, transformation photos, reminders, inventory transactions, and messages. Barbers, services, products, and shop settings will NOT be affected.'
              : 'Esto eliminará permanentemente TODAS las citas, pagos, seguimiento de tiempo, fotos de transformación, recordatorios, transacciones de inventario y mensajes. Los barberos, servicios, productos y la configuración de la tienda NO se verán afectados.',
          warningText:
            language === 'en'
              ? 'CRITICAL WARNING: This action cannot be undone. ALL transactional data will be permanently deleted. Only use this before going live.'
              : 'ADVERTENCIA CRÍTICA: Esta acción no se puede deshacer. TODOS los datos transaccionales se eliminarán permanentemente. Solo use esto antes del lanzamiento.',
        };
      case 'generate_demo':
        return {
          title: language === 'en' ? 'Generate Demo Data' : 'Generar Datos de Demostración',
          description:
            language === 'en'
              ? 'This will create demo barbers, clients, services, products, and appointments. All demo data will be marked as test data for easy cleanup later. Perfect for testing and demonstrations.'
              : 'Esto creará barberos, clientes, servicios, productos y citas de demostración. Todos los datos de demostración se marcarán como datos de prueba para facilitar la limpieza posterior. Perfecto para pruebas y demostraciones.',
          warningText:
            language === 'en'
              ? 'NOTE: This will add new data to your system. All demo appointments will be marked as test data and can be deleted later using "Reset Test Appointments".'
              : 'NOTA: Esto agregará nuevos datos a su sistema. Todas las citas de demostración se marcarán como datos de prueba y se pueden eliminar más tarde usando "Reiniciar Citas de Prueba".',
        };
      default:
        return {
          title: '',
          description: '',
          warningText: '',
        };
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
    { id: 'payments', labelEn: 'Online Payments', labelEs: 'Pagos en Línea' },
    { id: 'notifications', labelEn: 'Notifications', labelEs: 'Notificaciones' },
    { id: 'test_mode', labelEn: 'Test Mode', labelEs: 'Modo de Prueba' },
    { id: 'data_tools', labelEn: 'Data Tools', labelEs: 'Herramientas de Datos' },
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
                        {language === 'en' ? 'Business Hours' : 'Horario de Atención'}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                        {language === 'en'
                          ? 'Set your opening and closing times for each day of the week. These hours will be displayed on your client-facing website.'
                          : 'Establece tus horarios de apertura y cierre para cada día de la semana. Estos horarios se mostrarán en tu sitio web de cara al cliente.'}
                      </p>

                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                          const dayEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][index];
                          const dayKey = String(index);
                          const hours = businessHours[dayKey];

                          return (
                            <div
                              key={dayKey}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '6px',
                              }}
                            >
                              <div style={{ minWidth: '120px', fontWeight: '500', fontSize: '14px' }}>
                                {language === 'en' ? day : dayEs}
                              </div>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={hours !== null}
                                  onChange={(e) => {
                                    const newHours = { ...businessHours };
                                    newHours[dayKey] = e.target.checked
                                      ? { open: '09:00', close: '18:00' }
                                      : null;
                                    setBusinessHours(newHours);
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px' }}>
                                  {language === 'en' ? 'Open' : 'Abierto'}
                                </span>
                              </label>

                              {hours && (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                      type="time"
                                      value={hours.open}
                                      onChange={(e) => {
                                        const newHours = { ...businessHours };
                                        newHours[dayKey] = { ...hours, open: e.target.value };
                                        setBusinessHours(newHours);
                                      }}
                                      style={{
                                        padding: '0.5rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                      }}
                                    />
                                    <span style={{ color: '#666' }}>-</span>
                                    <input
                                      type="time"
                                      value={hours.close}
                                      onChange={(e) => {
                                        const newHours = { ...businessHours };
                                        newHours[dayKey] = { ...hours, close: e.target.value };
                                        setBusinessHours(newHours);
                                      }}
                                      style={{
                                        padding: '0.5rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                      }}
                                    />
                                  </div>
                                </>
                              )}

                              {!hours && (
                                <span style={{ color: '#999', fontSize: '14px', fontStyle: 'italic' }}>
                                  {language === 'en' ? 'Closed' : 'Cerrado'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
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

                {activeTab === 'payments' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {language === 'en' ? 'Online Payments & Tipping' : 'Pagos en Línea y Propinas'}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
                      {language === 'en'
                        ? 'Configure tip options for online payments. These will be shown when Stripe is fully integrated.'
                        : 'Configura las opciones de propina para pagos en línea. Se mostrarán cuando Stripe esté completamente integrado.'}
                    </p>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', fontSize: '16px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={enableTipping}
                          onChange={(e) => setEnableTipping(e.target.checked)}
                          style={{ marginRight: '0.5rem', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        {language === 'en' ? 'Enable Tipping' : 'Habilitar Propinas'}
                      </label>
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                        {language === 'en'
                          ? 'Allow clients to add tips when paying online'
                          : 'Permitir que los clientes agreguen propinas al pagar en línea'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '16px', fontWeight: '500' }}>
                        {language === 'en' ? 'Tip Percentage Presets (%)' : 'Porcentajes de Propina Preestablecidos (%)'}
                      </label>
                      <input
                        type="text"
                        value={tipPercentagePresets}
                        onChange={(e) => setTipPercentagePresets(e.target.value)}
                        placeholder={language === 'en' ? 'e.g., 15, 18, 20, 25' : 'ej., 15, 18, 20, 25'}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' }}
                      />
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>
                        {language === 'en'
                          ? 'Enter up to 5 percentage values, separated by commas'
                          : 'Ingresa hasta 5 valores de porcentaje, separados por comas'}
                      </p>
                    </div>

                    <button
                      onClick={savePaymentSettings}
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: saving ? '#999' : '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: '500',
                      }}
                    >
                      {saving
                        ? (language === 'en' ? 'Saving...' : 'Guardando...')
                        : (language === 'en' ? 'Save Changes' : 'Guardar Cambios')}
                    </button>
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

                {activeTab === 'test_mode' && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
                      {language === 'en' ? 'Test Mode' : 'Modo de Prueba'}
                    </h3>

                    <div
                      style={{
                        padding: '1.25rem',
                        backgroundColor: '#fff3cd',
                        borderLeft: '4px solid #ffc107',
                        borderRadius: '6px',
                        marginBottom: '2rem',
                      }}
                    >
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '0.75rem', color: '#856404' }}>
                        {language === 'en' ? '⚠️ Test Mode is for safe testing only' : '⚠️ Modo de Prueba es solo para pruebas seguras'}
                      </p>
                      <p style={{ fontSize: '14px', color: '#856404', lineHeight: '1.6' }}>
                        {language === 'en'
                          ? 'When enabled, SMS messages will NOT be sent, online payments will be disabled (forcing "pay in shop"), and new appointments will be marked as test data for easy cleanup.'
                          : 'Cuando está habilitado, los mensajes SMS NO se enviarán, los pagos en línea estarán deshabilitados (forzando "pagar en tienda"), y las nuevas citas se marcarán como datos de prueba para fácil limpieza.'}
                      </p>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '1rem',
                          backgroundColor: testModeEnabled ? '#fff3cd' : '#f5f5f5',
                          borderRadius: '8px',
                          border: `2px solid ${testModeEnabled ? '#ffc107' : '#ddd'}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={testModeEnabled}
                          onChange={(e) => setTestModeEnabled(e.target.checked)}
                          style={{ marginRight: '1rem', width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '16px', display: 'block', marginBottom: '0.25rem' }}>
                            {language === 'en' ? 'Enable Test Mode' : 'Habilitar Modo de Prueba'}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {language === 'en'
                              ? 'Sandbox mode for safe testing without affecting real clients'
                              : 'Modo sandbox para pruebas seguras sin afectar clientes reales'}
                          </span>
                        </div>
                      </label>
                    </div>

                    <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                        {language === 'en' ? 'When Test Mode is ON:' : 'Cuando el Modo de Prueba está ACTIVO:'}
                      </p>
                      <ul style={{ fontSize: '14px', color: '#0c4a6e', marginLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>
                          {language === 'en'
                            ? '🚫 SMS reminders and notifications will NOT be sent to real phone numbers'
                            : '🚫 Los recordatorios y notificaciones SMS NO se enviarán a números de teléfono reales'}
                        </li>
                        <li>
                          {language === 'en'
                            ? '💳 Online payments are disabled - all bookings forced to "Pay in Shop" mode'
                            : '💳 Los pagos en línea están deshabilitados - todas las reservas forzadas al modo "Pagar en Tienda"'}
                        </li>
                        <li>
                          {language === 'en'
                            ? '🏷️ New appointments are automatically tagged as test data'
                            : '🏷️ Las nuevas citas se etiquetan automáticamente como datos de prueba'}
                        </li>
                        <li>
                          {language === 'en'
                            ? '📊 Client-facing booking site shows a "Test Mode" banner'
                            : '📊 El sitio de reservas para clientes muestra un banner de "Modo de Prueba"'}
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: '3rem', marginBottom: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e5e5' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
                        {language === 'en' ? 'Test Data Tools' : 'Herramientas de Datos de Prueba'}
                      </h4>

                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        {language === 'en'
                          ? 'Clean up test appointments after testing. This only affects appointments marked as test data and will not touch real client bookings.'
                          : 'Limpia las citas de prueba después de probar. Esto solo afecta las citas marcadas como datos de prueba y no tocará las reservas de clientes reales.'}
                      </p>

                      <button
                        onClick={() => setShowDeleteTestModal(true)}
                        disabled={deletingTestData}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: deletingTestData ? '#ccc' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: deletingTestData ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {language === 'en' ? '🗑️ Delete Test Bookings' : '🗑️ Eliminar Reservas de Prueba'}
                      </button>
                    </div>

                    <button
                      onClick={handleSaveTestMode}
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

                {/* Delete Test Bookings Confirmation Modal */}
                {showDeleteTestModal && (
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
                    onClick={() => !deletingTestData && setShowDeleteTestModal(false)}
                  >
                    <div
                      style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
                        {language === 'en' ? 'Delete Test Bookings?' : '¿Eliminar Reservas de Prueba?'}
                      </h3>

                      <p style={{ fontSize: '15px', color: '#666', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        {language === 'en'
                          ? 'This will cancel all appointments marked as test data (is_test = true). Their reminders will also be cancelled. Live client data will NOT be touched.'
                          : 'Esto cancelará todas las citas marcadas como datos de prueba (is_test = true). Sus recordatorios también se cancelarán. Los datos de clientes reales NO serán tocados.'}
                      </p>

                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setShowDeleteTestModal(false)}
                          disabled={deletingTestData}
                          style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'white',
                            color: '#333',
                            border: '2px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: deletingTestData ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {language === 'en' ? 'Cancel' : 'Cancelar'}
                        </button>
                        <button
                          onClick={handleDeleteTestBookings}
                          disabled={deletingTestData}
                          style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: deletingTestData ? '#ccc' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: deletingTestData ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {deletingTestData
                            ? (language === 'en' ? 'Deleting...' : 'Eliminando...')
                            : (language === 'en' ? 'Yes, Delete Test Bookings' : 'Sí, Eliminar Reservas de Prueba')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'data_tools' && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
                  {language === 'en' ? 'Data Tools (Reset & Cleanup)' : 'Herramientas de Datos (Reinicio y Limpieza)'}
                </h3>

                <div
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#fff3cd',
                    borderLeft: '4px solid #ffc107',
                    borderRadius: '6px',
                    marginBottom: '2rem',
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '0.75rem', color: '#856404' }}>
                    {language === 'en' ? 'Safe Data Reset Tools' : 'Herramientas Seguras de Reinicio de Datos'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#856404', lineHeight: '1.6', marginBottom: 0 }}>
                    {language === 'en'
                      ? 'These tools allow you to selectively delete test data or perform a full reset before going live. All operations are logged for audit purposes. Core configuration (barbers, services, products, shop settings) will NEVER be deleted.'
                      : 'Estas herramientas le permiten eliminar selectivamente datos de prueba o realizar un reinicio completo antes del lanzamiento. Todas las operaciones se registran con fines de auditoría. La configuración principal (barberos, servicios, productos, configuración de la tienda) NUNCA se eliminará.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#e8f5e9',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '0.75rem', color: '#2e7d32' }}>
                      {language === 'en' ? '🎯 Generate Demo Data' : '🎯 Generar Datos de Demostración'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {language === 'en'
                        ? 'Creates realistic demo barbers, clients, services, products, and appointments for testing. All demo appointments are marked as test data and can be cleaned up easily.'
                        : 'Crea barberos, clientes, servicios, productos y citas de demostración realistas para pruebas. Todas las citas de demostración se marcan como datos de prueba y se pueden limpiar fácilmente.'}
                    </p>
                    <button
                      onClick={() => openResetModal('generate_demo')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? '✨ Generate Demo Data' : '✨ Generar Datos de Demostración'}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'white',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                      {language === 'en' ? '1. Reset Test Appointments Only' : '1. Reiniciar Solo Citas de Prueba'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {language === 'en'
                        ? 'Deletes all appointments marked as test data, along with their transformation photos and reminders. Does not affect payouts or other data.'
                        : 'Elimina todas las citas marcadas como datos de prueba, junto con sus fotos de transformación y recordatorios. No afecta los pagos u otros datos.'}
                    </p>
                    <button
                      onClick={() => openResetModal('test_appointments')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? 'Reset Test Appointments' : 'Reiniciar Citas de Prueba'}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'white',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                      {language === 'en' ? '2. Reset Test Payouts Only' : '2. Reiniciar Solo Pagos de Prueba'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {language === 'en'
                        ? 'Deletes payouts that are linked only to test appointments. Unmarks commission_paid flags so items can be recalculated.'
                        : 'Elimina los pagos que están vinculados solo a citas de prueba. Desmarca las banderas commission_paid para que los elementos puedan recalcularse.'}
                    </p>
                    <button
                      onClick={() => openResetModal('test_payouts')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? 'Reset Test Payouts' : 'Reiniciar Pagos de Prueba'}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'white',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                      {language === 'en' ? '3. Reset Time Tracking History' : '3. Reiniciar Historial de Seguimiento de Tiempo'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {language === 'en'
                        ? 'Deletes all time tracking entries (clock-ins and clock-outs). Barber profiles and settings remain intact.'
                        : 'Elimina todas las entradas de seguimiento de tiempo (entradas y salidas). Los perfiles de barberos y la configuración permanecen intactos.'}
                    </p>
                    <button
                      onClick={() => openResetModal('time_tracking')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? 'Reset Time Tracking' : 'Reiniciar Seguimiento de Tiempo'}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#fee',
                      border: '2px solid #fcc',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '0.75rem', color: '#c00' }}>
                      {language === 'en' ? '4. Full Reset (Recommended Before Go-Live)' : '4. Reinicio Completo (Recomendado Antes del Lanzamiento)'}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {language === 'en'
                        ? 'Deletes ALL appointments, payouts, time tracking, transformation photos, reminders, inventory transactions, and messages. Use this to start fresh before launching your shop. Barbers, services, products, and shop settings are preserved.'
                        : 'Elimina TODAS las citas, pagos, seguimiento de tiempo, fotos de transformación, recordatorios, transacciones de inventario y mensajes. Use esto para comenzar de nuevo antes de lanzar su tienda. Los barberos, servicios, productos y la configuración de la tienda se conservan.'}
                    </p>
                    <button
                      onClick={() => openResetModal('all_data')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#991b1b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'en' ? 'Full Reset (Danger)' : 'Reinicio Completo (Peligro)'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#e3f2fd',
                    borderLeft: '4px solid #2196f3',
                    borderRadius: '6px',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '0.5rem', color: '#1565c0' }}>
                    {language === 'en' ? 'What is NOT deleted:' : 'Lo que NO se elimina:'}
                  </p>
                  <ul style={{ fontSize: '13px', color: '#1565c0', marginLeft: '1.5rem', lineHeight: '1.8' }}>
                    <li>{language === 'en' ? 'Barber profiles and commission rates' : 'Perfiles de barberos y tasas de comisión'}</li>
                    <li>{language === 'en' ? 'Services and pricing' : 'Servicios y precios'}</li>
                    <li>{language === 'en' ? 'Products and inventory settings' : 'Productos y configuración de inventario'}</li>
                    <li>{language === 'en' ? 'Shop configuration and business hours' : 'Configuración de la tienda y horario comercial'}</li>
                    <li>{language === 'en' ? 'User accounts and permissions' : 'Cuentas de usuario y permisos'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {showResetModal && resetType && (
          <ConfirmResetModal
            {...getResetModalContent()}
            onConfirm={handleResetData}
            onClose={() => {
              setShowResetModal(false);
              setResetType(null);
            }}
            isLoading={resetting}
          />
        )}
      </main>
    </div>
  );
}
