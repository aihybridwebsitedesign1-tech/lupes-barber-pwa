import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export default function OwnerEngage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
    loadClients();
  }, [userData, navigate]);

  const loadClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .eq('is_deleted', false)
        .order('first_name');

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleSend = async () => {
    if (!selectedClientId || !message.trim()) {
      alert(language === 'en' ? 'Please select a client and enter a message' : 'Por favor selecciona un cliente y escribe un mensaje');
      return;
    }

    setSending(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      if (!client) return;

      console.log('=== SIMULATED SMS SEND ===');
      console.log(`To: ${client.first_name} ${client.last_name} (${client.phone})`);
      console.log(`Message: ${message}`);
      console.log(`Sent by: ${userData?.name || 'Unknown'}`);
      console.log('==========================');

      alert(
        language === 'en'
          ? `SMS simulated! Check console. Message would be sent to ${client.first_name} ${client.last_name}.`
          : `SMS simulado! Verifica la consola. El mensaje se enviaría a ${client.first_name} ${client.last_name}.`
      );

      setMessage('');
      setSelectedClientId('');
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert(language === 'en' ? 'Error sending SMS' : 'Error al enviar SMS');
    } finally {
      setSending(false);
    }
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const filteredClients = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Engage (Beta)' : 'Engage (Beta)'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Send SMS messages to clients. This feature is only available to users with SMS permissions.'
              : 'Enviar mensajes SMS a los clientes. Esta función solo está disponible para usuarios con permisos de SMS.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', backgroundColor: '#fff3cd', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ffc107' }}>
            {language === 'en'
              ? 'TODO: Wire this to real SMS provider (Twilio or similar) at go-live. Currently messages are logged to console only.'
              : 'TODO: Conectar esto a un proveedor de SMS real (Twilio o similar) en el lanzamiento. Actualmente los mensajes solo se registran en la consola.'}
          </p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Search Client' : 'Buscar Cliente'}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'en' ? 'Search by name or phone...' : 'Buscar por nombre o teléfono...'}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Select Client' : 'Seleccionar Cliente'}
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="">
                {language === 'en' ? '-- Select a client --' : '-- Seleccionar un cliente --'}
              </option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name} ({client.phone})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Message' : 'Mensaje'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={160}
              placeholder={language === 'en' ? 'Type your message here...' : 'Escribe tu mensaje aquí...'}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem', textAlign: 'right' }}>
              {message.length} / 160
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSend}
              disabled={sending || !selectedClientId || !message.trim()}
              style={{
                padding: '10px 24px',
                backgroundColor: sending || !selectedClientId || !message.trim() ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: sending || !selectedClientId || !message.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {sending
                ? (language === 'en' ? 'Sending...' : 'Enviando...')
                : (language === 'en' ? 'Send Test SMS' : 'Enviar SMS de Prueba')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
