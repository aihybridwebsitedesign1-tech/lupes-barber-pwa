import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import ClientHeader from '../components/ClientHeader';
import BarberPole from '../components/BarberPole';
import Footer from '../components/Footer';

type ShopConfig = {
  shop_name: string;
  address: string;
  phone: string;
  shop_hours: {
    [key: string]: { open: string; close: string } | null;
  };
};

export default function ClientHome() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopConfig();
  }, []);

  const loadShopConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_config')
        .select('shop_name, address, phone, shop_hours')
        .single();

      if (error) throw error;
      if (data) setShopConfig(data);
    } catch (err) {
      console.error('Error loading shop config:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = () => {
    if (!shopConfig?.shop_hours) {
      return language === 'en'
        ? 'Mon-Sat: 10am - 7pm\nSun: Closed'
        : 'Lun-Sáb: 10am - 7pm\nDom: Cerrado';
    }

    const hours = shopConfig.shop_hours;
    const dayNames = {
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    };
    const names = language === 'en' ? dayNames.en : dayNames.es;

    const lines: string[] = [];
    let currentRange: { start: number; end: number; hours: string } | null = null;

    for (let i = 0; i <= 6; i++) {
      const dayHours = hours[String(i)];
      const hoursStr = dayHours
        ? `${dayHours.open} - ${dayHours.close}`
        : language === 'en'
        ? 'Closed'
        : 'Cerrado';

      if (
        currentRange &&
        currentRange.hours === hoursStr &&
        currentRange.end === i - 1
      ) {
        currentRange.end = i;
      } else {
        if (currentRange) {
          if (currentRange.start === currentRange.end) {
            lines.push(`${names[currentRange.start]}: ${currentRange.hours}`);
          } else {
            lines.push(
              `${names[currentRange.start]}-${names[currentRange.end]}: ${currentRange.hours}`
            );
          }
        }
        currentRange = { start: i, end: i, hours: hoursStr };
      }
    }

    if (currentRange) {
      if (currentRange.start === currentRange.end) {
        lines.push(`${names[currentRange.start]}: ${currentRange.hours}`);
      } else {
        lines.push(
          `${names[currentRange.start]}-${names[currentRange.end]}: ${currentRange.hours}`
        );
      }
    }

    return lines.join('\n');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <ClientHeader />

      <main>
        <section
          style={{
            background: 'linear-gradient(135deg, #000 0%, #333 100%)',
            color: 'white',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '1rem', lineHeight: '1.2' }}>
              {language === 'en' ? 'Welcome to Lupe\'s Barber Shop' : 'Bienvenido a Lupe\'s Barber Shop'}
            </h1>
            <p style={{ fontSize: '20px', marginBottom: '2rem', color: '#ddd', lineHeight: '1.6' }}>
              {language === 'en'
                ? 'Professional barbering services with a personal touch'
                : 'Servicios profesionales de barbería con un toque personal'}
            </p>
            <button
              onClick={() => navigate('/client/book')}
              style={{
                padding: '1rem 2.5rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
              }}
            >
              {language === 'en' ? 'Book Appointment' : 'Reservar Cita'}
            </button>
          </div>
        </section>

        <div style={{ maxWidth: '1200px', margin: '0 auto 2rem', padding: '0 2rem' }}>
          <div style={{ marginLeft: '-2rem', marginRight: '-2rem' }}>
            <BarberPole variant="banner" height={50} />
          </div>
        </div>

        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
            {language === 'en' ? 'Quick Info' : 'Información Rápida'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📍</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Location' : 'Ubicación'}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {loading
                  ? '...'
                  : shopConfig?.address ||
                    (language === 'en'
                      ? 'Visit us for details'
                      : 'Visítanos para detalles')}
              </p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📞</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Phone' : 'Teléfono'}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                {loading
                  ? '...'
                  : shopConfig?.phone ||
                    (language === 'en' ? 'Call for info' : 'Llama para info')}
              </p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🕐</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Hours' : 'Horario'}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {loading ? '...' : formatHours()}
              </p>
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: 'white', padding: '4rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
              {language === 'en' ? 'Why Choose Us' : 'Por Qué Elegirnos'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem' }}>✂️</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Expert Barbers' : 'Barberos Expertos'}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {language === 'en'
                    ? 'Skilled professionals with years of experience'
                    : 'Profesionales capacitados con años de experiencia'}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🌐</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Bilingual Staff' : 'Personal Bilingüe'}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {language === 'en'
                    ? 'We speak English and Spanish'
                    : 'Hablamos inglés y español'}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem' }}>📱</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Online Booking' : 'Reservas en Línea'}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {language === 'en'
                    ? 'Book your appointment anytime, anywhere'
                    : 'Reserva tu cita en cualquier momento, desde cualquier lugar'}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🚶</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Walk-Ins Welcome' : 'Se Aceptan Sin Cita'}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {language === 'en'
                    ? 'No appointment? No problem!'
                    : '¿Sin cita? ¡No hay problema!'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: '#000', color: 'white', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '1rem' }}>
              {language === 'en' ? 'Ready for a fresh cut?' : '¿Listo para un corte fresco?'}
            </h2>
            <p style={{ fontSize: '18px', marginBottom: '2rem', color: '#ddd' }}>
              {language === 'en'
                ? 'Book your appointment today and experience the difference'
                : 'Reserva tu cita hoy y experimenta la diferencia'}
            </p>
            <button
              onClick={() => navigate('/client/book')}
              style={{
                padding: '1rem 2.5rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)',
              }}
            >
              {language === 'en' ? 'Book Now' : 'Reservar Ahora'}
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
