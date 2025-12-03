import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import ServiceModal from '../components/ServiceModal';

type Service = {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  base_price: number;
  duration_minutes: number;
  active: boolean;
  image_url: string | null;
};

export default function OwnerServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name_en');

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: !service.active })
        .eq('id', service.id);

      if (error) throw error;

      await loadServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      alert(language === 'en' ? 'Error updating service' : 'Error al actualizar servicio');
    }
  };

  const formatPrice = (price: number) => {
    return `$${Number(price).toFixed(2)}`;
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{t.services}</h2>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {language === 'en' ? 'New Service' : 'Nuevo Servicio'}
          </button>
        </div>

        {services.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'No services found. Create your first service!' : 'No se encontraron servicios. ¡Crea tu primer servicio!'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9f9f9' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Name' : 'Nombre'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Duration' : 'Duración'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Price' : 'Precio'}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {t.status}
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    {language === 'en' ? 'Actions' : 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>
                        {language === 'en' ? service.name_en : service.name_es}
                      </div>
                      {language === 'es' && service.name_es !== service.name_en && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {service.name_en}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      {service.duration_minutes} {language === 'en' ? 'min' : 'min'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                      {formatPrice(service.base_price)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: service.active ? '#d4edda' : '#f8d7da',
                          color: service.active ? '#155724' : '#721c24',
                        }}
                      >
                        {service.active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setEditingService(service)}
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
                          {language === 'en' ? 'Edit' : 'Editar'}
                        </button>
                        <button
                          onClick={() => handleToggleActive(service)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: service.active ? '#dc3545' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {service.active
                            ? (language === 'en' ? 'Deactivate' : 'Desactivar')
                            : (language === 'en' ? 'Activate' : 'Activar')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {(showNewModal || editingService) && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setShowNewModal(false);
            setEditingService(null);
          }}
          onSuccess={() => {
            loadServices();
          }}
        />
      )}
    </div>
  );
}
