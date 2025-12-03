import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

type ShopHours = {
  [key: string]: { open: string; close: string } | null;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function OwnerSettings() {
  const [shopHours, setShopHours] = useState<ShopHours>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadShopConfig();
  }, []);

  const loadShopConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_config')
        .select('shop_hours')
        .single();

      if (error) throw error;

      if (data?.shop_hours) {
        setShopHours(data.shop_hours);
      }
    } catch (error) {
      console.error('Error loading shop config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setShopHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { open: '10:00', close: '19:00' },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setShopHours((prev) => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [field]: value } : null,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shop_config')
        .update({ shop_hours: shopHours })
        .eq('id', (await supabase.from('shop_config').select('id').single()).data?.id);

      if (error) throw error;

      alert(language === 'en' ? 'Shop hours saved successfully!' : '¡Horario guardado exitosamente!');
    } catch (error) {
      console.error('Error saving shop hours:', error);
      alert(language === 'en' ? 'Error saving shop hours' : 'Error al guardar horario');
    } finally {
      setSaving(false);
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

  const dayNames = language === 'en' ? DAYS : DAYS_ES;

  return (
    <div>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '2rem' }}>
          {language === 'en' ? 'Shop Settings' : 'Configuración de la Tienda'}
        </h1>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {language === 'en' ? 'Shop Hours' : 'Horario de la Tienda'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const dayKey = String(dayIndex);
              const isOpen = shopHours[dayKey] !== null && shopHours[dayKey] !== undefined;

              return (
                <div
                  key={dayIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ width: '120px', fontWeight: '500' }}>
                    {dayNames[dayIndex]}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={() => handleDayToggle(dayKey)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {language === 'en' ? 'Open' : 'Abierto'}
                  </label>

                  {isOpen && shopHours[dayKey] && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '14px' }}>
                          {language === 'en' ? 'From:' : 'Desde:'}
                        </label>
                        <input
                          type="time"
                          value={shopHours[dayKey]!.open}
                          onChange={(e) => handleTimeChange(dayKey, 'open', e.target.value)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '14px' }}>
                          {language === 'en' ? 'To:' : 'Hasta:'}
                        </label>
                        <input
                          type="time"
                          value={shopHours[dayKey]!.close}
                          onChange={(e) => handleTimeChange(dayKey, 'close', e.target.value)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {!isOpen && (
                    <span style={{ color: '#999', fontSize: '14px' }}>
                      {language === 'en' ? 'Closed' : 'Cerrado'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              {saving ? t.loading : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
