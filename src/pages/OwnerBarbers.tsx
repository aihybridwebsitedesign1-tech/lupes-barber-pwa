import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import BarberScheduleModal from '../components/BarberScheduleModal';
import BarberTimeOffModal from '../components/BarberTimeOffModal';
import BarberPermissionsModal from '../components/BarberPermissionsModal';

type Barber = {
  id: string;
  name: string;
  active: boolean;
};

export default function OwnerBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null);
  const [timeOffBarber, setTimeOffBarber] = useState<Barber | null>(null);
  const [permissionsBarber, setPermissionsBarber] = useState<Barber | null>(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, active')
        .eq('role', 'BARBER')
        .order('name');

      if (error) throw error;

      setBarbers(data || []);
    } catch (error) {
      console.error('Error loading barbers:', error);
    } finally {
      setLoading(false);
    }
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
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.barbers}</h2>

        {barbers.length === 0 ? (
          <p style={{ color: '#666' }}>
            {language === 'en' ? 'No barbers found' : 'No se encontraron barberos'}
          </p>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.name}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.status}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {barbers.map((barber) => (
                  <tr key={barber.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.name}</td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: barber.active ? '#d4edda' : '#f8d7da',
                          color: barber.active ? '#155724' : '#721c24',
                        }}
                      >
                        {barber.active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setPermissionsBarber(barber)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {language === 'en' ? 'Manage' : 'Gestionar'}
                        </button>
                        <button
                          onClick={() => setScheduleBarber(barber)}
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
                          {language === 'en' ? 'Edit Schedule' : 'Editar Horario'}
                        </button>
                        <button
                          onClick={() => setTimeOffBarber(barber)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {language === 'en' ? 'Time Off' : 'Tiempo Libre'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {scheduleBarber && (
        <BarberScheduleModal
          barberId={scheduleBarber.id}
          barberName={scheduleBarber.name}
          onClose={() => setScheduleBarber(null)}
          onSuccess={() => loadBarbers()}
        />
      )}

      {timeOffBarber && (
        <BarberTimeOffModal
          barberId={timeOffBarber.id}
          barberName={timeOffBarber.name}
          onClose={() => setTimeOffBarber(null)}
          onSuccess={() => loadBarbers()}
        />
      )}

      {permissionsBarber && (
        <BarberPermissionsModal
          barberId={permissionsBarber.id}
          onClose={() => setPermissionsBarber(null)}
          onSave={() => {
            setPermissionsBarber(null);
            loadBarbers();
          }}
        />
      )}
    </div>
  );
}
