import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

export default function OwnerInventory() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
  }, [userData, navigate]);

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Inventory Management' : 'Gestión de Inventario'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Manage product stock levels, track inventory transactions, and receive low-stock alerts.'
              : 'Gestiona niveles de stock de productos, rastrea transacciones de inventario y recibe alertas de stock bajo.'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '3rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>
            {language === 'en' ? 'Coming Soon' : 'Próximamente'}
          </h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {language === 'en'
              ? 'Inventory management will include stock level display, manual adjustments, automatic SALE transactions, and low-stock alerts.'
              : 'La gestión de inventario incluirá visualización de niveles de stock, ajustes manuales, transacciones SALE automáticas y alertas de stock bajo.'}
          </p>
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
            {language === 'en'
              ? 'TODO: Display current stock in Products table, add Adjust Stock modal, create inventory transactions on product sales.'
              : 'TODO: Mostrar stock actual en tabla de Productos, agregar modal de Ajustar Stock, crear transacciones de inventario en ventas de productos.'}
          </p>
        </div>
      </main>
    </div>
  );
}
