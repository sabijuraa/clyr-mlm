// client/src/pages/admin/ProductsPage.jsx
import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock_quantity: '',
    sku: '',
    is_featured: false
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    try {
      const token = localStorage.getItem('token');
      const endpoint = editingProduct 
        ? `/api/admin/products/${editingProduct.id}/images`
        : '/api/admin/products/temp-images'; // Adjust as needed

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProductImages(data.images || data.uploadedFiles || []);
        alert('Bilder erfolgreich hochgeladen!');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Fehler beim Hochladen der Bilder');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (imageUrl) => {
    if (!editingProduct) {
      // Just remove from state if creating new product
      setProductImages(productImages.filter(img => img !== imageUrl));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/products/${editingProduct.id}/images`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl })
      });
      
      setProductImages(productImages.filter(img => img !== imageUrl));
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const method = editingProduct ? 'PUT' : 'POST';
    const endpoint = editingProduct 
      ? `/api/admin/products/${editingProduct.id}`
      : '/api/admin/products';

    // If creating new product, upload images first
    let uploadedImageUrls = productImages;
    if (!editingProduct && productImages.length === 0) {
      // No images yet, need to upload
      const fileInput = document.getElementById('product-images-create');
      if (fileInput?.files.length > 0) {
        const uploadFormData = new FormData();
        Array.from(fileInput.files).forEach(file => {
          uploadFormData.append('images', file);
        });

        // Add other product data
        Object.keys(formData).forEach(key => {
          uploadFormData.append(key, formData[key]);
        });

        try {
          const res = await fetch(endpoint, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: uploadFormData
          });

          if (res.ok) {
            alert('Produkt erfolgreich gespeichert!');
            setShowModal(false);
            fetchProducts();
            resetForm();
          }
        } catch (error) {
          console.error('Error saving product:', error);
          alert('Fehler beim Speichern');
        }
        return;
      }
    }

    // Normal save (update or create without new images)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Produkt erfolgreich gespeichert!');
        setShowModal(false);
        fetchProducts();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Fehler beim Speichern');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity,
      sku: product.sku || '',
      is_featured: product.is_featured || false
    });
    setProductImages(product.images || []);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Produkt wirklich löschen?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      stock_quantity: '',
      sku: '',
      is_featured: false
    });
    setProductImages([]);
    setEditingProduct(null);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Produkte</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Neues Produkt
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bild</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id}>
                <td className="px-6 py-4">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                      Kein Bild
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{product.name}</td>
                <td className="px-6 py-4">{product.category_name || '-'}</td>
                <td className="px-6 py-4">€{parseFloat(product.price).toFixed(2)}</td>
                <td className="px-6 py-4">{product.stock_quantity}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Images */}
                <div>
                  <label className="block text-sm font-medium mb-2">Produktbilder</label>
                  
                  {/* Image Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id={editingProduct ? 'product-images' : 'product-images-create'}
                      disabled={uploading}
                    />
                    <label
                      htmlFor={editingProduct ? 'product-images' : 'product-images-create'}
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {uploading ? 'Hochladen...' : '📁 Bilder auswählen'}
                    </label>
                    <p className="text-sm text-gray-600 mt-2">
                      PNG, JPG, WEBP bis zu 5MB. Mehrere Bilder möglich.
                    </p>
                  </div>

                  {/* Display Uploaded Images */}
                  {productImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {productImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img)}
                            className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          >
                            ✕
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              Hauptbild
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Produktname *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Preis (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Lagerbestand</label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Kategorie</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Keine Kategorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-medium mb-2">SKU / Artikelnummer</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Featured */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="featured" className="ml-2 text-sm font-medium">
                    Als hervorgehoben markieren
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}