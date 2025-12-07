import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { getInventoryStatus } from '../lib/inventoryStatus';
import ClientHeader from '../components/ClientHeader';

type Product = {
  id: string;
  name_en: string;
  name_es: string;
  brand: string;
  category: string;
  price: number;
  retail_price: number;
  current_stock: number;
  low_stock_threshold: number | null;
  high_stock_threshold: number | null;
  image_url: string | null;
  active: boolean;
};

export default function ClientProducts() {
  const { language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .gt('current_stock', 0)
        .order('category', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || (language === 'en' ? 'Other' : 'Otro');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClientHeader />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          {language === 'en' ? 'Our Products' : 'Nuestros Productos'}
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem' }}>
          {language === 'en'
            ? 'Professional quality products available at our shop'
            : 'Productos de calidad profesional disponibles en nuestra tienda'}
        </p>

        <div style={{ backgroundColor: '#e7f3ff', color: '#004085', padding: '1rem', borderRadius: '8px', marginBottom: '3rem', textAlign: 'center' }}>
          {language === 'en'
            ? 'Ask your barber about these products at checkout.'
            : 'Pregunta a tu barbero sobre estos productos al pagar.'}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '18px', color: '#666' }}>
            {language === 'en' ? 'Loading products...' : 'Cargando productos...'}
          </div>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '18px', color: '#666' }}>
            {language === 'en' ? 'No products available at this time.' : 'No hay productos disponibles en este momento.'}
          </div>
        ) : (
          Object.keys(groupedProducts).map((category) => (
            <div key={category} style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '3px solid #e74c3c', paddingBottom: '0.5rem', display: 'inline-block' }}>
                {category}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {groupedProducts[category].map((product) => {
                  const inventoryStatus = getInventoryStatus(
                    product.current_stock || 0,
                    product.low_stock_threshold,
                    product.high_stock_threshold
                  );
                  const hasImage = product.image_url && !imageErrors[product.id];

                  return (
                    <div
                      key={product.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      {hasImage && (
                        <img
                          src={product.image_url!}
                          alt={language === 'es' ? product.name_es : product.name_en}
                          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          onError={() => {
                            setImageErrors(prev => ({ ...prev, [product.id]: true }));
                          }}
                        />
                      )}

                      <div style={{ padding: hasImage ? '1.5rem' : '2rem 1.5rem' }}>
                        <div
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: inventoryStatus.color,
                            backgroundColor: inventoryStatus.backgroundColor,
                          }}
                        >
                          {language === 'es' ? inventoryStatus.label.es : inventoryStatus.label.en}
                        </div>

                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {language === 'es' ? product.name_es : product.name_en}
                        </h3>

                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                          {product.brand}
                        </p>

                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c', marginTop: '1rem' }}>
                          ${(product.retail_price || product.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
