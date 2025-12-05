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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSend = async () => {
    if (!(userData as any)?.can_send_sms) {
      showToast(
        language === 'en'
          ? "You don't have permission to send SMS."
          : "No tienes permiso para enviar SMS.",
        'error'
      );
      return;
    }

    if (!selectedClientId || !message.trim()) {
      showToast(
        language === 'en'
          ? 'Please select a client and enter a message'
          : 'Por favor selecciona un cliente y escribe un mensaje',
        'error'
      );
      return;
    }

    if (message.length > 160) {
      showToast(
        language === 'en'
          ? 'Message must be 160 characters or less'
          : 'El mensaje debe tener 160 caracteres o menos',
        'error'
      );
      return;
    }

    setSending(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      if (!client || !client.phone) {
        showToast(
          language === 'en'
            ? 'Client phone number not found'
            : 'No se encontró el número de teléfono del cliente',
          'error'
        );
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast(
          language === 'en'
            ? 'Session expired. Please log in again.'
            : 'Sesión expirada. Por favor inicia sesión de nuevo.',
          'error'
        );
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          phoneNumber: client.phone,
          message: message,
          source: 'engage_manual',
        }),
      });

      const result = await response.json();

      if (result.status === 'sent') {
        showToast(
          language === 'en'
            ? `SMS sent successfully to ${client.first_name} ${client.last_name}!`
            : `SMS enviado exitosamente a ${client.first_name} ${client.last_name}!`,
          'success'
        );
        setMessage('');
        setSelectedClientId('');
      } else if (result.status === 'disabled') {
        showToast(
          language === 'en'
            ? 'SMS sending is not configured yet. Please ask the owner to connect Twilio.'
            : 'El envío de SMS aún no está configurado. Por favor, pide al dueño que conecte Twilio.',
          'info'
        );
      } else if (result.status === 'error') {
        showToast(
          language === 'en'
            ? 'There was a problem sending this SMS. Please try again.'
            : 'Hubo un problema al enviar este SMS. Inténtalo de nuevo.',
          'error'
        );
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      showToast(
        language === 'en'
          ? 'Network error. Please check your connection and try again.'
          : 'Error de red. Por favor verifica tu conexión e inténtalo de nuevo.',
        'error'
      );
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

  const canSend = (userData as any)?.can_send_sms === true;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        {toast && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            backgroundColor: toast.type === 'success' ? '#d4edda' : toast.type === 'error' ? '#f8d7da' : '#d1ecf1',
            color: toast.type === 'success' ? '#155724' : toast.type === 'error' ? '#721c24' : '#0c5460',
            padding: '1rem 1.5rem',
            borderRadius: '6px',
            border: `1px solid ${toast.type === 'success' ? '#c3e6cb' : toast.type === 'error' ? '#f5c6cb' : '#bee5eb'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '400px',
          }}>
            {toast.message}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Engage' : 'Engage'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Send SMS messages to clients. SMS sending requires proper configuration.'
              : 'Enviar mensajes SMS a los clientes. El envío de SMS requiere la configuración adecuada.'}
          </p>

          {!canSend && (
            <div style={{
              fontSize: '14px',
              color: '#721c24',
              backgroundColor: '#f8d7da',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #f5c6cb',
              marginBottom: '1rem',
            }}>
              {language === 'en'
                ? "You don't have permission to send SMS. Please contact the shop owner."
                : "No tienes permiso para enviar SMS. Por favor contacta al dueño de la tienda."}
            </div>
          )}
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
              disabled={!canSend || sending || !selectedClientId || !message.trim()}
              style={{
                padding: '10px 24px',
                backgroundColor: !canSend || sending || !selectedClientId || !message.trim() ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !canSend || sending || !selectedClientId || !message.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {sending
                ? (language === 'en' ? 'Sending...' : 'Enviando...')
                : (language === 'en' ? 'Send SMS' : 'Enviar SMS')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
