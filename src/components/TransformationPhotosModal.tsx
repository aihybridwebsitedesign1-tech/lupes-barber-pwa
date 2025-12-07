import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage, getUploadLimitText } from '../lib/uploadHelper';

type Appointment = {
  id: string;
  barber_id: string;
  client_id: string;
  client_name: string;
  barber_name: string;
  scheduled_start: string;
};

type Props = {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TransformationPhotosModal({ appointment, onClose, onSuccess }: Props) {
  const { userData } = useAuth();
  const { language } = useLanguage();
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!afterFile) {
      setError(language === 'en' ? 'After photo is required' : 'La foto de después es obligatoria');
      return;
    }

    if (!userData) {
      setError(language === 'en' ? 'You must be logged in' : 'Debes iniciar sesión');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let beforeImageUrl: string | null = null;
      let afterImageUrl: string | null = null;

      const timestamp = Date.now();

      if (beforeFile) {
        const beforeResult = await uploadImage(
          beforeFile,
          'transformations',
          `${appointment.barber_id}/${appointment.id}/${timestamp}_before`
        );

        if (!beforeResult.success) {
          setError(beforeResult.error || (language === 'en' ? 'Error uploading before photo' : 'Error al subir foto de antes'));
          setSaving(false);
          return;
        }

        beforeImageUrl = beforeResult.url!;
      }

      const afterResult = await uploadImage(
        afterFile,
        'transformations',
        `${appointment.barber_id}/${appointment.id}/${timestamp}_after`
      );

      if (!afterResult.success) {
        setError(afterResult.error || (language === 'en' ? 'Error uploading after photo' : 'Error al subir foto de después'));
        setSaving(false);
        return;
      }

      afterImageUrl = afterResult.url!;

      const { error: insertError } = await supabase
        .from('transformation_photos')
        .insert({
          appointment_id: appointment.id,
          barber_id: appointment.barber_id,
          client_id: appointment.client_id,
          before_image_url: beforeImageUrl,
          after_image_url: afterImageUrl,
          created_by: userData.id,
          is_featured: false,
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving transformation photos:', err);
      setError(language === 'en' ? 'Error saving transformation photos' : 'Error al guardar fotos de transformación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
          {language === 'en' ? 'Add Transformation Photos' : 'Agregar Fotos de Transformación'}
        </h2>

        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
            {language === 'en' ? 'Appointment Details' : 'Detalles de la Cita'}
          </p>
          <p style={{ margin: '0', fontWeight: '500' }}>
            {appointment.client_name}
          </p>
          <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
            {language === 'en' ? 'Barber' : 'Barbero'}: {appointment.barber_name}
          </p>
          <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
            {new Date(appointment.scheduled_start).toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              {language === 'en' ? 'Before Photo (Optional)' : 'Foto de Antes (Opcional)'}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
            {beforeFile && (
              <div style={{ marginTop: '0.5rem' }}>
                <img
                  src={URL.createObjectURL(beforeFile)}
                  alt="Before preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '4px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              {language === 'en' ? 'After Photo (Required) *' : 'Foto de Después (Obligatoria) *'}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
            {afterFile && (
              <div style={{ marginTop: '0.5rem' }}>
                <img
                  src={URL.createObjectURL(afterFile)}
                  alt="After preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '4px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
            {getUploadLimitText(language)}
          </p>

          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1
              }}
            >
              {language === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving
                ? (language === 'en' ? 'Uploading...' : 'Subiendo...')
                : (language === 'en' ? 'Save Transformation' : 'Guardar Transformación')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
