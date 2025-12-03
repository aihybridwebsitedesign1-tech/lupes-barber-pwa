import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadImage, getUploadLimitText } from '../lib/uploadHelper';

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
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleImageUpload = async () => {
    if (!selectedFile) {
      alert(language === 'en' ? 'Please select a file first' : 'Por favor selecciona un archivo primero');
      return;
    }

    setUploading(true);
    try {
      const fileId = service?.id || crypto.randomUUID();
      const result = await uploadImage(selectedFile, 'service-images', `services/${fileId}`);

      if (!result.success) {
        alert(language === 'en' ? result.error : result.error === 'File size must be less than 100MB' ? 'El tamaño del archivo debe ser menor a 100MB' : result.error);
        return;
      }

      setImageUrl(result.url!);
      setSelectedFile(null);
      alert(language === 'en' ? 'Image uploaded successfully!' : '¡Imagen subida exitosamente!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(language === 'en' ? 'Error uploading image' : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const confirmed = confirm(
      language === 'en'
        ? 'Remove this image? This cannot be undone.'
        : '¿Eliminar esta imagen? Esto no se puede deshacer.'
    );

    if (!confirmed) return;

    setUploading(true);
    try {
      if (imageUrl && service?.id) {
        const imagePath = imageUrl.split('/').pop();
        if (imagePath) {
          await supabase.storage.from('service-images').remove([`services/${service.id}/${imagePath}`]);
        }
      }

      setImageUrl('');
      alert(language === 'en' ? 'Image removed successfully!' : '¡Imagen eliminada exitosamente!');
    } catch (error) {
      console.error('Error removing image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;

    setDeleting(true);
    try {
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', service.id);

      if (countError) throw countError;

      if (count && count > 0) {
        alert(
          language === 'en'
            ? 'This service has been used in past appointments and cannot be deleted. You can deactivate it instead to hide it from booking.'
            : 'Este servicio ha sido usado en citas anteriores y no puede ser eliminado. Puedes desactivarlo en su lugar para ocultarlo de las reservas.'
        );
        setDeleting(false);
        return;
      }

      const confirmed = confirm(
        language === 'en'
          ? 'Are you sure you want to permanently delete this service? This cannot be undone.'
          : '¿Estás seguro de que quieres eliminar permanentemente este servicio? Esto no se puede deshacer.'
      );

      if (!confirmed) {
        setDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);

      if (deleteError) throw deleteError;

      alert(
        language === 'en'
          ? 'Service deleted successfully!'
          : '¡Servicio eliminado exitosamente!'
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(language === 'en' ? 'Error deleting service' : 'Error al eliminar servicio');
    } finally {
      setDeleting(false);
    }
  };

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
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}
          />

          <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '500' }}>
                  {language === 'en' ? 'Or upload from device:' : 'O subir desde dispositivo:'}
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '13px' }}
                />
                <button
                  onClick={handleImageUpload}
                  disabled={uploading || !selectedFile}
                  style={{
                    marginTop: '0.5rem',
                    padding: '6px 12px',
                    backgroundColor: uploading ? '#ccc' : '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (uploading || !selectedFile) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {uploading ? (language === 'en' ? 'Uploading...' : 'Subiendo...') : (language === 'en' ? 'Upload Image' : 'Subir Imagen')}
                </button>
                <div style={{ marginTop: '0.25rem', fontSize: '11px', color: '#666' }}>
                  {getUploadLimitText(language)}
                </div>
              </div>

              <div style={{ width: '120px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Preview:' : 'Vista previa:'}
                </div>
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '0.5rem' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      {language === 'en' ? 'Remove' : 'Eliminar'}
                    </button>
                  </>
                ) : (
                  <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '11px', color: '#6c757d', textAlign: 'center', padding: '0.5rem' }}>
                    {language === 'en' ? 'No image yet' : 'Sin imagen'}
                  </div>
                )}
              </div>
            </div>
          </div>
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

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div>
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: deleting ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {deleting
                  ? (language === 'en' ? 'Deleting...' : 'Eliminando...')
                  : (language === 'en' ? 'Delete Service' : 'Eliminar Servicio')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
    </div>
  );
}
