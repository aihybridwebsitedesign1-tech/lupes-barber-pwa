import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import EditClientModal from '../components/EditClientModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  language: 'en' | 'es';
};

type Note = {
  id: string;
  note: string;
  created_at: string;
  created_by_user_id: string;
  user_name: string;
};

type Appointment = {
  id: string;
  scheduled_start: string;
  status: string;
  barber_name: string;
  service_name: string;
  total_charged: number;
  photo_count: number;
};

type TransformationPhoto = {
  id: string;
  image_url: string;
  appointment_id: string;
  scheduled_start: string;
  service_name: string;
  barber_name: string;
};

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user, userData } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [photos, setPhotos] = useState<TransformationPhoto[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManageClients = userData?.role === 'OWNER' || userData?.can_manage_clients;

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const [clientRes, notesRes, appointmentsRes, photosRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase
          .from('client_notes')
          .select('*, users(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('*, users(name), services(name_en, name_es)')
          .eq('client_id', clientId)
          .order('scheduled_start', { ascending: false }),
        supabase
          .from('transformation_photos')
          .select('*, appointments(scheduled_start, service_id), services(name_en, name_es), users(name)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
      ]);

      if (clientRes.data) {
        setClient(clientRes.data);
        setEditedClient(clientRes.data);
      }

      if (notesRes.data) {
        setNotes(
          notesRes.data.map((n: any) => ({
            id: n.id,
            note: n.note,
            created_at: n.created_at,
            created_by_user_id: n.created_by_user_id,
            user_name: n.users?.name || 'Unknown',
          }))
        );
      }

      if (appointmentsRes.data) {
        const appointmentsWithPhotos = await Promise.all(
          appointmentsRes.data.map(async (apt: any) => {
            const { count } = await supabase
              .from('transformation_photos')
              .select('*', { count: 'exact', head: true })
              .eq('appointment_id', apt.id);

            return {
              id: apt.id,
              scheduled_start: apt.scheduled_start,
              status: apt.status,
              barber_name: apt.users?.name || 'Unassigned',
              service_name: language === 'en' ? apt.services?.name_en : apt.services?.name_es,
              total_charged: apt.total_charged || 0,
              photo_count: count || 0,
            };
          })
        );
        setAppointments(appointmentsWithPhotos);
      }

      if (photosRes.data) {
        setPhotos(
          photosRes.data.map((p: any) => ({
            id: p.id,
            image_url: p.image_url,
            appointment_id: p.appointment_id,
            scheduled_start: p.appointments?.scheduled_start,
            service_name: language === 'en' ? p.services?.name_en : p.services?.name_es,
            barber_name: p.users?.name || 'Unknown',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!editedClient) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: editedClient.first_name,
          last_name: editedClient.last_name,
          phone: editedClient.phone,
          email: editedClient.email,
          language: editedClient.language,
        })
        .eq('id', clientId);

      if (error) throw error;

      setClient(editedClient);
      setEditing(false);
      alert(language === 'en' ? 'Client updated successfully!' : '¡Cliente actualizado exitosamente!');
    } catch (error) {
      console.error('Error updating client:', error);
      alert(language === 'en' ? 'Error updating client' : 'Error al actualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('client_notes').insert({
        client_id: clientId,
        note: newNote,
        created_by_user_id: user.id,
      });

      if (error) throw error;

      setNewNote('');
      loadClientData();
    } catch (error) {
      console.error('Error adding note:', error);
      alert(language === 'en' ? 'Error adding note' : 'Error al agregar nota');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clientId) return;

    setDeleting(true);
    try {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_id', clientId);

      if (appointmentsError) throw appointmentsError;

      if (appointments && appointments.length > 0) {
        const { error: softDeleteError } = await supabase
          .from('clients')
          .update({ is_deleted: true })
          .eq('id', clientId);

        if (softDeleteError) throw softDeleteError;

        alert(
          language === 'en'
            ? 'Client marked as deleted. They still appear in historical data.'
            : 'Cliente marcado como eliminado. Aún aparece en datos históricos.'
        );
      } else {
        const { error: hardDeleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', clientId);

        if (hardDeleteError) throw hardDeleteError;

        alert(
          language === 'en' ? 'Client deleted successfully!' : '¡Cliente eliminado exitosamente!'
        );
      }

      navigate('/owner/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert(
        language === 'en'
          ? `Error deleting client: ${error.message || 'Unknown error'}`
          : `Error al eliminar cliente: ${error.message || 'Error desconocido'}`
      );
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const groupPhotosByAppointment = () => {
    const grouped: { [key: string]: TransformationPhoto[] } = {};
    photos.forEach((photo) => {
      const key = photo.appointment_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(photo);
    });
    return grouped;
  };

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

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <p>{language === 'en' ? 'Client not found' : 'Cliente no encontrado'}</p>
        </main>
      </div>
    );
  }

  const photosByAppointment = groupPhotosByAppointment();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <button
          onClick={() => navigate('/owner/clients')}
          style={{
            marginBottom: '1rem',
            padding: '8px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← {language === 'en' ? 'Back to Clients' : 'Volver a Clientes'}
        </button>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {language === 'en' ? 'Client Information' : 'Información del Cliente'}
            </h2>
            {canManageClients && !editing && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  {language === 'en' ? 'Edit Client' : 'Editar Cliente'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {language === 'en' ? 'Delete' : 'Eliminar'}
                </button>
              </div>
            )}
            {!canManageClients && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {language === 'en' ? 'Edit' : 'Editar'}
              </button>
            )}
            {editing && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditedClient(client);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f5f5f5',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveClient}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {saving ? t.loading : t.save}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'First Name' : 'Nombre'}
              </label>
              <input
                type="text"
                value={editedClient?.first_name || ''}
                onChange={(e) => setEditedClient({ ...editedClient!, first_name: e.target.value })}
                disabled={!editing}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: editing ? 'white' : '#f5f5f5',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Last Name' : 'Apellido'}
              </label>
              <input
                type="text"
                value={editedClient?.last_name || ''}
                onChange={(e) => setEditedClient({ ...editedClient!, last_name: e.target.value })}
                disabled={!editing}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: editing ? 'white' : '#f5f5f5',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Phone' : 'Teléfono'}
              </label>
              <input
                type="tel"
                value={editedClient?.phone || ''}
                onChange={(e) => setEditedClient({ ...editedClient!, phone: e.target.value })}
                disabled={!editing}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: editing ? 'white' : '#f5f5f5',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Email' : 'Correo'}
              </label>
              <input
                type="email"
                value={editedClient?.email || ''}
                onChange={(e) => setEditedClient({ ...editedClient!, email: e.target.value })}
                disabled={!editing}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: editing ? 'white' : '#f5f5f5',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Language' : 'Idioma'}
              </label>
              <select
                value={editedClient?.language || 'en'}
                onChange={(e) => setEditedClient({ ...editedClient!, language: e.target.value as 'en' | 'es' })}
                disabled={!editing}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: editing ? 'white' : '#f5f5f5',
                }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {language === 'en' ? 'Notes' : 'Notas'}
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={language === 'en' ? 'Add a note...' : 'Agregar una nota...'}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || saving}
              style={{
                padding: '8px 16px',
                backgroundColor: newNote.trim() ? '#000' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              {language === 'en' ? 'Add Note' : 'Agregar Nota'}
            </button>
          </div>

          {notes.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>
              {language === 'en' ? 'No notes yet' : 'Sin notas aún'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notes.map((note) => (
                <div key={note.id} style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '0.5rem' }}>{note.note}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {note.user_name} • {formatDate(note.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {language === 'en' ? 'Visit History' : 'Historial de Visitas'}
          </h3>

          {appointments.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>
              {language === 'en' ? 'No appointments yet' : 'Sin citas aún'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Date/Time' : 'Fecha/Hora'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Barber' : 'Barbero'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Service' : 'Servicio'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.status}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Total' : 'Total'}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Photos' : 'Fotos'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr
                    key={apt.id}
                    onClick={() => navigate(`/owner/appointments/${apt.id}`)}
                    style={{
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>{formatDate(apt.scheduled_start)}</td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>{apt.barber_name}</td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>{apt.service_name}</td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor:
                            apt.status === 'completed'
                              ? '#d4edda'
                              : apt.status === 'no_show'
                              ? '#f8d7da'
                              : '#fff3cd',
                          color:
                            apt.status === 'completed'
                              ? '#155724'
                              : apt.status === 'no_show'
                              ? '#721c24'
                              : '#856404',
                        }}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '14px', fontWeight: '500' }}>
                      {formatCurrency(apt.total_charged)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '14px' }}>{apt.photo_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {language === 'en' ? 'Transformation Gallery' : 'Galería de Transformaciones'}
          </h3>

          {Object.keys(photosByAppointment).length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>
              {language === 'en' ? 'No transformation photos yet' : 'Sin fotos de transformación aún'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Object.entries(photosByAppointment).map(([appointmentId, appointmentPhotos]) => {
                const firstPhoto = appointmentPhotos[0];
                return (
                  <div key={appointmentId}>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.75rem' }}>
                      {formatDate(firstPhoto.scheduled_start)} – {firstPhoto.service_name} – {firstPhoto.barber_name}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                      {appointmentPhotos.map((photo) => (
                        <div key={photo.id} style={{ position: 'relative' }}>
                          <img
                            src={photo.image_url}
                            alt="Transformation"
                            style={{
                              width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #ddd',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showEditModal && clientId && (
          <EditClientModal
            clientId={clientId}
            onClose={() => setShowEditModal(false)}
            onSave={() => {
              setShowEditModal(false);
              loadClientData();
            }}
          />
        )}

        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          title={language === 'en' ? 'Delete Client' : 'Eliminar Cliente'}
          description={
            language === 'en'
              ? 'Type DELETE to confirm. If the client has appointments, they will be marked as deleted but will remain in historical data.'
              : 'Escriba DELETE para confirmar. Si el cliente tiene citas, se marcará como eliminado pero permanecerá en los datos históricos.'
          }
          confirmWord="DELETE"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={deleting}
        />
      </main>
    </div>
  );
}
