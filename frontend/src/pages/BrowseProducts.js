import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function BrowseProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  
  // Order placement state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      const response = await apiService.getProducts();
      setProducts(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load products');
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'trust':
          return (b.vendor?.trustScore || 0) - (a.vendor?.trustScore || 0);
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  };

  const getCategories = () => {
    const categories = [...new Set(products.map(p => p.category))];
    return ['All', ...categories];
  };

  const getTrustScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAuthenticityColor = (score) => {
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReturnRateColor = (category) => {
    switch (category) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleBuyNow = (product) => {
    setSelectedProduct(product);
    setShowOrderModal(true);
    setOrderSuccess(false);
  };

  const handlePlaceOrder = async (orderData) => {
    setOrderLoading(true);
    try {
      // Get customer ID from JWT token
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/customer/login');
        return;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const response = await apiService.placeOrder({
        customerId: payload.id,
        productId: selectedProduct._id,
        quantity: 1,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod
      });
      
      setOrderSuccess(true);
      setOrderLoading(false);
      
      // Update product quantity in local state
      setProducts(products.map(p => 
        p._id === selectedProduct._id 
          ? { ...p, quantity: p.quantity - 1 }
          : p
      ));
      
      setTimeout(() => {
        setShowOrderModal(false);
        setOrderSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Order placement error:', err);
      setError('Failed to place order. Please try again.');
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/customer/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Browse Products</h1>
              <span className="ml-3 text-sm text-gray-500">({filteredProducts.length} products)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="trust">Vendor Trust Score</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
                <img
                  src={product.images[0] || '/placeholder-image.jpg'}
                  alt={product.name}
                  className="h-48 w-full object-cover object-center"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Price */}
                <div className="text-2xl font-bold text-green-600 mb-3">
                  ₹{product.price}
                </div>

                {/* Trust Indicators */}
                <div className="space-y-2 mb-4">
                  {/* Vendor Trust Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vendor Trust:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTrustScoreColor(product.vendor?.trustScore || 0)}`}>
                      {product.vendor?.trustScore || 0}
                    </span>
                  </div>

                  {/* Authenticity Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Authenticity:</span>
                    <span className={`text-sm font-medium ${getAuthenticityColor(product.authenticityScore)}`}>
                      {product.authenticityScore}%
                    </span>
                  </div>

                  {/* Return Rate */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Return Rate:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getReturnRateColor(product.returnRateCategory)}`}>
                      {product.returnRateCategory}
                    </span>
                  </div>

                  {/* Customer Rating */}
                  {product.reviewCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <div className="flex items-center">
                        <span className="text-yellow-500">{'★'.repeat(Math.floor(product.averageRating))}</span>
                        <span className="text-sm text-gray-600 ml-1">
                          ({product.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor Info */}
                <div className="border-t pt-3 mb-4">
                  <p className="text-sm text-gray-600">
                    Sold by: <span className="font-medium">{product.vendor?.name || product.seller?.name}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button 
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                    onClick={() => navigate(`/customer/products/${product._id}`)}
                  >
                    View Details
                  </button>
                  
                  {product.quantity > 0 ? (
                    <button 
                      onClick={() => handleBuyNow(product)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
                    >
                      Buy Now
                    </button>
                  ) : (
                    <button disabled className="w-full bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed">
                      Out of Stock
                    </button>
                  )}
                </div>

                {/* Fraud Warning */}
                {product.fraudFlagged && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-xs text-red-700 text-center">
                      ⚠️ Flagged by AI for review
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No Products Found */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          product={selectedProduct}
          onClose={() => setShowOrderModal(false)}
          onPlaceOrder={handlePlaceOrder}
          loading={orderLoading}
          success={orderSuccess}
        />
      )}
    </div>
  );
}

// Order Modal Component
function OrderModal({ product, onClose, onPlaceOrder, loading, success }) {
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      alert('Please fill in all shipping address fields');
      return;
    }
    onPlaceOrder({ shippingAddress, paymentMethod });
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">Order Placed Successfully!</h3>
          <p className="text-gray-600">Your order has been confirmed and will be processed soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Place Order</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Product Summary */}
        <div className="border rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{product.name}</h4>
              <p className="text-green-600 font-bold">₹{product.price}</p>
              <p className="text-sm text-gray-600">Qty: 1</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Shipping Address */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Shipping Address</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Street Address"
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="ZIP Code"
                value={shippingAddress.zipCode}
                onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Payment Method</h4>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="UPI">UPI</option>
              <option value="Net Banking">Net Banking</option>
            </select>
          </div>

          {/* Order Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">₹{product.price}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Placing Order...
                </div>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 