import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  category: string;
  base_price: number;
  duration_minutes: number;
  image_url: string | null;
  active: boolean;
};

export default function ClientServices() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || (language === 'en' ? 'Other' : 'Otro');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${language === 'en' ? 'min' : 'min'}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${language === 'en' ? 'hr' : 'h'}`;
    }
    return `${hours}${language === 'en' ? 'h' : 'h'} ${mins}${language === 'en' ? 'm' : 'm'}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClientHeader />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          {language === 'en' ? 'Our Services' : 'Nuestros Servicios'}
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem' }}>
          {language === 'en'
            ? 'Professional barbering services tailored to your needs'
            : 'Servicios profesionales de barbería adaptados a tus necesidades'}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '18px', color: '#666' }}>
            {language === 'en' ? 'Loading services...' : 'Cargando servicios...'}
          </div>
        ) : Object.keys(groupedServices).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💈</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.75rem' }}>
              {language === 'en' ? 'Services Coming Soon' : 'Servicios Próximamente'}
            </h3>
            <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {language === 'en'
                ? 'Services are being updated. Please check back soon or call the shop to book.'
                : 'Los servicios se están actualizando. Vuelve pronto o llama a la barbería para reservar.'}
            </p>
            <button
              onClick={() => navigate('/client/home')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              {language === 'en' ? 'Back to Home' : 'Volver al Inicio'}
            </button>
          </div>
        ) : (
          Object.keys(groupedServices).map((category) => (
            <div key={category} style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '3px solid #e74c3c', paddingBottom: '0.5rem', display: 'inline-block' }}>
                {category}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {groupedServices[category].map((service) => {
                  const hasImage = service.image_url && !imageErrors[service.id];

                  return (
                    <div
                      key={service.id}
                      onClick={() => navigate(`/client/book?service=${service.id}`)}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      {hasImage && (
                        <img
                          src={service.image_url!}
                          alt={language === 'es' ? service.name_es : service.name_en}
                          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          onError={() => {
                            setImageErrors(prev => ({ ...prev, [service.id]: true }));
                          }}
                        />
                      )}

                      <div style={{ padding: hasImage ? '1.5rem' : '2rem 1.5rem' }}>
                        <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          {language === 'es' ? service.name_es : service.name_en}
                        </h3>

                        {(service.description_en || service.description_es) && (
                          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                            {language === 'es' ? service.description_es : service.description_en}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c' }}>
                              ${(service.base_price || 0).toFixed(2)}
                            </div>
                            {service.duration_minutes && (
                              <div style={{ fontSize: '14px', color: '#999', marginTop: '0.25rem' }}>
                                {formatDuration(service.duration_minutes)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
