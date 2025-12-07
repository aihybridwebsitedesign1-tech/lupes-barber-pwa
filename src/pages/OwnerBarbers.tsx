import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import BarberScheduleModal from '../components/BarberScheduleModal';
import BarberTimeOffModal from '../components/BarberTimeOffModal';
import BarberPermissionsModal from '../components/BarberPermissionsModal';
import NewBarberModal from '../components/NewBarberModal';

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
  const [permissionsModalKey, setPermissionsModalKey] = useState(0);
  const [showNewBarberModal, setShowNewBarberModal] = useState(false);
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{t.barbers}</h2>
          <button
            onClick={() => setShowNewBarberModal(true)}
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
            {language === 'en' ? 'New Barber' : 'Nuevo Barbero'}
          </button>
        </div>

        {barbers.length === 0 ? (
          <p style={{ color: '#666' }}>
            {language === 'en' ? 'No barbers found' : 'No se encontraron barberos'}
          </p>
        ) : (
          <>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
                {language === 'en' ? 'Active Barbers' : 'Barberos Activos'} ({barbers.filter(b => b.active).length})
              </h3>
              {barbers.filter(b => b.active).length === 0 ? (
                <p style={{ color: '#666', marginBottom: '2rem' }}>
                  {language === 'en' ? 'No active barbers' : 'No hay barberos activos'}
                </p>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead style={{ backgroundColor: '#f9f9f9' }}>
                      <tr>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                          {t.name}
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                          {language === 'en' ? 'Actions' : 'Acciones'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {barbers.filter(b => b.active).map((barber) => (
                        <tr key={barber.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.name}</td>
                          <td style={{ padding: '1rem', fontSize: '14px' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => {
                                  setPermissionsModalKey(prev => prev + 1);
                                  setPermissionsBarber(barber);
                                }}
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
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
                {language === 'en' ? 'Inactive Barbers' : 'Barberos Inactivos'} ({barbers.filter(b => !b.active).length})
              </h3>
              {barbers.filter(b => !b.active).length === 0 ? (
                <p style={{ color: '#666' }}>
                  {language === 'en' ? 'No inactive barbers' : 'No hay barberos inactivos'}
                </p>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead style={{ backgroundColor: '#f9f9f9' }}>
                      <tr>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                          {t.name}
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                          {language === 'en' ? 'Actions' : 'Acciones'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {barbers.filter(b => !b.active).map((barber) => (
                        <tr key={barber.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '1rem', fontSize: '14px', color: '#999' }}>{barber.name}</td>
                          <td style={{ padding: '1rem', fontSize: '14px' }}>
                            <button
                              onClick={() => {
                                setPermissionsModalKey(prev => prev + 1);
                                setPermissionsBarber(barber);
                              }}
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          </>
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
          key={`permissions-${permissionsBarber.id}-${permissionsModalKey}`}
          barberId={permissionsBarber.id}
          onClose={() => setPermissionsBarber(null)}
          onSave={() => {
            setPermissionsBarber(null);
            loadBarbers();
          }}
        />
      )}

      {showNewBarberModal && (
        <NewBarberModal
          onClose={() => setShowNewBarberModal(false)}
          onSave={() => {
            setShowNewBarberModal(false);
            loadBarbers();
          }}
        />
      )}
    </div>
  );
}
