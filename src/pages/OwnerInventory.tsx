import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { getInventoryStatus } from '../lib/inventoryStatus';

type Product = {
  id: string;
  name_en: string;
  name_es: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  retail_price: number;
  supply_cost: number;
  current_stock: number;
  low_stock_threshold: number;
  high_stock_threshold: number;
  active: boolean;
};

export default function OwnerInventory() {
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

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
      .select('id, name_en, name_es, sku, category, brand, retail_price, supply_cost, current_stock, low_stock_threshold, high_stock_threshold, active')
      .eq('active', true)
      .order('name_en');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      console.log(`[OwnerInventory] Fetched ${data?.length || 0} active products`);
      setProducts(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (product: Product) => {
    const statusInfo = getInventoryStatus(
      product.current_stock ?? 0,
      product.low_stock_threshold,
      product.high_stock_threshold
    );

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor: statusInfo.backgroundColor,
          color: statusInfo.color,
        }}
      >
        {language === 'en' ? statusInfo.label.en : statusInfo.label.es}
      </span>
    );
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setNewQuantity('');
    setAdjustReason('');
    setError('');
    setSuccess('');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setNewQuantity('');
    setAdjustReason('');
    setError('');
    setSuccess('');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !userData) return;

    setSaving(true);
    setError('');
    setSuccess('');

    if (newQuantity.trim() === '') {
      setError(language === 'en' ? 'Please enter a quantity.' : 'Por favor ingresa una cantidad.');
      setSaving(false);
      return;
    }

    const parsedQuantity = parseInt(newQuantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0 || !Number.isInteger(Number(newQuantity))) {
      setError(
        language === 'en'
          ? 'Quantity must be a whole number greater than or equal to 0.'
          : 'La cantidad debe ser un número entero mayor o igual a 0.'
      );
      setSaving(false);
      return;
    }

    const currentStock = selectedProduct.current_stock ?? 0;
    const delta = parsedQuantity - currentStock;
    if (delta === 0) {
      setError(language === 'en' ? 'No change in quantity.' : 'Sin cambio en cantidad.');
      setSaving(false);
      return;
    }

    const { error: txError } = await supabase.from('inventory_transactions').insert({
      product_id: selectedProduct.id,
      type: 'ADJUSTMENT',
      quantity_change: delta,
      stock_after: parsedQuantity,
      reason: adjustReason || (language === 'en' ? 'Manual adjustment' : 'Ajuste manual'),
      created_by_user_id: userData.id,
    });

    if (txError) {
      console.error('Error creating transaction:', txError);
      setError(language === 'en' ? 'Failed to record transaction.' : 'Error al registrar transacción.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: parsedQuantity })
      .eq('id', selectedProduct.id);

    if (updateError) {
      console.error('Error updating product stock:', updateError);
      setError(language === 'en' ? 'Failed to update stock.' : 'Error al actualizar stock.');
      setSaving(false);
      return;
    }

    showToast(
      language === 'en' ? 'Inventory updated successfully!' : 'Inventario actualizado exitosamente!',
      'success'
    );
    setSaving(false);
    closeModal();
    fetchProducts();
  };

  if (!userData || userData.role !== 'OWNER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      {toast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#d4edda' : '#f8d7da',
          color: toast.type === 'success' ? '#155724' : '#721c24',
          padding: '1rem 1.5rem',
          borderRadius: '6px',
          border: `1px solid ${toast.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxWidth: '400px',
        }}>
          {toast.message}
        </div>
      )}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {language === 'en' ? 'Inventory Management' : 'Gestión de Inventario'}
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            {language === 'en'
              ? 'Monitor stock levels, adjust inventory, and track product availability.'
              : 'Monitorea niveles de stock, ajusta inventario y rastrea disponibilidad de productos.'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            {language === 'en' ? 'Loading products...' : 'Cargando productos...'}
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
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                      {language === 'en' ? 'Category' : 'Categoría'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                      {language === 'en' ? 'Brand' : 'Marca'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                      {language === 'en' ? 'Retail' : 'Precio'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                      {language === 'en' ? 'Cost' : 'Costo'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Stock' : 'Inventario'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Low' : 'Bajo'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'High' : 'Alto'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Status' : 'Estado'}
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                      {language === 'en' ? 'Actions' : 'Acciones'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const statusInfo = getInventoryStatus(
                      product.current_stock ?? 0,
                      product.low_stock_threshold,
                      product.high_stock_threshold
                    );
                    const rowBg = statusInfo.status === 'OUT' ? '#fff5f5' : statusInfo.status === 'LOW' ? '#fffef0' : 'white';
                    return (
                      <tr key={product.id} style={{ borderBottom: '1px solid #e5e5e5', backgroundColor: rowBg }}>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>
                          {language === 'en' ? product.name_en : product.name_es}
                        </td>
                        <td style={{ padding: '1rem', color: '#666' }}>{product.sku || '—'}</td>
                        <td style={{ padding: '1rem', color: '#666' }}>{product.category || '—'}</td>
                        <td style={{ padding: '1rem', color: '#666' }}>{product.brand || '—'}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>${(product.retail_price ?? 0).toFixed(2)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>${(product.supply_cost ?? 0).toFixed(2)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>{product.current_stock ?? 0}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>{product.low_stock_threshold ?? 5}</td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>{product.high_stock_threshold ?? 100}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{getStatusBadge(product)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => openAdjustModal(product)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#000',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            {language === 'en' ? 'Adjust' : 'Ajustar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {language === 'en' ? 'Adjust Inventory' : 'Ajustar Inventario'}
            </h3>

            {error && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  color: '#c00',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '14px',
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Product' : 'Producto'}
                </label>
                <input
                  type="text"
                  value={language === 'en' ? selectedProduct.name_en : selectedProduct.name_es}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: '#f9f9f9',
                    color: '#666',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Current Quantity' : 'Cantidad Actual'}
                </label>
                <input
                  type="text"
                  value={selectedProduct.current_stock ?? 0}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: '#f9f9f9',
                    color: '#666',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'New Quantity' : 'Nueva Cantidad'}
                  <span style={{ color: '#c00' }}>*</span>
                </label>
                <input
                  ref={quantityInputRef}
                  type="number"
                  min="0"
                  step="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder={language === 'en' ? 'Enter quantity' : 'Ingrese cantidad'}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'Reason (optional)' : 'Razón (opcional)'}
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., New shipment, Correction, Damage...' : 'ej., Nuevo envío, Corrección, Daño...'}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {language === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? (language === 'en' ? 'Saving...' : 'Guardando...') : language === 'en' ? 'Save' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
