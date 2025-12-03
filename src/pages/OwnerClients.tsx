import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

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
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1rem' }}>{t.clients}</h2>

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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
