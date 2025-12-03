import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

export default function OwnerBarbers() {
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1rem' }}>{t.barbers}</h2>
        <p style={{ color: '#666' }}>Barbers management - To be implemented in later phase</p>
      </main>
    </div>
  );
}
