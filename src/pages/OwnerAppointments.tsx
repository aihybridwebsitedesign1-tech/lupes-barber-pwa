import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import EditAppointmentModal from '../components/EditAppointmentModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import { exportToCSV } from '../lib/csvExport';

type Appointment = {
  id: string;
  scheduled_start: string;
  status: string;
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'partial' | null;
  payment_method: string | null;
  paid_at: string | null;
  client_name: string;
  barber_name: string;
  service_name: string;
};

export default function OwnerAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const { language, t } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, dateFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          status,
          payment_status,
          payment_method,
          paid_at,
          clients!inner(first_name, last_name),
          users(name),
          services(name_en, name_es)
        `)
        .order('scheduled_start', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'today') {
          const endOfToday = new Date(startOfToday);
          endOfToday.setDate(endOfToday.getDate() + 1);
          query = query.gte('scheduled_start', startOfToday.toISOString()).lt('scheduled_start', endOfToday.toISOString());
        } else if (dateFilter === 'next7') {
          const next7Days = new Date(startOfToday);
          next7Days.setDate(next7Days.getDate() + 7);
          query = query.gte('scheduled_start', startOfToday.toISOString()).lt('scheduled_start', next7Days.toISOString());
        } else if (dateFilter === 'last30') {
          const last30Days = new Date(startOfToday);
          last30Days.setDate(last30Days.getDate() - 30);
          query = query.gte('scheduled_start', last30Days.toISOString()).lte('scheduled_start', now.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setAppointments(
          data.map((apt: any) => ({
            id: apt.id,
            scheduled_start: apt.scheduled_start,
            status: apt.status,
            payment_status: apt.payment_status as 'paid' | 'unpaid' | 'refunded' | 'partial' | null,
            payment_method: apt.payment_method,
            paid_at: apt.paid_at,
            client_name: `${apt.clients.first_name} ${apt.clients.last_name}`,
            barber_name: apt.users?.name || (language === 'en' ? 'Unassigned' : 'Sin asignar'),
            service_name: language === 'en' ? apt.services.name_en : apt.services.name_es,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const canDelete = userData?.role === 'OWNER' || userData?.can_manage_appointments;
  const canEdit = userData?.role === 'OWNER' || userData?.can_manage_appointments;

  const handleDeleteClick = (apt: Appointment) => {
    if (!canDelete) {
      alert(language === 'en' ? 'You do not have permission to delete appointments' : 'No tienes permiso para eliminar citas');
      return;
    }
    setAppointmentToDelete(apt);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;

    setDeleting(appointmentToDelete.id);
    try {
      const { error: productsError } = await supabase
        .from('appointment_products')
        .delete()
        .eq('appointment_id', appointmentToDelete.id);
      if (productsError) throw productsError;

      const { data: photos, error: photosSelectError } = await supabase
        .from('transformation_photos')
        .select('id, image_url')
        .eq('appointment_id', appointmentToDelete.id);

      if (!photosSelectError && photos && photos.length > 0) {
        for (const photo of photos) {
          try {
            const imagePath = photo.image_url.split('/').pop();
            if (imagePath) {
              await supabase.storage
                .from('transformation-photos')
                .remove([`appointments/${appointmentToDelete.id}/${imagePath}`]);
            }
          } catch (storageErr) {
            console.warn('Could not delete photo file:', storageErr);
          }
        }

        const { error: photosDeleteError } = await supabase
          .from('transformation_photos')
          .delete()
          .eq('appointment_id', appointmentToDelete.id);
        if (photosDeleteError) throw photosDeleteError;
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToDelete.id);
      if (appointmentError) throw appointmentError;

      // Refetch appointments to ensure UI reflects actual DB state
      await loadAppointments();

      setShowDeleteConfirm(false);
      setAppointmentToDelete(null);

      alert(language === 'en' ? 'Appointment deleted successfully!' : '¡Cita eliminada exitosamente!');
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      alert(
        language === 'en'
          ? `Error deleting appointment: ${error.message || 'Unknown error'}`
          : `Error al eliminar cita: ${error.message || 'Error desconocido'}`
      );
    } finally {
      setDeleting(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportCSV = () => {
    const exportData = filteredAppointments.map((apt) => ({
      date_time: formatDateTime(apt.scheduled_start),
      barber: apt.barber_name,
      client: apt.client_name,
      service: apt.service_name,
      status: apt.status,
      payment_status: apt.payment_status || 'unpaid',
      payment_method: apt.payment_method || '',
      paid_at: apt.paid_at ? new Date(apt.paid_at).toLocaleDateString() : '',
    }));

    exportToCSV(exportData, 'appointments', {
      date_time: 'Date & Time',
      barber: 'Barber',
      client: 'Client',
      service: 'Service',
      status: 'Status',
      payment_status: 'Payment Status',
      payment_method: 'Payment Method',
      paid_at: 'Paid At',
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    const styles: { [key: string]: { bg: string; color: string } } = {
      completed: { bg: '#d4edda', color: '#155724' },
      booked: { bg: '#fff3cd', color: '#856404' },
      no_show: { bg: '#f8d7da', color: '#721c24' },
      cancelled: { bg: '#f8d7da', color: '#721c24' },
    };
    return styles[status] || { bg: '#e9ecef', color: '#495057' };
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.client_name.toLowerCase().includes(query) ||
      apt.barber_name.toLowerCase().includes(query) ||
      apt.status.toLowerCase().includes(query) ||
      apt.service_name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <p>{t.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{t.appointments}</h2>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '12px 24px',
              backgroundColor: '#fff',
              color: '#000',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {language === 'en' ? 'Export CSV' : 'Exportar CSV'}
          </button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Search' : 'Buscar'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search by client, barber, service, or status...' : 'Buscar por cliente, barbero, servicio o estado...'}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {t.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">{language === 'en' ? 'All Statuses' : 'Todos los Estados'}</option>
                <option value="booked">{language === 'en' ? 'Booked' : 'Reservada'}</option>
                <option value="completed">{language === 'en' ? 'Completed' : 'Completada'}</option>
                <option value="no_show">{language === 'en' ? 'No-Show' : 'Ausencia'}</option>
                <option value="cancelled">{language === 'en' ? 'Cancelled' : 'Cancelada'}</option>
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Date Range' : 'Rango de Fechas'}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">{language === 'en' ? 'All Time' : 'Todo el Tiempo'}</option>
                <option value="today">{language === 'en' ? 'Today' : 'Hoy'}</option>
                <option value="next7">{language === 'en' ? 'Next 7 Days' : 'Próximos 7 Días'}</option>
                <option value="last30">{language === 'en' ? 'Last 30 Days' : 'Últimos 30 Días'}</option>
              </select>
            </div>
          </div>
        </div>

        {searchQuery && (
          <div style={{ marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
            {language === 'en'
              ? `Showing ${filteredAppointments.length} of ${appointments.length} appointments`
              : `Mostrando ${filteredAppointments.length} de ${appointments.length} citas`}
          </div>
        )}

        {filteredAppointments.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'No appointments found' : 'No se encontraron citas'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Date/Time' : 'Fecha/Hora'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Client' : 'Cliente'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Service' : 'Servicio'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.status}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Payment' : 'Pago'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => {
                  const statusStyle = getStatusBadgeStyle(apt.status);
                  return (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{formatDateTime(apt.scheduled_start)}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.barber_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.client_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.service_name}</td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <PaymentStatusBadge status={apt.payment_status} size="small" />
                      </td>
                      <td style={{ padding: '1rem', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate(`/owner/appointments/${apt.id}`)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#000',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            {language === 'en' ? 'View' : 'Ver'}
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setEditingAppointmentId(apt.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              {language === 'en' ? 'Edit' : 'Editar'}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(apt)}
                              disabled={deleting === apt.id}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: deleting === apt.id ? '#ccc' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: deleting === apt.id ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              {deleting === apt.id
                                ? '...'
                                : language === 'en'
                                ? 'Delete'
                                : 'Eliminar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {editingAppointmentId && (
          <EditAppointmentModal
            appointmentId={editingAppointmentId}
            onClose={() => setEditingAppointmentId(null)}
            onSave={() => {
              setEditingAppointmentId(null);
              loadAppointments();
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
          onCancel={() => {
            setShowDeleteConfirm(false);
            setAppointmentToDelete(null);
          }}
          isLoading={deleting !== null}
        />
      </main>
    </div>
  );
}
