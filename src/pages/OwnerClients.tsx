import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import NewClientModal from '../components/NewClientModal';
import EditClientModal from '../components/EditClientModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { exportToCSV } from '../lib/csvExport';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  language: 'en' | 'es';
  lastVisit: string | null;
  totalVisits: number;
};

export default function OwnerClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { language, t } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  const canManageClients = userData?.role === 'OWNER' || userData?.can_manage_clients;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('is_deleted', false)
        .order('first_name');

      if (clientsError) throw clientsError;

      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: appointments } = await supabase
            .from('appointments')
            .select('scheduled_start, status')
            .eq('client_id', client.id)
            .order('scheduled_start', { ascending: false });

          const completedAppointments = appointments?.filter(a => a.status === 'completed') || [];
          const lastVisit = completedAppointments[0]?.scheduled_start || null;

          return {
            ...client,
            lastVisit,
            totalVisits: appointments?.length || 0,
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const phone = client.phone.toLowerCase();
    return fullName.includes(searchLower) || phone.includes(searchLower);
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return language === 'en' ? 'Never' : 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (client: Client) => {
    setDeletingClientId(client.id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClientId) return;

    setDeleting(true);
    try {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_id', deletingClientId);

      if (appointmentsError) throw appointmentsError;

      if (appointments && appointments.length > 0) {
        const { error: softDeleteError } = await supabase
          .from('clients')
          .update({ is_deleted: true })
          .eq('id', deletingClientId);

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
          .eq('id', deletingClientId);

        if (hardDeleteError) throw hardDeleteError;

        alert(
          language === 'en' ? 'Client deleted successfully!' : '¡Cliente eliminado exitosamente!'
        );
      }

      setClients((prev) => prev.filter((c) => c.id !== deletingClientId));
      setShowDeleteConfirm(false);
      setDeletingClientId(null);
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert(
        language === 'en'
          ? `Error deleting client: ${error.message || 'Unknown error'}`
          : `Error al eliminar cliente: ${error.message || 'Error desconocido'}`
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredClients.map((client) => ({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      phone: client.phone || '',
      email: client.email || '',
      language: client.language || 'en',
      lastVisit: client.lastVisit || '',
      totalVisits: client.totalVisits || 0,
    }));

    exportToCSV(exportData, 'clients', {
      first_name: 'First Name',
      last_name: 'Last Name',
      phone: 'Phone',
      email: 'Email',
      language: 'Language',
      lastVisit: 'Last Visit',
      totalVisits: 'Total Visits',
    });
  };

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
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{t.clients}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            {canManageClients && (
              <button
                onClick={() => setShowNewClientModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {language === 'en' ? 'New Client' : 'Nuevo Cliente'}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder={language === 'en' ? 'Search by name or phone...' : 'Buscar por nombre o teléfono...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        {filteredClients.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {searchTerm
                ? (language === 'en' ? 'No clients found' : 'No se encontraron clientes')
                : (language === 'en' ? 'No clients yet' : 'Aún no hay clientes')}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Name' : 'Nombre'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Phone' : 'Teléfono'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Last Visit' : 'Última Visita'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Total Visits' : 'Total Visitas'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Language' : 'Idioma'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    style={{
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/owner/clients/${client.id}`)}
                  >
                    <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                      {client.first_name} {client.last_name}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {client.phone}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {formatDate(client.lastVisit)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {client.totalVisits}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: client.language === 'en' ? '#e3f2fd' : '#fff3e0',
                        color: client.language === 'en' ? '#1976d2' : '#f57c00',
                      }}>
                        {client.language.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/owner/clients/${client.id}`);
                          }}
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
                        {canManageClients && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClientId(client.id);
                              }}
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(client);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              {language === 'en' ? 'Delete' : 'Eliminar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {showNewClientModal && (
          <NewClientModal
            onClose={() => setShowNewClientModal(false)}
            onSave={() => {
              setShowNewClientModal(false);
              loadClients();
            }}
          />
        )}

        {editingClientId && (
          <EditClientModal
            clientId={editingClientId}
            onClose={() => setEditingClientId(null)}
            onSave={() => {
              setEditingClientId(null);
              loadClients();
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
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeletingClientId(null);
          }}
          isLoading={deleting}
        />
      </main>
    </div>
  );
}
