import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import NewAppointmentModal from '../components/NewAppointmentModal';
import SetupChecklist from '../components/SetupChecklist';
import PaymentStatusBadge from '../components/PaymentStatusBadge';

type AppointmentWithDetails = {
  id: string;
  scheduled_start: string;
  status: string;
  source: string | null;
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'partial' | null;
  is_test: boolean;
  barber: { name: string } | null;
  client: { first_name: string; last_name: string };
  service: { name_en: string; name_es: string };
};

export default function OwnerToday() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('Loading appointments for today:', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString()
      });

      const { data: appts, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          status,
          source,
          services_total,
          payment_status,
          is_test,
          barber:barber_id (name),
          client:client_id (first_name, last_name),
          service:service_id (name_en, name_es)
        `)
        .gte('scheduled_start', today.toISOString())
        .lt('scheduled_start', tomorrow.toISOString())
        .order('scheduled_start', { ascending: true });

      if (error) {
        console.error('Error loading appointments:', error);
        throw error;
      }

      console.log('Loaded appointments:', appts);

      const formattedAppts = (appts || []).map(apt => ({
        id: apt.id,
        scheduled_start: apt.scheduled_start,
        status: apt.status,
        source: apt.source || null,
        payment_status: apt.payment_status as 'paid' | 'unpaid' | 'refunded' | 'partial' | null,
        is_test: apt.is_test || false,
        barber: Array.isArray(apt.barber) ? apt.barber[0] : apt.barber,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      }));

      setAppointments(formattedAppts);
      setTodayCount(formattedAppts.length);

      const revenue = (appts || [])
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.services_total || 0), 0);
      setTodayRevenue(revenue);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleAppointmentCreated = () => {
    setShowModal(false);
    loadData();
  };

  const getSourceBadge = (source: string | null) => {
    const sourceMap = {
      owner: {
        labelEn: 'Owner',
        labelEs: 'Dueño',
        color: '#e3f2fd',
        textColor: '#1565c0',
      },
      barber: {
        labelEn: 'Barber',
        labelEs: 'Barbero',
        color: '#f3e5f5',
        textColor: '#6a1b9a',
      },
      client_web: {
        labelEn: 'Online',
        labelEs: 'En línea',
        color: '#e8f5e9',
        textColor: '#2e7d32',
      },
      walk_in: {
        labelEn: 'Walk-In',
        labelEs: 'Sin cita',
        color: '#fff3e0',
        textColor: '#e65100',
      },
    };

    const defaultBadge = {
      labelEn: 'Unknown',
      labelEs: 'Desconocido',
      color: '#f5f5f5',
      textColor: '#666',
    };

    const badge = source ? sourceMap[source as keyof typeof sourceMap] || defaultBadge : defaultBadge;

    return (
      <span
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: badge.color,
          color: badge.textColor,
        }}
      >
        {language === 'en' ? badge.labelEn : badge.labelEs}
      </span>
    );
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

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <SetupChecklist />

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t.today}</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>{formatDate()}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>{t.todaysAppointments}</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{todayCount}</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>{t.todaysRevenue}</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>${todayRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{t.appointments}</h3>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {t.newAppointment}
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.time}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.barber}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.client}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.service}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                  {language === 'en' ? 'Source' : 'Origen'}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>{t.status}</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                  {language === 'en' ? 'Payment' : 'Pago'}
                </th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No appointments today
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
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
                    <td style={{ padding: '1rem', fontSize: '14px' }}>{formatTime(apt.scheduled_start)}</td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>{apt.barber?.name || t.unassigned}</td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'N/A'}
                      {apt.is_test && (
                        <span style={{
                          marginLeft: '0.5rem',
                          padding: '0.15rem 0.5rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          border: '1px solid #fcd34d'
                        }}>
                          TEST
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {apt.service ? (language === 'es' ? apt.service.name_es : apt.service.name_en) : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {getSourceBadge(apt.source)}
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
                      <PaymentStatusBadge status={apt.payment_status} size="small" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <NewAppointmentModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAppointmentCreated}
        />
      )}
    </div>
  );
}
