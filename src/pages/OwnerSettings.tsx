import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

type ShopHours = {
  [key: string]: { open: string; close: string } | null;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function OwnerSettings() {
  const [shopHours, setShopHours] = useState<ShopHours>({});
  const [taxRate, setTaxRate] = useState('0');
  const [cardFeeRate, setCardFeeRate] = useState('4');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { language, t } = useLanguage();

  useEffect(() => {
    loadShopConfig();
  }, []);

  const loadShopConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_config')
        .select('shop_hours, tax_rate, card_processing_fee_rate')
        .single();

      if (error) throw error;

      if (data?.shop_hours) {
        setShopHours(data.shop_hours);
      }
      if (data?.tax_rate !== null && data?.tax_rate !== undefined) {
        setTaxRate((Number(data.tax_rate) * 100).toFixed(2));
      }
      if (data?.card_processing_fee_rate !== null && data?.card_processing_fee_rate !== undefined) {
        setCardFeeRate((Number(data.card_processing_fee_rate) * 100).toFixed(2));
      }
    } catch (error) {
      console.error('Error loading shop config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setShopHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { open: '10:00', close: '19:00' },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setShopHours((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [field]: value } : null,
    }));
  };

  const handleSave = async () => {
    const taxNum = parseFloat(taxRate);
    const cardFeeNum = parseFloat(cardFeeRate);

    if (isNaN(taxNum) || taxNum < 0 || taxNum > 25) {
      alert(language === 'en' ? 'Tax rate must be between 0 and 25%' : 'La tasa de impuesto debe estar entre 0 y 25%');
      return;
    }

    if (isNaN(cardFeeNum) || cardFeeNum < 0 || cardFeeNum > 15) {
      alert(language === 'en' ? 'Card fee must be between 0 and 15%' : 'La tarifa de tarjeta debe estar entre 0 y 15%');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shop_config')
        .update({
          shop_hours: shopHours,
          tax_rate: taxNum / 100,
          card_processing_fee_rate: cardFeeNum / 100,
        })
        .eq('id', (await supabase.from('shop_config').select('id').single()).data?.id);

      if (error) throw error;

      alert(language === 'en' ? 'Settings saved successfully!' : '¡Configuración guardada exitosamente!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(language === 'en' ? 'Error saving settings' : 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDemoData = async () => {
    const confirmed = confirm(
      language === 'en'
        ? 'This will create demo clients and appointments for the past 30 days using your existing barbers, services, and products. Continue?'
        : 'Esto creará clientes y citas de demostración para los últimos 30 días usando tus barberos, servicios y productos existentes. ¿Continuar?'
    );

    if (!confirmed) return;

    setGenerating(true);
    try {
      const { data: barbers } = await supabase.from('users').select('id').eq('role', 'BARBER').eq('active', true);
      const { data: services } = await supabase.from('services').select('id, base_price, duration_minutes').eq('active', true);

      if (!barbers?.length || !services?.length) {
        alert(
          language === 'en'
            ? 'You need at least one active barber and one active service to generate demo data.'
            : 'Necesitas al menos un barbero activo y un servicio activo para generar datos de demostración.'
        );
        setGenerating(false);
        return;
      }

      const demoClients = [];
      const firstNames = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Miguel', 'Elena', 'Jose', 'Carmen'];
      const lastNames = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Torres'];

      for (let i = 0; i < 20; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        demoClients.push({
          first_name: firstName,
          last_name: lastName,
          phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          language: Math.random() > 0.5 ? 'en' : 'es',
        });
      }

      const { data: insertedClients, error: clientError } = await supabase
        .from('clients')
        .insert(demoClients)
        .select('id');

      if (clientError) throw clientError;

      const now = new Date();
      const demoAppointments = [];
      const statuses = ['completed', 'completed', 'completed', 'completed', 'no_show', 'cancelled'];
      const paymentMethods = ['cash', 'cash', 'card_in_shop'];

      for (let i = 0; i < 60; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const appointmentDate = new Date(now);
        appointmentDate.setDate(appointmentDate.getDate() - daysAgo);
        appointmentDate.setHours(10 + Math.floor(Math.random() * 8), [0, 30][Math.floor(Math.random() * 2)], 0, 0);

        const service = services[Math.floor(Math.random() * services.length)];
        const barber = barbers[Math.floor(Math.random() * barbers.length)];
        const client = insertedClients![Math.floor(Math.random() * insertedClients!.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const endTime = new Date(appointmentDate);
        endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

        const tip = status === 'completed' ? Math.floor(Math.random() * 10) + 5 : 0;
        const paymentMethod = status === 'completed' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null;
        const processingFeeRate = paymentMethod?.startsWith('card') ? 0.04 : 0;
        const processingFee = paymentMethod?.startsWith('card') ? (service.base_price + tip) * processingFeeRate : 0;
        const totalCharged = status === 'completed' ? service.base_price + tip + processingFee : 0;

        demoAppointments.push({
          client_id: client.id,
          barber_id: barber.id,
          service_id: service.id,
          scheduled_start: appointmentDate.toISOString(),
          scheduled_end: endTime.toISOString(),
          status: status,
          actual_duration_minutes: status === 'completed' ? service.duration_minutes : null,
          services_total: service.base_price,
          products_total: 0,
          tax_amount: 0,
          tip_amount: tip,
          processing_fee_rate: processingFeeRate,
          processing_fee_amount: processingFee,
          total_charged: totalCharged,
          net_revenue: status === 'completed' ? totalCharged - processingFee : 0,
          payment_method: paymentMethod,
          paid_at: status === 'completed' ? appointmentDate.toISOString() : null,
          completed_at: status === 'completed' ? appointmentDate.toISOString() : null,
        });
      }

      const { error: apptError } = await supabase.from('appointments').insert(demoAppointments);
      if (apptError) throw apptError;

      alert(
        language === 'en'
          ? 'Demo data generated successfully! Check your appointments and reports.'
          : '¡Datos de demostración generados exitosamente! Revisa tus citas y reportes.'
      );
    } catch (error) {
      console.error('Error generating demo data:', error);
      alert(language === 'en' ? 'Error generating demo data' : 'Error al generar datos de demostración');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'RESET') {
      alert(language === 'en' ? 'Please type RESET to confirm' : 'Por favor escribe RESET para confirmar');
      return;
    }

    setDeleting(true);
    try {
      console.log('=== DeleteAllData: starting... ===');

      console.log('DeleteAllData: deleting appointment_products...');
      const { error: appointmentProductsError } = await supabase
        .from('appointment_products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (appointmentProductsError) {
        console.error('DeleteAllData: ERROR deleting appointment_products:', appointmentProductsError);
        throw new Error(`Failed to delete appointment_products: ${appointmentProductsError.message}`);
      }
      const { count: apRemaining } = await supabase
        .from('appointment_products')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from appointment_products (${apRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: deleting transformation_photos...');
      const { error: transformationPhotosError } = await supabase
        .from('transformation_photos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (transformationPhotosError) {
        console.error('DeleteAllData: ERROR deleting transformation_photos:', transformationPhotosError);
        throw new Error(`Failed to delete transformation_photos: ${transformationPhotosError.message}`);
      }
      const { count: tpRemaining } = await supabase
        .from('transformation_photos')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from transformation_photos (${tpRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: deleting barber_time_off...');
      const { error: timeOffError } = await supabase
        .from('barber_time_off')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (timeOffError) {
        console.error('DeleteAllData: ERROR deleting barber_time_off:', timeOffError);
        throw new Error(`Failed to delete barber_time_off: ${timeOffError.message}`);
      }
      const { count: btoRemaining } = await supabase
        .from('barber_time_off')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from barber_time_off (${btoRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: deleting barber_schedules...');
      const { error: schedulesError } = await supabase
        .from('barber_schedules')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (schedulesError) {
        console.error('DeleteAllData: ERROR deleting barber_schedules:', schedulesError);
        throw new Error(`Failed to delete barber_schedules: ${schedulesError.message}`);
      }
      const { count: bsRemaining } = await supabase
        .from('barber_schedules')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from barber_schedules (${bsRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: deleting client_notes...');
      const { error: clientNotesError } = await supabase
        .from('client_notes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (clientNotesError && clientNotesError.code !== 'PGRST116') {
        console.error('DeleteAllData: ERROR deleting client_notes:', clientNotesError);
        throw new Error(`Failed to delete client_notes: ${clientNotesError.message}`);
      }
      if (clientNotesError && clientNotesError.code === 'PGRST116') {
        console.log('DeleteAllData: client_notes table does not exist, skipping');
      } else {
        const { count: cnRemaining } = await supabase
          .from('client_notes')
          .select('*', { count: 'exact', head: true });
        console.log(`DeleteAllData: deleted from client_notes (${cnRemaining || 0} rows remaining)`);
      }

      console.log('DeleteAllData: deleting appointments...');
      const { error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (appointmentsError) {
        console.error('DeleteAllData: ERROR deleting appointments:', appointmentsError);
        throw new Error(`Failed to delete appointments: ${appointmentsError.message}`);
      }
      const { count: aptRemaining } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from appointments (${aptRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: deleting clients...');
      const { error: clientsError } = await supabase
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (clientsError) {
        console.error('DeleteAllData: ERROR deleting clients:', clientsError);
        throw new Error(`Failed to delete clients: ${clientsError.message}`);
      }
      const { count: clientsRemaining } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      console.log(`DeleteAllData: deleted from clients (${clientsRemaining || 0} rows remaining)`);

      console.log('DeleteAllData: cleaning up storage files...');
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('transformation-photos')
          .list('appointments');

        if (listError) {
          console.warn('DeleteAllData: could not list storage files:', listError);
        } else if (files && files.length > 0) {
          const filePaths = files.map((file) => `appointments/${file.name}`);
          const { error: removeError } = await supabase.storage
            .from('transformation-photos')
            .remove(filePaths);
          if (removeError) {
            console.warn('DeleteAllData: some storage files could not be removed:', removeError);
          } else {
            console.log(`DeleteAllData: deleted ${files.length} transformation photo files from storage`);
          }
        } else {
          console.log('DeleteAllData: no storage files to delete');
        }
      } catch (storageError) {
        console.warn('DeleteAllData: storage cleanup encountered errors:', storageError);
      }

      console.log('DeleteAllData: verifying final counts...');
      const { count: finalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });
      const { count: finalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      console.log(`DeleteAllData: final verification - appointments: ${finalAppointments || 0}, clients: ${finalClients || 0}`);

      if ((finalAppointments || 0) > 0 || (finalClients || 0) > 0) {
        console.error(`DeleteAllData: ERROR - Not all data was deleted! Appointments: ${finalAppointments}, Clients: ${finalClients}`);
        alert(
          language === 'en'
            ? `Some appointments/clients could not be deleted. Appointments remaining: ${finalAppointments || 0}, Clients remaining: ${finalClients || 0}. See console for details.`
            : `Algunas citas/clientes no pudieron ser eliminados. Citas restantes: ${finalAppointments || 0}, Clientes restantes: ${finalClients || 0}. Ver consola para detalles.`
        );
        setDeleting(false);
        return;
      }

      console.log('=== DeleteAllData: finished successfully ===');

      alert(
        language === 'en'
          ? 'All appointments, clients, and demo data have been deleted successfully!'
          : '¡Todas las citas, clientes y datos de demostración han sido eliminados exitosamente!'
      );
      setShowDeleteModal(false);
      setDeleteConfirmText('');

      console.log('DeleteAllData: reloading page to refresh UI...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error('=== DeleteAllData: FAILED ===', error);
      alert(
        language === 'en'
          ? `Failed to delete data: ${error.message || 'Unknown error'}. Check console for details.`
          : `Error al eliminar datos: ${error.message || 'Error desconocido'}. Ver consola para detalles.`
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem', textAlign: 'center' }}>{t.loading}</div>
      </div>
    );
  }

  const dayNames = language === 'en' ? DAYS : DAYS_ES;

  return (
    <div>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '2rem' }}>
          {language === 'en' ? 'Shop Settings' : 'Configuración de la Tienda'}
        </h1>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {language === 'en' ? 'Shop Hours' : 'Horario de la Tienda'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const dayKey = String(dayIndex);
              const isOpen = shopHours[dayKey] !== null && shopHours[dayKey] !== undefined;

              return (
                <div
                  key={dayIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ width: '120px', fontWeight: '500' }}>
                    {dayNames[dayIndex]}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={() => handleDayToggle(dayKey)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {language === 'en' ? 'Open' : 'Abierto'}
                  </label>

                  {isOpen && shopHours[dayKey] && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '14px' }}>
                          {language === 'en' ? 'From:' : 'Desde:'}
                        </label>
                        <input
                          type="time"
                          value={shopHours[dayKey]!.open}
                          onChange={(e) => handleTimeChange(dayKey, 'open', e.target.value)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '14px' }}>
                          {language === 'en' ? 'To:' : 'Hasta:'}
                        </label>
                        <input
                          type="time"
                          value={shopHours[dayKey]!.close}
                          onChange={(e) => handleTimeChange(dayKey, 'close', e.target.value)}
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

                  {!isOpen && (
                    <span style={{ color: '#999', fontSize: '14px' }}>
                      {language === 'en' ? 'Closed' : 'Cerrado'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {language === 'en' ? 'Payment Settings' : 'Configuración de Pagos'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Sales Tax (%)' : 'Impuesto sobre Ventas (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="25"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Enter as percentage (e.g., 8.25 for 8.25%). Range: 0-25%'
                  : 'Ingresar como porcentaje (ej., 8.25 para 8.25%). Rango: 0-25%'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Card Processing Fee (%)' : 'Tarifa de Procesamiento de Tarjeta (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="15"
                value={cardFeeRate}
                onChange={(e) => setCardFeeRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Enter as percentage (e.g., 4 for 4%). Range: 0-15%'
                  : 'Ingresar como porcentaje (ej., 4 para 4%). Rango: 0-15%'}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px', borderLeft: '4px solid #0066cc' }}>
              <div style={{ fontSize: '13px', color: '#004080' }}>
                {language === 'en'
                  ? 'These values are used when calculating payment totals for appointments.'
                  : 'Estos valores se utilizan al calcular los totales de pago de las citas.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            {saving ? t.loading : t.save}
          </button>
        </div>

        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '2px solid #ffc107',
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem', color: '#856404' }}>
            {language === 'en' ? 'Demo Data Tools' : 'Herramientas de Datos de Demostración'}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
            {language === 'en'
              ? 'Use these tools to quickly generate or remove demo data for testing and demonstrations.'
              : 'Usa estas herramientas para generar o eliminar rápidamente datos de demostración para pruebas y demostraciones.'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateDemoData}
              disabled={generating}
              style={{
                padding: '12px 24px',
                backgroundColor: generating ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {generating
                ? language === 'en'
                  ? 'Generating...'
                  : 'Generando...'
                : language === 'en'
                ? 'Generate Demo Data'
                : 'Generar Datos de Demostración'}
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {language === 'en' ? 'Delete All Appointments & Demo Data' : 'Eliminar Todas las Citas y Datos de Demostración'}
            </button>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
            {language === 'en'
              ? '⚠️ Generate Demo Data will create 20 demo clients and 60 appointments over the past 30 days. Delete All Data will permanently remove all appointments, clients, and related data (but keep barbers, services, and settings).'
              : '⚠️ Generar Datos de Demostración creará 20 clientes de demostración y 60 citas en los últimos 30 días. Eliminar Todos los Datos eliminará permanentemente todas las citas, clientes y datos relacionados (pero mantendrá barberos, servicios y configuración).'}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteModal(false)}
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
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#dc3545' }}>
              {language === 'en' ? '⚠️ Danger Zone' : '⚠️ Zona de Peligro'}
            </h2>
            <p style={{ fontSize: '14px', marginBottom: '1rem' }}>
              {language === 'en'
                ? 'This will permanently delete:'
                : 'Esto eliminará permanentemente:'}
            </p>
            <ul style={{ fontSize: '14px', marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li>{language === 'en' ? 'All appointments' : 'Todas las citas'}</li>
              <li>{language === 'en' ? 'All clients' : 'Todos los clientes'}</li>
              <li>{language === 'en' ? 'All transformation photos' : 'Todas las fotos de transformación'}</li>
              <li>{language === 'en' ? 'All barber schedules and time-off' : 'Todos los horarios y tiempo libre de barberos'}</li>
            </ul>
            <p style={{ fontSize: '14px', marginBottom: '1.5rem', fontWeight: '600' }}>
              {language === 'en'
                ? 'This will NOT delete: barbers, services, products, or shop settings.'
                : 'Esto NO eliminará: barberos, servicios, productos o configuración de la tienda.'}
            </p>
            <p style={{ fontSize: '14px', marginBottom: '1rem', fontWeight: '600' }}>
              {language === 'en' ? 'Type RESET to confirm:' : 'Escribe RESET para confirmar:'}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="RESET"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '1.5rem',
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleting}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={deleting || deleteConfirmText !== 'RESET'}
                style={{
                  padding: '10px 24px',
                  backgroundColor: deleting || deleteConfirmText !== 'RESET' ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting || deleteConfirmText !== 'RESET' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {deleting
                  ? language === 'en'
                    ? 'Deleting...'
                    : 'Eliminando...'
                  : language === 'en'
                  ? 'Delete All Data'
                  : 'Eliminar Todos los Datos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
