import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import PaymentStatusBadge from '../components/PaymentStatusBadge';

type AppointmentWithDetails = {
  id: string;
  scheduled_start: string;
  status: string;
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'partial' | null;
  services_total: number;
  tip_amount: number;
  service_due_to_barber: number;
  client: { first_name: string; last_name: string };
  service: { name_en: string; name_es: string };
};

type EarningsSummary = {
  servicesRevenue: number;
  tips: number;
  commission: number;
};

export default function BarberToday() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userData && userData.role === 'BARBER' && userData.active === false) {
      return;
    }
    loadAppointments();
  }, [userData]);

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
          payment_status,
          services_total,
          tip_amount,
          service_due_to_barber,
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
        payment_status: apt.payment_status as 'paid' | 'unpaid' | 'refunded' | 'partial' | null,
        services_total: Number(apt.services_total || 0),
        tip_amount: Number(apt.tip_amount || 0),
        service_due_to_barber: Number(apt.service_due_to_barber || 0),
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

  const calculateEarnings = (): EarningsSummary => {
    const completedAppts = appointments.filter(apt => apt.status === 'completed');

    return completedAppts.reduce(
      (acc, apt) => ({
        servicesRevenue: acc.servicesRevenue + apt.services_total,
        tips: acc.tips + apt.tip_amount,
        commission: acc.commission + apt.service_due_to_barber,
      }),
      { servicesRevenue: 0, tips: 0, commission: 0 }
    );
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

  if (userData && userData.role === 'BARBER' && userData.active === false) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '3rem 2rem', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f44336' }}>
              {language === 'en' ? 'Account Inactive' : 'Cuenta Inactiva'}
            </h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
              {language === 'en'
                ? 'Your account has been deactivated. Please contact the shop owner for more information.'
                : 'Tu cuenta ha sido desactivada. Por favor contacta al dueño de la tienda para más información.'}
            </p>
            <button
              onClick={signOut}
              style={{
                padding: '12px 32px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              {language === 'en' ? 'Logout' : 'Cerrar Sesión'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const earnings = calculateEarnings();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t.today}</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>{formatDate()}</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Services Revenue' : 'Ingresos por Servicios'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000' }}>
              ${earnings.servicesRevenue.toFixed(2)}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Tips' : 'Propinas'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000' }}>
              ${earnings.tips.toFixed(2)}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'My Commission' : 'Mi Comisión'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
              ${earnings.commission.toFixed(2)}
            </div>
          </div>
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>
                  {language === 'en' ? 'Payment' : 'Pago'}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    No appointments today
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr
                    key={apt.id}
                    onClick={() => navigate(`/barber/appointments/${apt.id}`)}
                    style={{
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
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
                      <PaymentStatusBadge status={apt.payment_status} size="small" />
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
