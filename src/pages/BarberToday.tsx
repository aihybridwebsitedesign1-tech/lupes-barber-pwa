import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type AppointmentWithDetails = {
  id: string;
  scheduled_start: string;
  status: string;
  client: { first_name: string; last_name: string };
  service: { name_en: string; name_es: string };
};

export default function BarberToday() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const { userData } = useAuth();

  const loadAppointments = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appts, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          status,
          client:client_id (first_name, last_name),
          service:service_id (name_en, name_es)
        `)
        .eq('barber_id', userData.id)
        .gte('scheduled_start', today.toISOString())
        .lt('scheduled_start', tomorrow.toISOString())
        .order('scheduled_start', { ascending: true });

      if (error) throw error;

      const formattedAppts = (appts || []).map(apt => ({
        id: apt.id,
        scheduled_start: apt.scheduled_start,
        status: apt.status,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      }));

      setAppointments(formattedAppts);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [userData]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleMarkCompleted = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error updating appointment');
    }
  };

  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', appointmentId);

      if (error) throw error;
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error updating appointment');
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t.today}</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>{formatDate()}</p>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
          {t.todaysAppointments}
        </h3>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.time}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.client}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.service}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.status}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No appointments today
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>{formatTime(apt.scheduled_start)}</td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {apt.service ? (language === 'es' ? apt.service.name_es : apt.service.name_en) : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: apt.status === 'completed' ? '#d4edda' : apt.status === 'no_show' ? '#f8d7da' : '#d1ecf1',
                        color: apt.status === 'completed' ? '#155724' : apt.status === 'no_show' ? '#721c24' : '#0c5460'
                      }}>
                        {t[apt.status as keyof typeof t] || apt.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {apt.status === 'booked' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleMarkCompleted(apt.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {t.markCompleted}
                          </button>
                          <button
                            onClick={() => handleMarkNoShow(apt.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {t.markNoShow}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
