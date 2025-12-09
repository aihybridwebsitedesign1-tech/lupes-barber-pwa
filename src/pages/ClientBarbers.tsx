import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

type Barber = {
  id: string;
  name: string;
  public_display_name: string | null;
  bio: string | null;
  specialties: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  active: boolean;
  show_on_client_site: boolean;
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
        .select('id, name, public_display_name, bio, specialties, photo_url, instagram_url, tiktok_url, facebook_url, website_url, active, show_on_client_site')
        .eq('role', 'BARBER')
        .eq('active', true)
        .eq('show_on_client_site', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error loading barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (barber: Barber) => {
    return barber.public_display_name || barber.name;
  };

  const handleBookWithBarber = (barberId: string) => {
    navigate(`/client/book?barber=${barberId}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💈</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.75rem' }}>
              {language === 'en' ? 'No Barbers Available' : 'No Hay Barberos Disponibles'}
            </h3>
            <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {language === 'en'
                ? 'Our barbers are being added to the site. Please check back soon or call the shop to book.'
                : 'Nuestros barberos se están agregando al sitio. Vuelve pronto o llama a la barbería para reservar.'}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {barbers.map((barber) => {
              const displayName = getDisplayName(barber);
              const firstName = displayName.split(' ')[0];

              const hasInstagram = !!barber.instagram_url && barber.instagram_url.trim() !== '';
              const hasTiktok = !!barber.tiktok_url && barber.tiktok_url.trim() !== '';
              const hasFacebook = !!barber.facebook_url && barber.facebook_url.trim() !== '';
              const hasWebsite = !!barber.website_url && barber.website_url.trim() !== '';
              const hasSocialLinks = hasInstagram || hasTiktok || hasFacebook || hasWebsite;

              return (
                <div
                  key={barber.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {barber.photo_url ? (
                    <img
                      src={barber.photo_url}
                      alt={displayName}
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
                      {getInitials(displayName)}
                    </div>
                  )}

                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {displayName}
                    </h3>

                    {barber.specialties && (
                      <p style={{ fontSize: '14px', color: '#e74c3c', marginBottom: '0.75rem', fontWeight: '500' }}>
                        {barber.specialties}
                      </p>
                    )}

                    {barber.bio && (
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem', lineHeight: '1.5' }}>
                        {barber.bio}
                      </p>
                    )}

                    {!barber.specialties && !barber.bio && (
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
                        {language === 'en' ? 'Professional Barber' : 'Barbero Profesional'}
                      </p>
                    )}

                    {hasSocialLinks && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {hasInstagram && (
                          <a
                            href={barber.instagram_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: '#e74c3c', textDecoration: 'none', fontWeight: '500' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            📷 IG
                          </a>
                        )}
                        {hasTiktok && (
                          <a
                            href={barber.tiktok_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: '#e74c3c', textDecoration: 'none', fontWeight: '500' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            🎵 TikTok
                          </a>
                        )}
                        {hasFacebook && (
                          <a
                            href={barber.facebook_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: '#e74c3c', textDecoration: 'none', fontWeight: '500' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            👤 FB
                          </a>
                        )}
                        {hasWebsite && (
                          <a
                            href={barber.website_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: '#e74c3c', textDecoration: 'none', fontWeight: '500' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            🌐 {language === 'en' ? 'Web' : 'Sitio'}
                          </a>
                        )}
                      </div>
                    )}

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
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#e74c3c';
                      }}
                      onClick={() => handleBookWithBarber(barber.id)}
                    >
                      {language === 'en' ? `Book with ${firstName}` : `Reservar con ${firstName}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
