import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type ChecklistItem = {
  key: string;
  labelEn: string;
  labelEs: string;
  missing: boolean;
  linkTo: string;
};

export default function SetupChecklist() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    setLoading(true);
    const issues: ChecklistItem[] = [];

    try {
      const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('active', true)
        .limit(1);

      if (!services || services.length === 0) {
        issues.push({
          key: 'services',
          labelEn: 'No active services configured',
          labelEs: 'No hay servicios activos configurados',
          missing: true,
          linkTo: '/owner/services',
        });
      }

      const { data: barbers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'BARBER')
        .eq('active', true)
        .limit(1);

      if (!barbers || barbers.length === 0) {
        issues.push({
          key: 'barbers',
          labelEn: 'No active barbers configured',
          labelEs: 'No hay barberos activos configurados',
          missing: true,
          linkTo: '/owner/barbers',
        });
      }

      const { data: config } = await supabase
        .from('shop_config')
        .select('address, phone')
        .single();

      if (!config?.address || !config?.phone) {
        issues.push({
          key: 'contact',
          labelEn: 'Shop contact info incomplete',
          labelEs: 'Información de contacto incompleta',
          missing: true,
          linkTo: '/owner/settings',
        });
      }

      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('active', true)
        .limit(1);

      if (!products || products.length === 0) {
        issues.push({
          key: 'products',
          labelEn: 'No active products configured (optional)',
          labelEs: 'No hay productos activos (opcional)',
          missing: true,
          linkTo: '/owner/products',
        });
      }

      setItems(issues);
    } catch (error) {
      console.error('Error checking setup:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (items.length === 0) return null;

  const criticalItems = items.filter((i) => !i.key.includes('optional'));
  const optionalItems = items.filter((i) => i.key.includes('optional'));

  return (
    <div
      style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isCollapsed ? 0 : '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '20px' }}>⚙️</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
            {language === 'en' ? 'Setup Checklist' : 'Lista de Configuración'}
          </h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0.25rem',
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <p style={{ fontSize: '14px', color: '#856404', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Complete these items to ensure your shop is ready for clients:'
              : 'Completa estos elementos para asegurar que tu tienda esté lista para los clientes:'}
          </p>

          {criticalItems.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              {criticalItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    border: '1px solid #ffc107',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '14px', color: '#856404' }}>
                      {language === 'en' ? item.labelEn : item.labelEs}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(item.linkTo)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    {language === 'en' ? 'Fix' : 'Resolver'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {optionalItems.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#856404',
                  fontStyle: 'italic',
                  marginBottom: '0.5rem',
                }}
              >
                {language === 'en' ? 'Optional:' : 'Opcional:'}
              </p>
              {optionalItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '16px' }}>ℹ️</span>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {language === 'en' ? item.labelEn : item.labelEs}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(item.linkTo)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#e0e0e0',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {language === 'en' ? 'Setup' : 'Configurar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
