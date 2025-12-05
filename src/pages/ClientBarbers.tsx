import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';

type Barber = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  profile_image_url: string | null;
  active: boolean;
};

export default function ClientBarbers() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, profile_image_url, active')
        .eq('role', 'BARBER')
        .eq('active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error loading barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleBookWithBarber = (barberId: string) => {
    navigate(`/client/book?barber=${barberId}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClientHeader />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          {language === 'en' ? 'Our Barbers' : 'Nuestros Barberos'}
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem' }}>
          {language === 'en'
            ? 'Meet our team of skilled professionals'
            : 'Conoce a nuestro equipo de profesionales capacitados'}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '18px', color: '#666' }}>
            {language === 'en' ? 'Loading barbers...' : 'Cargando barberos...'}
          </div>
        ) : barbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '18px', color: '#666' }}>
            {language === 'en' ? 'No barbers available at this time.' : 'No hay barberos disponibles en este momento.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {barbers.map((barber) => (
              <div
                key={barber.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => handleBookWithBarber(barber.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
              >
                {barber.profile_image_url ? (
                  <img
                    src={barber.profile_image_url}
                    alt={`${barber.first_name} ${barber.last_name}`}
                    style={{ width: '100%', height: '280px', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '280px',
                      background: 'linear-gradient(135deg, #333 0%, #000 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '64px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    {getInitials(barber.first_name, barber.last_name)}
                  </div>
                )}

                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {barber.first_name} {barber.last_name}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
                    {language === 'en' ? 'Professional Barber' : 'Barbero Profesional'}
                  </p>

                  <button
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c0392b';
                      e.stopPropagation();
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#e74c3c';
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookWithBarber(barber.id);
                    }}
                  >
                    {language === 'en' ? 'Book with ' : 'Reservar con '}{barber.first_name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
