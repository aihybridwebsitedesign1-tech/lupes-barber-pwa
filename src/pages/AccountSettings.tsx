import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

export default function AccountSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const t = {
    accountSettings: language === 'en' ? 'Account Settings' : 'Configuración de Cuenta',
    loginEmail: language === 'en' ? 'Login Email' : 'Correo de Inicio de Sesión',
    updateEmail: language === 'en' ? 'Update Email' : 'Actualizar Correo',
    changePassword: language === 'en' ? 'Change Password' : 'Cambiar Contraseña',
    currentPassword: language === 'en' ? 'Current Password' : 'Contraseña Actual',
    newPassword: language === 'en' ? 'New Password' : 'Nueva Contraseña',
    confirmPassword: language === 'en' ? 'Confirm New Password' : 'Confirmar Nueva Contraseña',
    updatePassword: language === 'en' ? 'Update Password' : 'Actualizar Contraseña',
    emailUpdatedSuccess: language === 'en' ? 'Email updated successfully' : 'Correo actualizado exitosamente',
    passwordUpdatedSuccess: language === 'en' ? 'Password updated successfully' : 'Contraseña actualizada exitosamente',
    passwordsDontMatch: language === 'en' ? 'New passwords do not match' : 'Las nuevas contraseñas no coinciden',
    fillAllFields: language === 'en' ? 'Please fill in all fields' : 'Por favor complete todos los campos',
    invalidCurrentPassword: language === 'en' ? 'Current password is incorrect' : 'La contraseña actual es incorrecta',
    passwordTooShort: language === 'en' ? 'Password must be at least 6 characters' : 'La contraseña debe tener al menos 6 caracteres',
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess('');
    setEmailError('');
    setEmailLoading(true);

    try {
      if (!email || email.trim() === '') {
        throw new Error(t.fillAllFields);
      }

      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;

      setEmailSuccess(t.emailUpdatedSuccess);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setEmailError(errorMessage);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    setPasswordLoading(true);

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error(t.fillAllFields);
      }

      if (newPassword !== confirmPassword) {
        throw new Error(t.passwordsDontMatch);
      }

      if (newPassword.length < 6) {
        throw new Error(t.passwordTooShort);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error(t.invalidCurrentPassword);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess(t.passwordUpdatedSuccess);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setPasswordError(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#f5f5f5', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '2rem' }}>
            {t.accountSettings}
          </h1>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1.5rem' }}>
              {t.loginEmail}
            </h2>
            <form onSubmit={handleEmailUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.loginEmail}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>

              {emailSuccess && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '14px' }}>
                  {emailSuccess}
                </div>
              )}

              {emailError && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                  {emailError}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  opacity: emailLoading ? 0.6 : 1,
                }}
              >
                {emailLoading ? (language === 'en' ? 'Updating...' : 'Actualizando...') : t.updateEmail}
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1.5rem' }}>
              {t.changePassword}
            </h2>
            <form onSubmit={handlePasswordUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.currentPassword}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>

              {passwordSuccess && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '14px' }}>
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  opacity: passwordLoading ? 0.6 : 1,
                }}
              >
                {passwordLoading ? (language === 'en' ? 'Updating...' : 'Actualizando...') : t.updatePassword}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
