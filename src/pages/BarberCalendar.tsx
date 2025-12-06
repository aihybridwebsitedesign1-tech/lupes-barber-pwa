import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

type CalendarAppointment = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  payment_status: string | null;
  client: { first_name: string; last_name: string };
  service: { name_en: string; name_es: string };
};

export default function BarberCalendar() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      loadData();
    }
  }, [selectedDate, userData]);

  const loadData = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: appts, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_start,
          scheduled_end,
          status,
          payment_status,
          client:client_id (first_name, last_name),
          service:service_id (name_en, name_es)
        `)
        .eq('barber_id', userData.id)
        .gte('scheduled_start', weekStart.toISOString())
        .lt('scheduled_start', weekEnd.toISOString())
        .order('scheduled_start');

      if (error) throw error;

      const formattedAppts = (appts || []).map(apt => ({
        ...apt,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      }));

      setAppointments(formattedAppts);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekDays = () => {
    const start = getWeekStart(selectedDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${hour}:00`);
    }
    return slots;
  };

  const formatTimeSlot = (slot: string) => {
    const hour = parseInt(slot.split(':')[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const getAppointmentsForDayAndHour = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const start = new Date(apt.scheduled_start);
      const aptDate = start.toDateString();
      const aptHour = start.getHours();
      const aptMinutes = start.getMinutes();

      return aptDate === date.toDateString() &&
             aptHour === hour &&
             aptMinutes >= 0 && aptMinutes < 60;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
      case 'late_cancel':
        return '#ef4444';
      case 'no_show':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusOpacity = (status: string) => {
    if (status === 'cancelled' || status === 'no_show' || status === 'late_cancel') return 0.5;
    if (status === 'completed') return 0.8;
    return 1;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const today = () => {
    setSelectedDate(new Date());
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '1rem' }}>
            {language === 'en' ? 'My Calendar' : 'Mi Calendario'}
          </h1>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={previousWeek}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ← {language === 'en' ? 'Prev' : 'Ant'}
            </button>
            <button
              onClick={today}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Today' : 'Hoy'}
            </button>
            <button
              onClick={nextWeek}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {language === 'en' ? 'Next' : 'Sig'} →
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
            {language === 'en' ? 'Loading...' : 'Cargando...'}
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: '1200px' }}>
              <div style={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 10 }} />
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderBottom: '2px solid #e5e7eb',
                    textAlign: 'center',
                    fontWeight: '600',
                    backgroundColor: day.toDateString() === new Date().toDateString() ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '18px' }}>
                    {day.getDate()}
                  </div>
                </div>
              ))}

              {timeSlots.map((slot, slotIdx) => (
                <>
                  <div
                    key={`time-${slotIdx}`}
                    style={{
                      padding: '0.5rem',
                      fontSize: '12px',
                      color: '#666',
                      borderTop: '1px solid #e5e7eb',
                      textAlign: 'right',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'white',
                      zIndex: 10,
                    }}
                  >
                    {formatTimeSlot(slot)}
                  </div>
                  {weekDays.map((day, dayIdx) => {
                    const hour = parseInt(slot.split(':')[0]);
                    const dayAppts = getAppointmentsForDayAndHour(day, hour);

                    return (
                      <div
                        key={`cell-${slotIdx}-${dayIdx}`}
                        style={{
                          minHeight: '60px',
                          borderTop: '1px solid #e5e7eb',
                          borderLeft: dayIdx === 0 ? 'none' : '1px solid #f3f4f6',
                          padding: '4px',
                          position: 'relative',
                          backgroundColor: day.toDateString() === new Date().toDateString() ? '#fafcff' : 'white',
                        }}
                      >
                        {dayAppts.map(apt => (
                          <div
                            key={apt.id}
                            onClick={() => navigate(`/barber/appointments/${apt.id}`)}
                            style={{
                              backgroundColor: getStatusColor(apt.status),
                              opacity: getStatusOpacity(apt.status),
                              color: 'white',
                              padding: '4px 6px',
                              marginBottom: '2px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={`${apt.client.first_name} ${apt.client.last_name} - ${language === 'es' ? apt.service.name_es : apt.service.name_en}`}
                          >
                            <div style={{ fontWeight: '600' }}>
                              {formatTime(apt.scheduled_start)}
                            </div>
                            <div>
                              {apt.client.first_name} {apt.client.last_name.charAt(0)}.
                            </div>
                            {apt.payment_status === 'paid' && (
                              <div style={{ fontSize: '10px', opacity: 0.9 }}>💳</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
