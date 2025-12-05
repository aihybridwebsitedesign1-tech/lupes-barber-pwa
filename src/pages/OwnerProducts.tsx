import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadImage, getUploadLimitText } from '../lib/uploadHelper';
import Header from '../components/Header';

type Product = {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  price: number;
  active: boolean;
  image_url: string | null;
  sku: string | null;
  brand: string | null;
  category: string | null;
  retail_price: number;
  supply_cost: number;
  current_stock: number;
  low_stock_threshold: number;
  high_stock_threshold: number;
};

export default function OwnerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameEs, setNameEs] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descEs, setDescEs] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [supplyCost, setSupplyCost] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [highStockThreshold, setHighStockThreshold] = useState('100');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setNameEn(editingProduct.name_en);
      setNameEs(editingProduct.name_es);
      setDescEn(editingProduct.description_en || '');
      setDescEs(editingProduct.description_es || '');
      setPrice(String(editingProduct.price));
      setImageUrl(editingProduct.image_url || '');
      setActive(editingProduct.active);
      setSku(editingProduct.sku || '');
      setBrand(editingProduct.brand || '');
      setCategory(editingProduct.category || '');
      setRetailPrice(String(editingProduct.retail_price || ''));
      setSupplyCost(String(editingProduct.supply_cost || ''));
      setCurrentStock(String(editingProduct.current_stock ?? ''));
      setLowStockThreshold(String(editingProduct.low_stock_threshold || 5));
      setHighStockThreshold(String(editingProduct.high_stock_threshold || 100));
    }
  }, [editingProduct]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name_en');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setNameEn('');
    setNameEs('');
    setDescEn('');
    setDescEs('');
    setPrice('');
    setImageUrl('');
    setActive(true);
    setSku('');
    setBrand('');
    setCategory('');
    setRetailPrice('');
    setSupplyCost('');
    setCurrentStock('');
    setLowStockThreshold('5');
    setHighStockThreshold('100');
    setSelectedFile(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedFile(null);
  };

  const handleImageUpload = async () => {
    if (!selectedFile) {
      alert(language === 'en' ? 'Please select a file first' : 'Por favor selecciona un archivo primero');
      return;
    }

    setUploading(true);
    try {
      const fileId = editingProduct?.id || crypto.randomUUID();
      const result = await uploadImage(selectedFile, 'product-images', `products/${fileId}`);

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
      if (imageUrl && editingProduct?.id) {
        const imagePath = imageUrl.split('/').pop();
        if (imagePath) {
          await supabase.storage.from('product-images').remove([`products/${editingProduct.id}/${imagePath}`]);
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

  const handleSave = async () => {
    if (!nameEn || !price) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'Por favor completa todos los campos requeridos');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert(language === 'en' ? 'Price must be a valid number' : 'El precio debe ser un número válido');
      return;
    }

    const retailPriceNum = retailPrice ? parseFloat(retailPrice) : 0;
    const supplyCostNum = supplyCost ? parseFloat(supplyCost) : 0;
    const currentStockNum = currentStock ? parseInt(currentStock) : 0;
    const lowThresholdNum = lowStockThreshold ? parseInt(lowStockThreshold) : 5;
    const highThresholdNum = highStockThreshold ? parseInt(highStockThreshold) : 100;

    if (retailPriceNum < 0 || supplyCostNum < 0 || currentStockNum < 0 || lowThresholdNum < 0 || highThresholdNum < 0) {
      alert(language === 'en' ? 'Numeric values must be ≥ 0' : 'Los valores numéricos deben ser ≥ 0');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name_en: nameEn,
        name_es: nameEs || nameEn,
        description_en: descEn || null,
        description_es: descEs || null,
        price: priceNum,
        image_url: imageUrl || null,
        active,
        sku: sku || null,
        brand: brand || null,
        category: category || null,
        retail_price: retailPriceNum,
        supply_cost: supplyCostNum,
        current_stock: currentStockNum,
        low_stock_threshold: lowThresholdNum,
        high_stock_threshold: highThresholdNum,
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }

      alert(language === 'en' ? 'Product saved successfully!' : '¡Producto guardado exitosamente!');
      closeModal();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(language === 'en' ? 'Error saving product' : 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingProduct) return;

    setDeleting(true);
    try {
      const { count, error: countError } = await supabase
        .from('appointment_products')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', editingProduct.id);

      if (countError) throw countError;

      if (count && count > 0) {
        alert(
          language === 'en'
            ? 'This product has been used in past appointments and cannot be deleted. You can deactivate it instead.'
            : 'Este producto ha sido usado en citas anteriores y no puede ser eliminado. Puedes desactivarlo en su lugar.'
        );
        setDeleting(false);
        return;
      }

      const confirmed = confirm(
        language === 'en'
          ? 'Are you sure you want to permanently delete this product? This cannot be undone.'
          : '¿Estás seguro de que quieres eliminar permanentemente este producto? Esto no se puede deshacer.'
      );

      if (!confirmed) {
        setDeleting(false);
        return;
      }

      if (editingProduct.image_url) {
        const imagePath = editingProduct.image_url.split('/').pop();
        if (imagePath) {
          try {
            await supabase.storage.from('product-images').remove([`products/${editingProduct.id}/${imagePath}`]);
          } catch (err) {
            console.error('Error deleting product image:', err);
          }
        }
      }

      const { error: deleteError } = await supabase.from('products').delete().eq('id', editingProduct.id);

      if (deleteError) throw deleteError;

      alert(language === 'en' ? 'Product deleted successfully!' : '¡Producto eliminado exitosamente!');
      closeModal();
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(language === 'en' ? 'Error deleting product' : 'Error al eliminar producto');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id);
      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
      alert(language === 'en' ? 'Error updating product' : 'Error al actualizar producto');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <p>{t.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {language === 'en' ? 'Products' : 'Productos'}
          </h2>
          <button
            onClick={openNewModal}
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
            {language === 'en' ? 'New Product' : 'Nuevo Producto'}
          </button>
        </div>

        {products.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {language === 'en' ? 'No products found. Create your first product!' : '¡No se encontraron productos. Crea tu primer producto!'}
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
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>
                        {language === 'en' ? product.name_en : product.name_es}
                      </div>
                      {language === 'es' && product.name_es !== product.name_en && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{product.name_en}</div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>
                      ${Number(product.price).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: product.active ? '#d4edda' : '#f8d7da',
                          color: product.active ? '#155724' : '#721c24',
                        }}
                      >
                        {product.active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditModal(product)}
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
                          onClick={() => handleToggleActive(product)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: product.active ? '#dc3545' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {product.active
                            ? language === 'en'
                              ? 'Deactivate'
                              : 'Desactivar'
                            : language === 'en'
                            ? 'Activate'
                            : 'Activar'}
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

      {showModal && (
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
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {editingProduct
                ? language === 'en'
                  ? 'Edit Product'
                  : 'Editar Producto'
                : language === 'en'
                ? 'New Product'
                : 'Nuevo Producto'}
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
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Description (Spanish)' : 'Descripción (Español)'}
              </label>
              <textarea
                value={descEs}
                onChange={(e) => setDescEs(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
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
              />
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
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                }}
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
                        cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {uploading
                        ? language === 'en'
                          ? 'Uploading...'
                          : 'Subiendo...'
                        : language === 'en'
                        ? 'Upload Image'
                        : 'Subir Imagen'}
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
                          style={{
                            width: '100%',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            marginBottom: '0.5rem',
                          }}
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
                      <div
                        style={{
                          width: '100%',
                          height: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#e9ecef',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#6c757d',
                          textAlign: 'center',
                          padding: '0.5rem',
                        }}
                      >
                        {language === 'en' ? 'No image yet' : 'Sin imagen'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', paddingTop: '1rem', borderTop: '2px solid #e5e5e5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
                {language === 'en' ? 'Inventory Details' : 'Detalles de Inventario'}
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'SKU' : 'SKU'}
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder={language === 'en' ? 'Product code' : 'Código de producto'}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Category' : 'Categoría'}
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., Hair Care' : 'ej., Cuidado del Cabello'}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                {language === 'en' ? 'Brand' : 'Marca'}
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={language === 'en' ? 'Brand name' : 'Nombre de marca'}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Retail Price ($)' : 'Precio Retail ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Supply Cost ($)' : 'Costo de Suministro ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplyCost}
                  onChange={(e) => setSupplyCost(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Current Stock' : 'Stock Actual'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Low Threshold' : 'Umbral Bajo'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="5"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'High Threshold' : 'Umbral Alto'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={highStockThreshold}
                  onChange={(e) => setHighStockThreshold(e.target.value)}
                  placeholder="100"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
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
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{t.active}</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
              <div>
                {editingProduct && (
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
                      ? language === 'en'
                        ? 'Deleting...'
                        : 'Eliminando...'
                      : language === 'en'
                      ? 'Delete Product'
                      : 'Eliminar Producto'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={closeModal}
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
      )}
    </div>
  );
}
