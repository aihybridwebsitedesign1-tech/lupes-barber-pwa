import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

type Product = {
  id: string;
  name: string;
  sku: string | null;
  retail_price: number;
  supply_cost: number;
  current_stock: number;
  low_stock_threshold: number;
};

type StockStatus = 'OUT' | 'LOW' | 'OK';

export default function OwnerInventoryReports() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER') {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [userData, navigate]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, retail_price, supply_cost, current_stock, low_stock_threshold')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const getStockStatus = (product: Product): StockStatus => {
    const stock = product.current_stock ?? 0;
    const lowThreshold = product.low_stock_threshold ?? 5;

    if (stock <= 0) return 'OUT';
    if (stock <= lowThreshold) return 'LOW';
    return 'OK';
  };

  const getStatusBadge = (status: StockStatus) => {
    const styles: Record<StockStatus, { bg: string; text: string; label: string }> = {
      OUT: { bg: '#fee', text: '#c00', label: language === 'en' ? 'Out' : 'Agotado' },
      LOW: { bg: '#fffbeb', text: '#d97706', label: language === 'en' ? 'Low' : 'Bajo' },
      OK: { bg: '#f0f9ff', text: '#0369a1', label: language === 'en' ? 'OK' : 'OK' },
    };

    const style = styles[status];
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        {style.label}
      </span>
    );
  };

  const totalRetailValue = products.reduce((sum, p) => sum + (p.current_stock ?? 0) * (p.retail_price ?? 0), 0);
  const totalCostValue = products.reduce((sum, p) => sum + (p.current_stock ?? 0) * (p.supply_cost ?? 0), 0);
  const potentialMargin = totalRetailValue - totalCostValue;

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Inventory Reports (Beta)' : 'Reportes de Inventario (Beta)'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'View stock snapshots and valuation summaries.'
              : 'Ver resúmenes de stock y valoración.'}
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
            {language === 'en' ? 'Valuation Summary' : 'Resumen de Valoración'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Total Retail Value' : 'Valor Retail Total'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000' }}>
                ${totalRetailValue.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Total Cost Value' : 'Valor de Costo Total'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000' }}>
                ${totalCostValue.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                {language === 'en' ? 'Potential Gross Margin' : 'Margen Bruto Potencial'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: potentialMargin >= 0 ? '#059669' : '#dc2626' }}>
                ${potentialMargin.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem' }}>
            {language === 'en' ? 'Current Stock Snapshot' : 'Instantánea de Stock Actual'}
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            {language === 'en' ? 'Loading...' : 'Cargando...'}
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'No products found.' : 'No se encontraron productos.'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #e5e5e5' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                      {language === 'en' ? 'Product' : 'Producto'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Current Stock' : 'Stock Actual'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Status' : 'Estado'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                      {language === 'en' ? 'Retail Value' : 'Valor Retail'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                      {language === 'en' ? 'Cost Value' : 'Valor Costo'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product);
                    const rowBg = status === 'OUT' ? '#fff5f5' : status === 'LOW' ? '#fffef0' : 'white';
                    const retailVal = (product.current_stock ?? 0) * (product.retail_price ?? 0);
                    const costVal = (product.current_stock ?? 0) * (product.supply_cost ?? 0);
                    return (
                      <tr key={product.id} style={{ borderBottom: '1px solid #e5e5e5', backgroundColor: rowBg }}>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{product.name}</td>
                        <td style={{ padding: '1rem', color: '#666' }}>{product.sku || '—'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>{product.current_stock ?? 0}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{getStatusBadge(status)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>${retailVal.toFixed(2)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>${costVal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#fffbeb',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '4px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Future Enhancements' : 'Mejoras Futuras'}
          </p>
          <ul style={{ fontSize: '14px', color: '#92400e', marginLeft: '1.5rem' }}>
            <li>{language === 'en' ? 'CSV export for stock data' : 'Exportar datos de stock a CSV'}</li>
            <li>{language === 'en' ? 'Shrinkage tracking report' : 'Reporte de pérdidas de inventario'}</li>
            <li>{language === 'en' ? 'Product performance analytics' : 'Análisis de rendimiento de productos'}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
