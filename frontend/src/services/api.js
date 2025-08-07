import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Automatically attach token to requests if available
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');  // works for customer, vendor, or admin
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});


// at top:


// const api = axios.create({
//   baseURL: 'http://localhost:3001/api',
//   headers: { 'Content-Type': 'application/json' },
// });

export const signupCustomer = data => api.post('/auth/customer/signup', data);
export const loginCustomer  = data => api.post('/auth/customer/login', data);

export const signupVendor   = data => api.post('/vendor/vendor/signup', data);
export const loginVendor    = data => api.post('/vendor/vendor/login', data);
export const loginAdmin = data => api.post('/admin/login', data);


// export const loginVendor      = data => api.post('/vendor/vendor/login', data);
export const getVendorProfile = ()   => api.get('/vendor/profile');
export const getProductDetail = prodId => api.get(`/vendor/products/${prodId}`);
export const createProduct = data => api.post('/products', data);
export const deleteProduct = id => api.delete(`/products/${id}`);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

// ===================================
// VENDOR PRODUCT MANAGEMENT API
// ===================================

// Get all products for a vendor
export const getVendorProducts = (vendorId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/vendor/vendors/${vendorId}/products?${queryString}` : `/vendor/vendors/${vendorId}/products`;
  return api.get(url);
};

// Get single product for vendor
export const getVendorProduct = (vendorId, productId) => 
  api.get(`/vendor/vendors/${vendorId}/products/${productId}`);

// Create new product for vendor
export const createVendorProduct = (vendorId, productData) => {
  const formData = new FormData();
  
  // Append all product data
  Object.keys(productData).forEach(key => {
    if (key === 'images' && Array.isArray(productData[key])) {
      // If all are strings (URLs), send as JSON
      if (productData[key].every(img => typeof img === 'string')) {
        formData.append('images', JSON.stringify(productData[key]));
      } else {
        // Handle file uploads (not used in current UI)
        productData[key].forEach(file => {
          formData.append('images', file);
        });
      }
    } else if (key === 'inventory' && typeof productData[key] === 'object') {
      // Stringify inventory data
      formData.append(key, JSON.stringify(productData[key]));
    } else {
      formData.append(key, productData[key]);
    }
  });
  
  return api.post(`/vendor/vendors/${vendorId}/products`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Update product for vendor
export const updateVendorProduct = (vendorId, productId, productData) => {
  const formData = new FormData();

  Object.keys(productData).forEach(key => {
    if (key === 'images' && Array.isArray(productData[key])) {
      if (productData[key].every(img => typeof img === 'string')) {
        formData.append('images', JSON.stringify(productData[key]));
      } else {
        productData[key].forEach(file => {
          formData.append('images', file);
        });
      }
    } else if (key === 'inventory' && typeof productData[key] === 'object') {
      formData.append(key, JSON.stringify(productData[key]));
    } else {
      formData.append(key, productData[key]);
    }
  });

  return api.put(`/vendor/vendors/${vendorId}/products/${productId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Delete product for vendor
export const deleteVendorProduct = (vendorId, productId) =>
  api.delete(`/vendor/vendors/${vendorId}/products/${productId}`);

// Get vendor analytics
export const getVendorAnalytics = (vendorId) =>
  api.get(`/vendor/vendors/${vendorId}/analytics`);

// Update product inventory
export const updateProductInventory = (vendorId, productId, inventory) =>
  api.put(`/vendor/vendors/${vendorId}/products/${productId}/inventory`, { inventory });

// Get vendor categories
export const getVendorCategories = (vendorId) =>
  api.get(`/vendor/vendors/${vendorId}/categories`);

// ===================================
// VENDOR ORDER MANAGEMENT API
// ===================================

// Get all orders for a vendor
export const getVendorOrders = (vendorId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/vendor/vendors/${vendorId}/orders?${queryString}` : `/vendor/vendors/${vendorId}/orders`;
  return api.get(url);
};

// Get vendor order analytics
export const getVendorOrderAnalytics = (vendorId) =>
  api.get(`/vendor/vendors/${vendorId}/orders/analytics`);

// Get vendor order statistics summary
export const getVendorOrderStats = (vendorId) =>
  api.get(`/vendor/vendors/${vendorId}/orders/stats/summary`);

// Get single order details for vendor
export const getVendorOrder = (vendorId, orderId) =>
  api.get(`/vendor/vendors/${vendorId}/orders/${orderId}`);

// Update order status (vendor action)
export const updateVendorOrderStatus = (vendorId, orderId, statusData) =>
  api.put(`/vendor/vendors/${vendorId}/orders/${orderId}/status`, statusData);

export const apiService = {

  buyProduct: (id) => api.put(`/products/${id}/buy`),
  returnProduct: (id) => api.put(`/products/${id}/return`),


  getCustomerDetails: () =>
  api.get('/auth/customer/me', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  // User APIs
  getUsers: () => api.get('/users'),
  createUser: (userData) => api.post('/users', userData),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  // TODO: Add this endpoint to backend when ready
  getTrustScoreHistory: () => api.get('/users/trust-score-history'),
  
  // IP Analysis APIs
  getUserIPAnalysis: (userId) => api.get(`/users/${userId}/ip-analysis`),
  recalculateUserTrust: (userId) => api.post(`/users/${userId}/recalculate-trust`),

  // NEW: Seller Analytics APIs (Users)
  getSellerAnalytics: (sellerId) => api.get(`/users/${sellerId}/seller-analytics`),
  recalculateSellerTrust: (sellerId) => api.post(`/users/${sellerId}/recalculate-seller-trust`),

  // NEW: Vendor APIs
  getVendors: () => api.get('/vendor/vendors'),
  getVendorById: (vendorId) => api.get(`/vendor/vendors/${vendorId}`),
  getVendorAnalytics: (vendorId) => api.get(`/vendor/vendors/${vendorId}/analytics`),
  recalculateVendorTrust: (vendorId) => api.post(`/vendor/vendors/${vendorId}/recalculate-trust`),

  // Product APIs
  getProducts: () => api.get('/products'),
  createProduct: (productData) => api.post('/products', productData),
  getProductById: (id) => api.get(`/products/${id}`),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  
  // Product Return Tracking APIs
  trackProductPurchase: (productId) => api.post(`/products/${productId}/purchase`),
  trackProductReturn: (productId, reason) => api.post(`/products/${productId}/return`, { reason }),
  getProductReturnAnalytics: (productId) => api.get(`/products/${productId}/return-analytics`),
  getProductAuditLogs: (productId) => api.get(`/products/${productId}/audit-logs`),

  // Product Lifecycle APIs
  getProductLifecycleInsights: (sellerId) => api.get(`/product-lifecycle/insights/${sellerId}`),
  getProductLifecycleAnalytics: (productId) => api.get(`/product-lifecycle/analytics/${productId}`),
  getProductLifecycleTimeline: (productId) => api.get(`/product-lifecycle/timeline/${productId}`),
  initializeProductLifecycle: (data) => api.post('/product-lifecycle/initialize', data),
  progressProductLifecycle: (data) => api.post('/product-lifecycle/progress', data),
  trackProductView: (data) => api.post('/product-lifecycle/track-view', data),

  // Review APIs
  getReviews: () => api.get('/reviews'),
  createReview: (reviewData) => api.post('/reviews', reviewData),
  getReviewsByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  voteOnReview: (reviewId, voteType) => api.post(`/reviews/${reviewId}/vote`, { voteType }),
  analyzeReview: (content) => api.post('/reviews/analyze', { content }),

  // Alert APIs
  getAlerts: () => api.get('/alerts'),
  getAlertsByType: (type) => api.get(`/alerts/type/${type}`),
  getAlertsBySeverity: (severity) => api.get(`/alerts/severity/${severity}`),
  resolveAlert: (id) => api.put(`/alerts/${id}/resolve`),
  dismissAlert: (id) => api.put(`/alerts/${id}/dismiss`),
  getAlertStats: () => api.get('/alerts/stats'),

  // Enhanced Review Authentication APIs
  getEnhancedReviewSummary: (reviewId) => api.get(`/enhanced-reviews/summary/${reviewId}`),
  authenticateReview: (reviewId, sourceData) => api.post(`/enhanced-reviews/authenticate/${reviewId}`, sourceData),
  getAuthenticationDetails: (reviewId) => api.get(`/enhanced-reviews/details/${reviewId}`),
  updateReviewDecision: (authId, decision) => api.put(`/enhanced-reviews/decision/${authId}`, decision),
  bulkAuthenticateReviews: (reviewIds) => api.post('/enhanced-reviews/bulk-authenticate', { reviewIds }),
  getAuthenticationStats: () => api.get('/enhanced-reviews/stats/overview'),
  getPendingReviews: () => api.get('/enhanced-reviews/pending-review'),
  progressWorkflow: (authId, workflowData) => api.post(`/enhanced-reviews/workflow/${authId}/progress`, workflowData),
  getDailyReviewStats: () => api.get('/enhanced-reviews/stats/daily'),
  getReviewAnalytics: () => api.get('/enhanced-reviews/analytics/overview'),

  // NEW: Marketplace Real-time APIs
  injectFraud: () => api.post('/products/inject-fraud'),
  getRealtimeStats: () => api.get('/products/stats/realtime'),
  getRealtimeActivity: () => api.get('/products/activity/realtime'),

  // Order APIs
  placeOrder: (orderData) => api.post('/orders', orderData),
  getCustomerOrders: (customerId) => api.get(`/orders/customer/${customerId}`),
  getVendorOrders: (vendorId) => api.get(`/orders/vendor/${vendorId}`),
  getOrderById: (orderId) => api.get(`/orders/${orderId}`),
  updateOrderStatus: (orderId, statusData) => api.put(`/orders/${orderId}/status`, statusData),
  cancelOrder: (orderId, reason) => api.post(`/orders/${orderId}/cancel`, { reason }),
  getAllOrders: (params) => api.get('/orders', { params }),
  getOrderStats: () => api.get('/orders/stats/overview'),

  // Vendor Order Management APIs
  getVendorOrdersList: (vendorId, params) => getVendorOrders(vendorId, params),
  getVendorOrderAnalytics: (vendorId) => getVendorOrderAnalytics(vendorId),
  getVendorOrderStats: (vendorId) => getVendorOrderStats(vendorId),
  getVendorOrderDetails: (vendorId, orderId) => getVendorOrder(vendorId, orderId),
  updateVendorOrderStatus: (vendorId, orderId, statusData) => updateVendorOrderStatus(vendorId, orderId, statusData),

  // Linguistic Analysis API
  getUserLinguisticAnalysis: (userId) => api.get(`/users/${userId}/linguistic-analysis`),
};

export default apiService;
