import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

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

type Props = {
  service: Service | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ServiceModal({ service, onClose, onSuccess }: Props) {
  const [nameEn, setNameEn] = useState('');
  const [nameEs, setNameEs] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionEs, setDescriptionEs] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    if (service) {
      setNameEn(service.name_en);
      setNameEs(service.name_es);
      setDescriptionEn(service.description_en || '');
      setDescriptionEs(service.description_es || '');
      setPrice(String(service.base_price));
      setDuration(String(service.duration_minutes));
      setImageUrl(service.image_url || '');
      setActive(service.active);
    }
  }, [service]);

  const handleSave = async () => {
    if (!nameEn || !price || !duration) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'Por favor completa todos los campos requeridos');
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      alert(language === 'en' ? 'Duration must be greater than 0' : 'La duración debe ser mayor que 0');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert(language === 'en' ? 'Price must be a valid number' : 'El precio debe ser un número válido');
      return;
    }

    setSaving(true);
    try {
      const serviceData = {
        name_en: nameEn,
        name_es: nameEs || nameEn,
        description_en: descriptionEn || null,
        description_es: descriptionEs || null,
        base_price: priceNum,
        duration_minutes: durationNum,
        image_url: imageUrl || null,
        active,
      };

      if (service) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', service.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert(serviceData);

        if (error) throw error;
      }

      alert(
        language === 'en'
          ? 'Service saved successfully!'
          : '¡Servicio guardado exitosamente!'
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      alert(language === 'en' ? 'Error saving service' : 'Error al guardar servicio');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!service;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {isEdit
            ? (language === 'en' ? 'Edit Service' : 'Editar Servicio')
            : (language === 'en' ? 'New Service' : 'Nuevo Servicio')}
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Name (English)' : 'Nombre (Inglés)'} *
          </label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Name (Spanish)' : 'Nombre (Español)'}
          </label>
          <input
            type="text"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            placeholder={language === 'en' ? 'Optional - defaults to English name' : 'Opcional - por defecto nombre en inglés'}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Description (English)' : 'Descripción (Inglés)'}
          </label>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Description (Spanish)' : 'Descripción (Español)'}
          </label>
          <textarea
            value={descriptionEs}
            onChange={(e) => setDescriptionEs(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Price ($)' : 'Precio ($)'} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
              {language === 'en' ? 'Duration (minutes)' : 'Duración (minutos)'} *
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
            {language === 'en' ? 'Image URL' : 'URL de Imagen'}
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {t.active}
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {saving ? t.loading : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
