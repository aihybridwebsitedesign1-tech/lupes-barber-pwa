import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage, getUploadLimitText } from '../lib/uploadHelper';
import Header from '../components/Header';
import PaymentModal from '../components/PaymentModal';
import EditAppointmentModal from '../components/EditAppointmentModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';

type Appointment = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  source: string | null;
  actual_duration_minutes: number | null;
  services_total: number;
  products_total: number;
  tax_amount: number;
  tip_amount: number;
  processing_fee_rate: number | null;
  processing_fee_amount: number;
  total_charged: number;
  net_revenue: number;
  payment_method: string | null;
  paid_at: string | null;
  completed_at: string | null;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    language: string;
  };
  barber: {
    id: string;
    name: string;
  } | null;
  service: {
    id: string;
    name_en: string;
    name_es: string;
    duration_minutes: number;
  };
};

type AppointmentProduct = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
};

type Product = {
  id: string;
  name_en: string;
  name_es: string;
  price: number;
};

type TransformationPhoto = {
  id: string;
  image_url: string;
  type: string | null;
  notes: string | null;
};

export default function AppointmentDetail() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user, userData } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentProducts, setAppointmentProducts] = useState<AppointmentProduct[]>([]);
  const [photos, setPhotos] = useState<TransformationPhoto[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [actualDuration, setActualDuration] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [_notifications, setNotifications] = useState<Array<{ notification_type: string; status: string; created_at: string }>>([]);

  useEffect(() => {
    if (appointmentId) {
      loadAppointmentData();
    }
  }, [appointmentId]);

  const loadAppointmentData = async () => {
    try {
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients!inner(id, first_name, last_name, phone, language),
          users(id, name),
          services(id, name_en, name_es, duration_minutes)
        `)
        .eq('id', appointmentId)
        .single();

      if (aptError) throw aptError;

      if (aptData) {
        setAppointment({
          id: aptData.id,
          scheduled_start: aptData.scheduled_start,
          scheduled_end: aptData.scheduled_end,
          status: aptData.status,
          source: aptData.source || null,
          actual_duration_minutes: aptData.actual_duration_minutes,
          services_total: Number(aptData.services_total),
          products_total: Number(aptData.products_total),
          tax_amount: Number(aptData.tax_amount),
          tip_amount: Number(aptData.tip_amount),
          processing_fee_rate: aptData.processing_fee_rate ? Number(aptData.processing_fee_rate) : null,
          processing_fee_amount: Number(aptData.processing_fee_amount),
          total_charged: Number(aptData.total_charged),
          net_revenue: Number(aptData.net_revenue),
          payment_method: aptData.payment_method,
          paid_at: aptData.paid_at,
          completed_at: aptData.completed_at,
          client: aptData.clients,
          barber: aptData.users,
          service: aptData.services,
        });
        setActualDuration(aptData.actual_duration_minutes?.toString() || aptData.services.duration_minutes.toString());
      }

      const [productsRes, photosRes, availableProductsRes, notificationsRes] = await Promise.all([
        supabase
          .from('appointment_products')
          .select('*, products(name_en, name_es)')
          .eq('appointment_id', appointmentId),
        supabase
          .from('transformation_photos')
          .select('*')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('active', true).order('name_en'),
        supabase
          .from('client_messages')
          .select('notification_type, status, created_at')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (productsRes.data) {
        setAppointmentProducts(
          productsRes.data.map((p: any) => ({
            id: p.id,
            product_id: p.product_id,
            quantity: p.quantity,
            unit_price: Number(p.unit_price),
            product_name: language === 'en' ? p.products.name_en : p.products.name_es,
          }))
        );
      }

      if (photosRes.data) {
        setPhotos(photosRes.data);
      }

      if (availableProductsRes.data) {
        setAvailableProducts(availableProductsRes.data);
      }

      if (notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) return;

    const product = availableProducts.find((p) => p.id === selectedProduct);
    if (!product) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('appointment_products').insert({
        appointment_id: appointmentId,
        product_id: product.id,
        quantity: productQuantity,
        unit_price: product.price,
      });

      if (error) throw error;

      await recalculateProductsTotal();
      setSelectedProduct('');
      setProductQuantity(1);
      loadAppointmentData();
    } catch (error) {
      console.error('Error adding product:', error);
      alert(language === 'en' ? 'Error adding product' : 'Error al agregar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('appointment_products').delete().eq('id', productId);

      if (error) throw error;

      await recalculateProductsTotal();
      loadAppointmentData();
    } catch (error) {
      console.error('Error removing product:', error);
      alert(language === 'en' ? 'Error removing product' : 'Error al eliminar producto');
    } finally {
      setSaving(false);
    }
  };

  const recalculateProductsTotal = async () => {
    const { data } = await supabase
      .from('appointment_products')
      .select('quantity, unit_price')
      .eq('appointment_id', appointmentId);

    const total = (data || []).reduce((sum, p) => sum + p.quantity * Number(p.unit_price), 0);

    await supabase
      .from('appointments')
      .update({ products_total: total })
      .eq('id', appointmentId);
  };


  const handleMarkCompleted = async () => {
    if (!appointment) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          actual_duration_minutes: Number(actualDuration),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      alert(language === 'en' ? 'Appointment marked as completed!' : '¡Cita marcada como completada!');
      loadAppointmentData();
    } catch (error) {
      console.error('Error marking completed:', error);
      alert(language === 'en' ? 'Error marking completed' : 'Error al marcar como completada');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!confirm(language === 'en' ? 'Mark as no-show?' : '¿Marcar como ausencia?')) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('appointments').update({ status: 'no_show' }).eq('id', appointmentId);

      if (error) throw error;

      alert(language === 'en' ? 'Appointment marked as no-show!' : '¡Cita marcada como ausencia!');
      loadAppointmentData();
    } catch (error) {
      console.error('Error marking no-show:', error);
      alert(language === 'en' ? 'Error marking no-show' : 'Error al marcar ausencia');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    alert(language === 'en' ? 'Appointment cancelled!' : '¡Cita cancelada!');
    loadAppointmentData();
  };

  const handleRescheduleSuccess = () => {
    setShowRescheduleModal(false);
    alert(language === 'en' ? 'Appointment rescheduled!' : '¡Cita reprogramada!');
    loadAppointmentData();
  };

  const canDelete = userData?.role === 'OWNER' || userData?.can_manage_appointments;
  const canEditAppointment = userData?.role === 'OWNER' || userData?.can_manage_appointments;
  const canManagePayment = userData?.role === 'OWNER' || userData?.can_manage_appointments;

  const handleDeleteClick = () => {
    if (!canDelete) {
      alert(language === 'en' ? 'You do not have permission to delete appointments' : 'No tienes permiso para eliminar citas');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      const { error: productsError } = await supabase
        .from('appointment_products')
        .delete()
        .eq('appointment_id', appointmentId);
      if (productsError) throw productsError;

      const { data: photos, error: photosSelectError } = await supabase
        .from('transformation_photos')
        .select('id, image_url')
        .eq('appointment_id', appointmentId);

      if (!photosSelectError && photos && photos.length > 0) {
        for (const photo of photos) {
          try {
            const imagePath = photo.image_url.split('/').pop();
            if (imagePath) {
              await supabase.storage
                .from('transformation-photos')
                .remove([`appointments/${appointmentId}/${imagePath}`]);
            }
          } catch (storageErr) {
            console.warn('Could not delete photo file:', storageErr);
          }
        }

        const { error: photosDeleteError } = await supabase
          .from('transformation_photos')
          .delete()
          .eq('appointment_id', appointmentId);
        if (photosDeleteError) throw photosDeleteError;
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
      if (appointmentError) throw appointmentError;

      alert(language === 'en' ? 'Appointment deleted successfully!' : '¡Cita eliminada exitosamente!');
      navigate('/owner/appointments');
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      alert(
        language === 'en'
          ? `Error deleting appointment: ${error.message || 'Unknown error'}`
          : `Error al eliminar cita: ${error.message || 'Error desconocido'}`
      );
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appointment || !user) return;

    if (appointment.status !== 'completed') {
      alert(
        language === 'en'
          ? 'Photos can only be added to completed appointments'
          : 'Las fotos solo se pueden agregar a citas completadas'
      );
      return;
    }

    setUploading(true);
    try {
      const result = await uploadImage(file, 'transformation-photos', `appointments/${appointmentId}`);

      if (!result.success) {
        alert(language === 'en' ? result.error : result.error === 'File size must be less than 100MB' ? 'El tamaño del archivo debe ser menor a 100MB' : result.error);
        setUploading(false);
        return;
      }

      const { error: insertError } = await supabase.from('transformation_photos').insert({
        appointment_id: appointmentId,
        barber_id: appointment.barber?.id || user.id,
        client_id: appointment.client.id,
        image_url: result.url!,
        type: 'single',
      });

      if (insertError) throw insertError;

      alert(language === 'en' ? 'Photo uploaded successfully!' : '¡Foto subida exitosamente!');
      loadAppointmentData();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(language === 'en' ? 'Error uploading photo' : 'Error al subir foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: TransformationPhoto) => {
    const isOwner = userData?.role === 'OWNER';
    const isAssignedBarber = appointment?.barber?.id === userData?.id;

    if (!isOwner && !isAssignedBarber) {
      alert(
        language === 'en'
          ? 'Only the owner or assigned barber can delete photos'
          : 'Solo el propietario o el barbero asignado pueden eliminar fotos'
      );
      return;
    }

    const confirmed = confirm(
      language === 'en'
        ? 'Delete this photo? This cannot be undone.'
        : '¿Eliminar esta foto? Esto no se puede deshacer.'
    );

    if (!confirmed) return;

    try {
      const imagePath = photo.image_url.split('/').pop();
      if (imagePath) {
        try {
          await supabase.storage
            .from('transformation-photos')
            .remove([`appointments/${appointmentId}/${imagePath}`]);
        } catch (storageError) {
          console.warn('Storage deletion failed, continuing with DB deletion:', storageError);
        }
      }

      const { error: deleteError } = await supabase
        .from('transformation_photos')
        .delete()
        .eq('id', photo.id);

      if (deleteError) throw deleteError;

      setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== photo.id));

      alert(language === 'en' ? 'Photo deleted successfully!' : '¡Foto eliminada exitosamente!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert(language === 'en' ? 'Error deleting photo' : 'Error al eliminar foto');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <p>{t.loading}</p>
        </main>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <p>{language === 'en' ? 'Appointment not found' : 'Cita no encontrada'}</p>
        </main>
      </div>
    );
  }

  const canEdit = userData?.role === 'OWNER' || (userData?.role === 'BARBER' && appointment.barber?.id === user?.id);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={() => navigate(userData?.role === 'OWNER' ? '/owner/today' : '/barber/today')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← {language === 'en' ? 'Back' : 'Volver'}
          </button>
          {canEditAppointment && (
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {language === 'en' ? 'Edit Appointment' : 'Editar Cita'}
            </button>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {language === 'en' ? 'Appointment Details' : 'Detalles de Cita'}
            </h2>
            <span
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor:
                  appointment.status === 'completed'
                    ? '#d4edda'
                    : appointment.status === 'no_show'
                    ? '#f8d7da'
                    : appointment.status === 'cancelled'
                    ? '#f8d7da'
                    : '#fff3cd',
                color:
                  appointment.status === 'completed'
                    ? '#155724'
                    : appointment.status === 'no_show'
                    ? '#721c24'
                    : appointment.status === 'cancelled'
                    ? '#721c24'
                    : '#856404',
              }}
            >
              {appointment.status}
            </span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.5rem', color: '#666' }}>
              {formatDate(appointment.scheduled_start)}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem', color: '#666' }}>
                {language === 'en' ? 'Client' : 'Cliente'}
              </h4>
              <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.25rem' }}>
                {appointment.client.first_name} {appointment.client.last_name}
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                <a href={`tel:${appointment.client.phone}`} style={{ color: '#000', textDecoration: 'none' }}>
                  {appointment.client.phone}
                </a>
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>
                {language === 'en' ? 'Preferred language' : 'Idioma preferido'}: {appointment.client.language.toUpperCase()}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '0.5rem', color: '#666' }}>
                {language === 'en' ? 'Service & Barber' : 'Servicio y Barbero'}
              </h4>
              <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.25rem' }}>
                {language === 'en' ? appointment.service.name_en : appointment.service.name_es}
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {appointment.barber?.name || (language === 'en' ? 'Unassigned' : 'Sin asignar')}
              </p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
                {language === 'en' ? 'Scheduled duration' : 'Duración programada'}: {appointment.service.duration_minutes}{' '}
                {language === 'en' ? 'min' : 'min'}
              </p>
              {appointment.actual_duration_minutes && (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  {language === 'en' ? 'Actual duration' : 'Duración real'}: {appointment.actual_duration_minutes}{' '}
                  {language === 'en' ? 'min' : 'min'}
                </p>
              )}
            </div>
          </div>

          {canEdit && appointment.status === 'booked' && (
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Actual Duration (minutes)' : 'Duración Real (minutos)'}
                </label>
                <input
                  type="number"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleMarkCompleted}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {language === 'en' ? 'Mark Completed' : 'Marcar Completada'}
                </button>
                <button
                  onClick={handleMarkNoShow}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {language === 'en' ? 'Mark No-Show' : 'Marcar Ausencia'}
                </button>
                {userData?.role === 'OWNER' && (
                  <>
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      disabled={saving}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {language === 'en' ? 'Reschedule' : 'Reprogramar'}
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={saving}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      {t.cancel}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'Products Used/Sold' : 'Productos Usados/Vendidos'}
            </h3>

            {appointmentProducts.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead style={{ backgroundColor: '#f9f9f9' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Product' : 'Producto'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Quantity' : 'Cantidad'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Unit Price' : 'Precio Unit.'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                      {language === 'en' ? 'Total' : 'Total'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentProducts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontSize: '14px' }}>{p.product_name}</td>
                      <td style={{ padding: '0.75rem', fontSize: '14px' }}>{p.quantity}</td>
                      <td style={{ padding: '0.75rem', fontSize: '14px' }}>{formatCurrency(p.unit_price)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '14px', fontWeight: '500' }}>
                        {formatCurrency(p.quantity * p.unit_price)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                        <button
                          onClick={() => handleRemoveProduct(p.id)}
                          disabled={saving}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {language === 'en' ? 'Remove' : 'Quitar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Product' : 'Producto'}
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">{language === 'en' ? 'Select a product...' : 'Selecciona un producto...'}</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {language === 'en' ? p.name_en : p.name_es} - {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: '100px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Qty' : 'Cant.'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <button
                onClick={handleAddProduct}
                disabled={!selectedProduct || saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedProduct ? '#000' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedProduct ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                {language === 'en' ? 'Add' : 'Agregar'}
              </button>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '14px' }}>{language === 'en' ? 'Service' : 'Servicio'}:</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatCurrency(appointment.services_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '14px' }}>{language === 'en' ? 'Products' : 'Productos'}:</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatCurrency(appointment.products_total)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {appointment.paid_at
              ? language === 'en' ? 'Payment Summary' : 'Resumen de Pago'
              : language === 'en' ? 'Payment' : 'Pago'}
          </h3>

          {appointment.paid_at ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{language === 'en' ? 'Services' : 'Servicios'}:</span>
                  <span>{formatCurrency(appointment.services_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{language === 'en' ? 'Products' : 'Productos'}:</span>
                  <span>{formatCurrency(appointment.products_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{language === 'en' ? 'Tax' : 'Impuesto'}:</span>
                  <span>{formatCurrency(appointment.tax_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{language === 'en' ? 'Tip' : 'Propina'}:</span>
                  <span>{formatCurrency(appointment.tip_amount)}</span>
                </div>
                {appointment.processing_fee_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{language === 'en' ? 'Processing Fee' : 'Tarifa de Procesamiento'}:</span>
                    <span>{formatCurrency(appointment.processing_fee_amount)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    borderTop: '2px solid #000',
                    fontWeight: 'bold',
                    fontSize: '18px',
                  }}
                >
                  <span>{language === 'en' ? 'Total Charged' : 'Total Cobrado'}:</span>
                  <span>{formatCurrency(appointment.total_charged)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
                  <span>{language === 'en' ? 'Net Revenue' : 'Ingreso Neto'}:</span>
                  <span>{formatCurrency(appointment.net_revenue)}</span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '14px', color: '#666' }}>
                  {language === 'en' ? 'Payment Method' : 'Método de Pago'}:{' '}
                  {appointment.payment_method === 'cash'
                    ? language === 'en'
                      ? 'Cash'
                      : 'Efectivo'
                    : appointment.payment_method === 'card_in_shop'
                    ? language === 'en'
                      ? 'Card (in shop)'
                      : 'Tarjeta (en tienda)'
                    : language === 'en'
                    ? 'Card (online)'
                    : 'Tarjeta (en línea)'}
                </div>
              </div>

              {canManagePayment && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {language === 'en' ? 'Edit Payment' : 'Editar Pago'}
                </button>
              )}
            </>
          ) : (
            <>
              {canManagePayment ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {language === 'en' ? 'Record Payment' : 'Registrar Pago'}
                </button>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  {language === 'en' ? 'No payment recorded yet' : 'Aún no se ha registrado el pago'}
                </p>
              )}
            </>
          )}
        </div>

        {canEdit && appointment.status === 'completed' && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'Transformation Photos' : 'Fotos de Transformación'}
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#000',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {uploading
                  ? language === 'en'
                    ? 'Uploading...'
                    : 'Subiendo...'
                  : language === 'en'
                  ? 'Add Photo'
                  : 'Agregar Foto'}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleUploadPhoto}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {getUploadLimitText(language)}
              </div>
            </div>

            {photos.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>
                {language === 'en' ? 'No photos yet' : 'Sin fotos aún'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      position: 'relative',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <img
                      src={photo.image_url}
                      alt="Transformation"
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                      }}
                    />
                    {photo.notes && (
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>{photo.notes}</p>
                    )}
                    {(userData?.role === 'OWNER' || appointment?.barber?.id === userData?.id) && (
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        {language === 'en' ? 'Delete' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {userData?.role === 'OWNER' && appointment?.status !== 'completed' && !appointment?.paid_at && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              marginTop: '2rem',
              border: '2px solid #dc3545',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#dc3545' }}>
              {language === 'en' ? 'Danger Zone' : 'Zona de Peligro'}
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
              {language === 'en'
                ? 'Delete this appointment permanently. This cannot be undone.'
                : 'Eliminar esta cita permanentemente. Esto no se puede deshacer.'}
            </p>
            <button
              onClick={handleDeleteClick}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: saving ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {saving
                ? language === 'en'
                  ? 'Deleting...'
                  : 'Eliminando...'
                : language === 'en'
                ? 'Delete Appointment'
                : 'Eliminar Cita'}
            </button>
          </div>
        )}
      </main>

      {showEditModal && appointmentId && (
        <EditAppointmentModal
          appointmentId={appointmentId}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            loadAppointmentData();
          }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title={language === 'en' ? 'Delete Appointment' : 'Eliminar Cita'}
        description={
          language === 'en'
            ? 'This will permanently delete this appointment and all related data (products, photos). This cannot be undone.'
            : 'Esto eliminará permanentemente esta cita y todos los datos relacionados (productos, fotos). Esto no se puede deshacer.'
        }
        confirmWord="DELETE"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={saving}
      />

      {showPaymentModal && appointment && (
        <PaymentModal
          appointmentId={appointmentId!}
          servicesTotal={appointment.services_total}
          productsTotal={appointment.products_total}
          onClose={() => setShowPaymentModal(false)}
          onSave={() => {
            setShowPaymentModal(false);
            loadAppointmentData();
          }}
        />
      )}

      {showCancelModal && appointmentId && (
        <CancelAppointmentModal
          appointmentId={appointmentId}
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {showRescheduleModal && appointment && appointmentId && (
        <RescheduleAppointmentModal
          appointmentId={appointmentId}
          currentStart={appointment.scheduled_start}
          currentEnd={appointment.scheduled_end}
          barberId={appointment.barber?.id || null}
          serviceId={appointment.service.id}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
}
