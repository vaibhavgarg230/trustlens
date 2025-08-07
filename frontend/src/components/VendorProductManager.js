import React, { useState, useEffect } from 'react';
import { 
  getVendorProducts, 
  createVendorProduct, 
  updateVendorProduct, 
  deleteVendorProduct,
  getVendorAnalytics,
  getVendorCategories 
} from '../services/api';

export default function VendorProductManager() {
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    sortBy: 'createdAt',
    order: 'desc'
  });

  const vendorId = localStorage.getItem('vendorId');

  useEffect(() => {
    if (vendorId) {
      fetchData();
    }
  }, [vendorId, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, analyticsRes, categoriesRes] = await Promise.all([
        getVendorProducts(vendorId, filters),
        getVendorAnalytics(vendorId),
        getVendorCategories(vendorId)
      ]);

      setProducts(productsRes.data.products);
      setAnalytics(analyticsRes.data);
      setCategories(categoriesRes.data.categories);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteVendorProduct(vendorId, productId);
        fetchData(); // Refresh data
      } catch (err) {
        setError('Failed to delete product');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <button
          onClick={handleCreateProduct}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition duration-200"
        >
          + Add New Product
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'products', name: 'Products' },
            { id: 'analytics', name: 'Analytics' },
            { id: 'inventory', name: 'Inventory' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Status</option>
                  <option value="Listed">Listed</option>
                  <option value="Sold">Sold</option>
                  <option value="Flagged">Flagged</option>
                  <option value="Under Review">Under Review</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="authenticityScore">Authenticity Score</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={filters.order}
                  onChange={(e) => handleFilterChange('order', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onEdit={() => handleEditProduct(product)}
                onDelete={() => handleDeleteProduct(product._id)}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first product</p>
              <button
                onClick={handleCreateProduct}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition duration-200"
              >
                Add Your First Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <AnalyticsTab analytics={analytics} />
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <InventoryTab products={products} vendorId={vendorId} onUpdate={fetchData} onEditProduct={handleEditProduct} />
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          vendorId={vendorId}
          onClose={() => setShowProductModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onEdit, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Listed': return 'bg-green-100 text-green-800';
      case 'Sold': return 'bg-blue-100 text-blue-800';
      case 'Flagged': return 'bg-red-100 text-red-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        {product.images && product.images.length > 0 ? (
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-4xl">📷</div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 truncate">{product.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(product.status)}`}>
            {product.status}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-bold text-green-600">₹{product.price}</span>
          <span className="text-sm text-gray-500">{product.category}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
          <div>Stock: {product.totalInventory || 0}</div>
          <div>Score: {product.authenticityScore}%</div>
        </div>
        
        <div className="flex gap-2">
          {/* Remove Edit button */}
          <button
            onClick={onDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-medium transition duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ analytics }) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Listed Products</h3>
          <p className="text-3xl font-bold text-green-600">{analytics.listedProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Sold</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.totalSold}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Return Rate</h3>
          <p className="text-3xl font-bold text-yellow-600">{analytics.avgReturnRate}%</p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Authenticity Score:</span>
              <span className="font-semibold">{analytics.avgAuthenticityScore}%</span>
            </div>
            <div className="flex justify-between">
              <span>Average Rating:</span>
              <span className="font-semibold">{analytics.avgRating}/5</span>
            </div>
            <div className="flex justify-between">
              <span>Trust Score:</span>
              <span className="font-semibold">{Number(analytics.vendorTrustScore).toFixed(2)}/100</span>
            </div>
            <div className="flex justify-between">
              <span>Total Inventory:</span>
              <span className="font-semibold">{analytics.totalInventory}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="flex justify-between">
                <span>{category}:</span>
                <span className="font-semibold">{count} products</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inventory Tab Component
function InventoryTab({ products, vendorId, onUpdate, onEditProduct }) {
  const lowStockProducts = products.filter(p => (p.totalInventory || 0) < 10);
  const outOfStockProducts = products.filter(p => (p.totalInventory || 0) === 0);

  return (
    <div className="space-y-6">
      {/* Inventory Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Inventory Alerts</h3>
          {outOfStockProducts.length > 0 && (
            <p className="text-red-600 mb-1">
              {outOfStockProducts.length} products are out of stock
            </p>
          )}
          {lowStockProducts.length > 0 && (
            <p className="text-yellow-600">
              {lowStockProducts.length} products have low stock (less than 10 items)
            </p>
          )}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={product.images[0]} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">₹{product.price}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`font-medium ${
                    (product.totalInventory || 0) === 0 ? 'text-red-600' :
                    (product.totalInventory || 0) < 10 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {product.totalInventory || 0} units
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.stockStatus === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stockStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Product Modal Component
function ProductModal({ product, vendorId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || '',
    inventory: product?.inventory || [{ address: {}, quantity: 0 }],
    quantity: product?.quantity || '',
    images: product?.images && product.images.length > 0 ? product.images : ['']
  });

  // Handler for image URL changes
  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const addImageField = () => {
    if (formData.images.length < 6) setFormData({ ...formData, images: [...formData.images, ''] });
  };

  const removeImageField = (index) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData({ ...formData, images: newImages });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Always send all required fields for update
      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        quantity: Number(formData.quantity),
        images: formData.images,
        // Optionally include inventory if present
        ...(formData.inventory ? { inventory: formData.inventory } : {})
      };
      if (product) {
        await updateVendorProduct(vendorId, product._id, payload);
      } else {
        await createVendorProduct(vendorId, payload);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows="3"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports">Sports</option>
                <option value="Books">Books</option>
                <option value="Health & Beauty">Health & Beauty</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                min={0}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Image URLs (1–6)</label>
              {formData.images.map((img, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={img}
                    onChange={(e) => handleImageChange(i, e.target.value)}
                    placeholder={`Image URL ${i + 1}`}
                    className="w-full border px-3 py-2 rounded"
                    required={i === 0}
                  />
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageField(i)}
                      className="text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {formData.images.length < 6 && (
                <button
                  type="button"
                  onClick={addImageField}
                  className="mt-1 text-blue-600 text-sm"
                >
                  + Add Another Image
                </button>
              )}
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition duration-200"
              >
                {product ? 'Update' : 'Create'} Product
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 