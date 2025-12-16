import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ShopSocials {
  shop_instagram_url: string | null;
  shop_facebook_url: string | null;
  shop_tiktok_url: string | null;
  shop_website_url: string | null;
}

export default function Footer() {
  const { language } = useLanguage();
  const [socials, setSocials] = useState<ShopSocials | null>(null);

  useEffect(() => {
    const fetchSocials = async () => {
      const { data } = await supabase
        .from('shop_config')
        .select('shop_instagram_url, shop_facebook_url, shop_tiktok_url, shop_website_url')
        .single();
      if (data) setSocials(data);
    };
    fetchSocials();
  }, []);

  const iconStyle = {
    width: '24px',
    height: '24px',
    fill: 'white',
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  return (
    <footer style={{ backgroundColor: '#000', color: 'white', padding: '2rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        {(socials?.shop_instagram_url || socials?.shop_facebook_url || socials?.shop_tiktok_url || socials?.shop_website_url) && (
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
            {socials.shop_instagram_url && (
              <a
                href={socials.shop_instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <svg style={iconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            )}
            {socials.shop_facebook_url && (
              <a
                href={socials.shop_facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <svg style={iconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            )}
            {socials.shop_tiktok_url && (
              <a
                href={socials.shop_tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <svg style={iconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            )}
            {socials.shop_website_url && (
              <a
                href={socials.shop_website_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <svg style={iconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 21.949C6.016 21.449 2 17.151 2 12c0-.876.123-1.722.348-2.527l4.652 4.652v1c0 1.1.9 2 2 2v2.874zm6.95-2.949h-.95c-.55 0-1-.45-1-1v-2c0-.55-.45-1-1-1h-4v-2h2c.55 0 1-.45 1-1V9h2c1.1 0 2-.9 2-2v-.412c2.961 1.303 5 4.283 5 7.412 0 2.25-.9 4.3-2.35 5.8l-.7.2z"/>
                </svg>
              </a>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/terms"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
          </Link>
          <Link
            to="/privacy"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
          </Link>
        </div>
        <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
          &copy; {new Date().getFullYear()} Lupe's Barber Shop. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
        </p>
      </div>
    </footer>
  );
}
