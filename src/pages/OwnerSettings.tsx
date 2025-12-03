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
  const [taxRate, setTaxRate] = useState('0');
  const [cardFeeRate, setCardFeeRate] = useState('4');
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
        .select('shop_hours, tax_rate, card_processing_fee_rate')
        .single();

      if (error) throw error;

      if (data?.shop_hours) {
        setShopHours(data.shop_hours);
      }
      if (data?.tax_rate !== null && data?.tax_rate !== undefined) {
        setTaxRate((Number(data.tax_rate) * 100).toFixed(2));
      }
      if (data?.card_processing_fee_rate !== null && data?.card_processing_fee_rate !== undefined) {
        setCardFeeRate((Number(data.card_processing_fee_rate) * 100).toFixed(2));
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
    const taxNum = parseFloat(taxRate);
    const cardFeeNum = parseFloat(cardFeeRate);

    if (isNaN(taxNum) || taxNum < 0 || taxNum > 25) {
      alert(language === 'en' ? 'Tax rate must be between 0 and 25%' : 'La tasa de impuesto debe estar entre 0 y 25%');
      return;
    }

    if (isNaN(cardFeeNum) || cardFeeNum < 0 || cardFeeNum > 15) {
      alert(language === 'en' ? 'Card fee must be between 0 and 15%' : 'La tarifa de tarjeta debe estar entre 0 y 15%');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shop_config')
        .update({
          shop_hours: shopHours,
          tax_rate: taxNum / 100,
          card_processing_fee_rate: cardFeeNum / 100,
        })
        .eq('id', (await supabase.from('shop_config').select('id').single()).data?.id);

      if (error) throw error;

      alert(language === 'en' ? 'Settings saved successfully!' : '¡Configuración guardada exitosamente!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(language === 'en' ? 'Error saving settings' : 'Error al guardar configuración');
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
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {language === 'en' ? 'Payment Settings' : 'Configuración de Pagos'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Sales Tax (%)' : 'Impuesto sobre Ventas (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="25"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Enter as percentage (e.g., 8.25 for 8.25%). Range: 0-25%'
                  : 'Ingresar como porcentaje (ej., 8.25 para 8.25%). Rango: 0-25%'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Card Processing Fee (%)' : 'Tarifa de Procesamiento de Tarjeta (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="15"
                value={cardFeeRate}
                onChange={(e) => setCardFeeRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                {language === 'en'
                  ? 'Enter as percentage (e.g., 4 for 4%). Range: 0-15%'
                  : 'Ingresar como porcentaje (ej., 4 para 4%). Rango: 0-15%'}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px', borderLeft: '4px solid #0066cc' }}>
              <div style={{ fontSize: '13px', color: '#004080' }}>
                {language === 'en'
                  ? 'These values are used when calculating payment totals for appointments.'
                  : 'Estos valores se utilizan al calcular los totales de pago de las citas.'}
              </div>
            </div>
          </div>
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
  );
}
