import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

type AcquisitionStat = {
  channel: string;
  count: number;
  percentage: number;
};

export default function OwnerClientsReport() {
  const [acquisitionStats, setAcquisitionStats] = useState<AcquisitionStat[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [regularClients, setRegularClients] = useState(0);
  const [lapsedClients, setLapsedClients] = useState(0);
  const [prospectiveClients, setProspectiveClients] = useState(0);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  const REGULAR_MIN_VISITS = 2;
  const LAPSED_DAYS = 90;

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
    loadClientStats();
  }, [userData, navigate]);

  const loadClientStats = async () => {
    setLoading(true);
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('acquisition_channel, visits_count, last_visit_at')
        .eq('is_deleted', false);

      if (!clients) return;

      const total = clients.length;
      const channelMap = new Map<string, number>();

      let regular = 0;
      let lapsed = 0;
      let prospective = 0;

      const now = new Date();

      clients.forEach((client) => {
        const channel = client.acquisition_channel || 'UNKNOWN';
        channelMap.set(channel, (channelMap.get(channel) || 0) + 1);

        const visitsCount = client.visits_count || 0;
        if (visitsCount === 0) {
          prospective++;
        } else if (visitsCount >= REGULAR_MIN_VISITS) {
          if (client.last_visit_at) {
            const daysSinceLastVisit = (now.getTime() - new Date(client.last_visit_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastVisit > LAPSED_DAYS) {
              lapsed++;
            } else {
              regular++;
            }
          } else {
            regular++;
          }
        }
      });

      const acqStats: AcquisitionStat[] = Array.from(channelMap.entries()).map(([channel, count]) => ({
        channel,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      })).sort((a, b) => b.count - a.count);

      setAcquisitionStats(acqStats);
      setTotalClients(total);
      setRegularClients(regular);
      setLapsedClients(lapsed);
      setProspectiveClients(prospective);
    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  const channelLabels: Record<string, { en: string; es: string }> = {
    BARBER_LINK: { en: 'Barber Link', es: 'Enlace del Barbero' },
    GOOGLE_ONLINE: { en: 'Google/Online', es: 'Google/En línea' },
    WALK_IN: { en: 'Walk-in', es: 'Sin cita' },
    REFERRAL: { en: 'Referral', es: 'Referido' },
    SOCIAL_MEDIA: { en: 'Social Media', es: 'Redes Sociales' },
    OTHER: { en: 'Other', es: 'Otro' },
    UNKNOWN: { en: 'Unknown', es: 'Desconocido' },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Clients Report (Beta)' : 'Reporte de Clientes (Beta)'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Acquisition channels and retention metrics for all active clients.'
              : 'Canales de adquisición y métricas de retención para todos los clientes activos.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
            {language === 'en'
              ? `TODO: Retention thresholds (${REGULAR_MIN_VISITS} visits, ${LAPSED_DAYS} days) will be configurable in Settings later.`
              : `TODO: Los umbrales de retención (${REGULAR_MIN_VISITS} visitas, ${LAPSED_DAYS} días) serán configurables en Configuración más tarde.`}
          </p>
        </div>

        {loading ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Total Clients' : 'Total de Clientes'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#000' }}>{totalClients}</div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Regular Clients' : 'Clientes Regulares'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>{regularClients}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '0.25rem' }}>
                  ({REGULAR_MIN_VISITS}+ {language === 'en' ? 'visits' : 'visitas'}, {language === 'en' ? 'active' : 'activo'})
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Lapsed Clients' : 'Clientes Inactivos'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>{lapsedClients}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '0.25rem' }}>
                  ({language === 'en' ? `>${LAPSED_DAYS} days` : `>${LAPSED_DAYS} días`})
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Prospective Clients' : 'Clientes Prospectivos'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6c757d' }}>{prospectiveClients}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '0.25rem' }}>
                  (0 {language === 'en' ? 'visits' : 'visitas'})
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem' }}>
                {language === 'en' ? 'Acquisition Channels' : 'Canales de Adquisición'}
              </h3>

              {acquisitionStats.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>
                  {language === 'en'
                    ? 'No acquisition data yet. Channels are tracked when appointments are completed.'
                    : 'Aún no hay datos de adquisición. Los canales se rastrean cuando las citas se completan.'}
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9f9f9' }}>
                      <tr>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                          {language === 'en' ? 'Channel' : 'Canal'}
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                          {language === 'en' ? 'Clients' : 'Clientes'}
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                          {language === 'en' ? 'Percentage' : 'Porcentaje'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {acquisitionStats.map((stat, idx) => (
                        <tr key={stat.channel} style={{ borderBottom: idx < acquisitionStats.length - 1 ? '1px solid #eee' : 'none' }}>
                          <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                            {channelLabels[stat.channel]?.[language] || stat.channel}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                            {stat.count}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              backgroundColor: '#e8f5e9',
                              color: '#2e7d32',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {stat.percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
