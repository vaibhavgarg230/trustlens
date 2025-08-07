const express = require('express');
const { signup, login } = require('../controllers/vendorAuthController');
const router = express.Router();

// Vendor endpoints
router.post('/vendor/signup', signup);
router.post('/vendor/login',  login);

// NEW: Vendor analytics and trust management
const TrustAnalyzer = require('../utils/trustAnalyzer');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const multer = require('multer');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get vendor by ID with real-time calculated metrics
router.get('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    
    // Calculate real-time metrics from orders
    const orders = await Order.find({ vendor: req.params.id });
    const totalRevenue = orders
      .filter(o => !['Cancelled', 'Returned'].includes(o.status || o.orderStatus))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const returnedOrders = orders.filter(o => (o.status || o.orderStatus) === 'Returned').length;
    const realReturnRate = orders.length > 0 ? (returnedOrders / orders.length) * 100 : 0;
    
    // Return vendor with corrected metrics
    const vendorData = vendor.toObject();
    vendorData.totalSales = Math.round(totalRevenue * 100) / 100; // Use real revenue
    vendorData.totalSalesCount = vendor.totalSales; // Original count
    vendorData.overallReturnRate = Math.round(realReturnRate * 100) / 100; // Use real return rate
    vendorData.totalOrders = orders.length;
    
    res.json(vendorData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===========================================
// VENDOR PRODUCT MANAGEMENT ENDPOINTS
// ===========================================

// Get all products for a specific vendor
router.get('/vendors/:vendorId/products', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status, category, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    // Build query
    let query = { seller: vendorId };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    
    const products = await Product.find(query)
      .populate('seller', 'name companyEmail trustScore')
      .sort(sortOptions);
    
    // Calculate inventory totals using 'quantity' as source of truth
    const productsWithInventory = products.map(product => {
      const productObj = product.toObject();
      // Defensive: ensure inventory is always an array
      if (!Array.isArray(productObj.inventory)) productObj.inventory = [];
      // Use 'quantity' field for stock
      const totalInventory = typeof productObj.quantity === 'number' ? productObj.quantity : 0;
      productObj.totalInventory = totalInventory;
      productObj.stockStatus = totalInventory > 0 ? 'In Stock' : 'Out of Stock';
      return productObj;
    });
    
    res.json({
      products: productsWithInventory,
      totalProducts: productsWithInventory.length,
      vendorId
    });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new product for vendor
router.post('/vendors/:vendorId/products', upload.array('images', 5), async (req, res) => {
  try {
    const { vendorId } = req.params;
    const productData = req.body;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Parse inventory data if it's a string
    if (typeof productData.inventory === 'string') {
      try {
        productData.inventory = JSON.parse(productData.inventory);
      } catch (e) {
        productData.inventory = [];
      }
    }
    
    // Parse images if sent as a JSON string (from FormData)
    if (typeof productData.images === 'string') {
      try {
        productData.images = JSON.parse(productData.images);
      } catch (e) {
        productData.images = [];
      }
    }
    
    // Set seller to vendor ID
    productData.seller = vendorId;
    
    // Set default values
    productData.authenticityScore = 85; // Default high score for new products
    productData.status = 'Listed';
    
    // Handle images (placeholder for now - can be enhanced with actual image upload)
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => `/uploads/${file.originalname}`);
    } else if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
      // Use image URLs from request body if provided
      productData.images = productData.images;
    } else {
      productData.images = [];
    }
    
    // Create product
    const product = new Product(productData);
    await product.save();
    
    // Populate seller info for response
    await product.populate('seller', 'name companyEmail trustScore');
    
    // Defensive: ensure inventory is always an array before returning
    const productObj = product.toObject();
    if (!Array.isArray(productObj.inventory)) productObj.inventory = [];
    // Use 'quantity' field for stock
    const totalInventory = typeof productObj.quantity === 'number' ? productObj.quantity : 0;
    productObj.totalInventory = totalInventory;
    productObj.stockStatus = totalInventory > 0 ? 'In Stock' : 'Out of Stock';
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: productObj
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update product for vendor
router.put('/vendors/:vendorId/products/:productId', async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    const updateData = req.body;
    
    // Find product and verify it belongs to vendor
    const product = await Product.findOne({ _id: productId, seller: vendorId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    }
    
    // Only parse and set inventory if present in updateData
    if (updateData.inventory !== undefined) {
      if (typeof updateData.inventory === 'string') {
        try {
          updateData.inventory = JSON.parse(updateData.inventory);
        } catch (e) {
          delete updateData.inventory;
        }
      }
      if (!Array.isArray(updateData.inventory)) {
        updateData.inventory = [];
      }
    }
    // Parse images if sent as a JSON string (from FormData)
    if (typeof updateData.images === 'string') {
      try {
        updateData.images = JSON.parse(updateData.images);
      } catch (e) {
        updateData.images = [];
      }
    }
    // Parse quantity if sent as a string
    if (typeof updateData.quantity === 'string') {
      updateData.quantity = Number(updateData.quantity);
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('seller', 'name companyEmail trustScore');
    
    if (!updatedProduct) {
      return res.status(400).json({ message: 'Product update failed: product not found or validation error.' });
    }
    // Defensive: ensure inventory is always an array before returning
    const productObj = updatedProduct.toObject();
    if (!Array.isArray(productObj.inventory)) productObj.inventory = [];
    // Use 'quantity' field for stock
    const totalInventory = typeof productObj.quantity === 'number' ? productObj.quantity : 0;
    productObj.totalInventory = totalInventory;
    productObj.stockStatus = totalInventory > 0 ? 'In Stock' : 'Out of Stock';
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: productObj
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ message: error.message, error });
  }
});

// Delete product for vendor
router.delete('/vendors/:vendorId/products/:productId', async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    
    // Find product and verify it belongs to vendor
    const product = await Product.findOne({ _id: productId, seller: vendorId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    }
    
    // Delete product
    await Product.findByIdAndDelete(productId);
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
      productId
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single product for vendor
router.get('/vendors/:vendorId/products/:productId', async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    
    // Find product and verify it belongs to vendor
    const product = await Product.findOne({ _id: productId, seller: vendorId })
      .populate('seller', 'name companyEmail trustScore');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    }
    
    const productObj = product.toObject();
    
    // Defensive: ensure inventory is always an array
    if (!Array.isArray(productObj.inventory)) productObj.inventory = [];
    // Calculate total inventory
    const totalInventory = productObj.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    productObj.totalInventory = totalInventory;
    productObj.stockStatus = totalInventory > 0 ? 'In Stock' : 'Out of Stock';
    
    res.json(productObj);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get vendor product analytics
router.get('/vendors/:vendorId/analytics', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Get all products for vendor
    const products = await Product.find({ seller: vendorId });
    
    // Calculate analytics
    const totalProducts = products.length;
    const listedProducts = products.filter(p => p.status === 'Listed').length;
    const flaggedProducts = products.filter(p => p.status === 'Flagged').length;
    const soldProducts = products.filter(p => p.status === 'Sold').length;
    
    // Calculate return rate from actual orders instead of product fields
    const orders = await Order.find({ vendor: vendorId });
    const returnedOrders = orders.filter(o => (o.status || o.orderStatus) === 'Returned').length;
    const avgReturnRate = orders.length > 0 ? (returnedOrders / orders.length) * 100 : 0;
    
    const totalSold = products.reduce((sum, p) => sum + (p.totalSold || 0), 0);
    const totalReturned = products.reduce((sum, p) => sum + (p.totalReturned || 0), 0);
    
    const avgAuthenticityScore = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.authenticityScore || 0), 0) / products.length
      : 0;
    
    const avgRating = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.averageRating || 0), 0) / products.length
      : 0;
    
    // Calculate total inventory
    const totalInventory = products.reduce((sum, product) => {
      const productInventory = product.inventory 
        ? product.inventory.reduce((invSum, inv) => invSum + inv.quantity, 0)
        : 0;
      return sum + productInventory;
    }, 0);
    
    // Category breakdown
    const categoryBreakdown = {};
    products.forEach(product => {
      categoryBreakdown[product.category] = (categoryBreakdown[product.category] || 0) + 1;
    });
    
    res.json({
      vendorId,
      vendorName: vendor.name,
      totalProducts,
      listedProducts,
      flaggedProducts,
      soldProducts,
      totalSold,
      totalReturned,
      avgReturnRate: parseFloat(avgReturnRate.toFixed(2)),
      avgAuthenticityScore: parseFloat(avgAuthenticityScore.toFixed(1)),
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalInventory,
      categoryBreakdown,
      vendorTrustScore: vendor.trustScore,
      vendorRating: vendor.rating
    });
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update product inventory
router.put('/vendors/:vendorId/products/:productId/inventory', async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    const { inventory } = req.body;
    
    // Find product and verify it belongs to vendor
    const product = await Product.findOne({ _id: productId, seller: vendorId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    }
    
    // Update inventory
    product.inventory = inventory;
    await product.save();
    
    // Calculate total inventory
    const totalInventory = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      inventory,
      totalInventory,
      stockStatus: totalInventory > 0 ? 'In Stock' : 'Out of Stock'
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get vendor categories
router.get('/vendors/:vendorId/categories', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const categories = await Product.distinct('category', { seller: vendorId });
    
    res.json({
      categories,
      totalCategories: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===========================================
// VENDOR ORDER MANAGEMENT ENDPOINTS
// ===========================================

// Get all orders for a vendor with filtering and pagination
router.get('/vendors/:vendorId/orders', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      order = 'desc',
      search = '',
      dateFrom,
      dateTo
    } = req.query;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Build query
    let query = { vendor: vendorId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('customer', 'username email trustScore')
      .populate('product', 'name images category')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalOrders = await Order.countDocuments(query);
    
    // Ensure customer name is always present
    const ordersWithCustomerName = orders.map(order => {
      const orderObj = order.toObject();
      if (!orderObj.customerName && orderObj.customer && orderObj.customer.username) {
        orderObj.customerName = orderObj.customer.username;
      }
      return orderObj;
    });
    
    res.json({
      orders: ordersWithCustomerName,
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / parseInt(limit)),
      vendorId
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get order analytics for vendor
router.get('/vendors/:vendorId/orders/analytics', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Get all orders for vendor
    const orders = await Order.find({ vendor: vendorId });
    
    // Calculate analytics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
    const processingOrders = orders.filter(o => o.status === 'Processing').length;
    const shippedOrders = orders.filter(o => o.status === 'Shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;
    const returnedOrders = orders.filter(o => (o.status || o.orderStatus) === 'Returned').length;
    
    // Calculate revenue (standardized calculation)
    const totalRevenue = orders
      .filter(o => !['Cancelled', 'Returned'].includes(o.status || o.orderStatus))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate rates (standardized across all endpoints)
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
    
    // Recent orders
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    // Orders by status
    const ordersByStatus = {
      Pending: pendingOrders,
      Confirmed: confirmedOrders,
      Processing: processingOrders,
      Shipped: shippedOrders,
      Delivered: deliveredOrders,
      Cancelled: cancelledOrders,
      Returned: returnedOrders
    };
    
    // Payment method breakdown
    const paymentMethods = {};
    orders.forEach(order => {
      paymentMethods[order.paymentMethod] = (paymentMethods[order.paymentMethod] || 0) + 1;
    });
    
    res.json({
      vendorId,
      vendorName: vendor.name,
      totalOrders,
      ordersByStatus,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      deliveryRate: parseFloat(deliveryRate.toFixed(2)),
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      returnRate: parseFloat(returnRate.toFixed(2)),
      paymentMethods,
      recentOrders: recentOrders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        productName: order.productName,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching vendor order analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update order status (vendor action)
router.put('/vendors/:vendorId/orders/:orderId/status', async (req, res) => {
  try {
    const { vendorId, orderId } = req.params;
    const { status, description, trackingNumber } = req.body;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find order and verify it belongs to vendor
    const order = await Order.findOne({ _id: orderId, vendor: vendorId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not owned by vendor' });
    }
    
    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Update tracking number if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    // Update order status
    await order.updateStatus(status, description || `Status updated to ${status} by vendor`, vendor.name);
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        timeline: order.timeline
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single order details for vendor
router.get('/vendors/:vendorId/orders/:orderId', async (req, res) => {
  try {
    const { vendorId, orderId } = req.params;
    
    // Find order and verify it belongs to vendor
    const order = await Order.findOne({ _id: orderId, vendor: vendorId })
      .populate('customer', 'username email trustScore')
      .populate('product', 'name images category description')
      .populate('vendor', 'name trustScore rating');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not owned by vendor' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get vendor order statistics summary
router.get('/vendors/:vendorId/orders/stats/summary', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    const orders = await Order.find({ vendor: vendorId });
    
    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
    
    // This week's orders
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo);
    
    // This month's orders
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo);
    
    // Pending actions (orders requiring vendor attention)
    const pendingActions = orders.filter(o => 
      ['Pending', 'Confirmed'].includes(o.status)
    ).length;
    
    res.json({
      todayOrders: todayOrders.length,
      weekOrders: weekOrders.length,
      monthOrders: monthOrders.length,
      totalOrders: orders.length,
      pendingActions,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      weekRevenue: weekOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      monthRevenue: monthOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    });
  } catch (error) {
    console.error('Error fetching order stats summary:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test endpoint to debug the issue
router.get('/vendors/:vendorId/analytics/test', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const orders = await Order.find({ vendor: vendorId }).limit(1);
    
    if (orders.length > 0) {
      const order = orders[0];
      res.json({
        orderStructure: {
          hasProduct: !!order.product,
          hasProducts: !!order.products,
          hasCustomer: !!order.customer,
          hasBuyer: !!order.buyer,
          productType: typeof order.product,
          customerType: typeof order.customer,
          sampleOrder: order
        }
      });
    } else {
      res.json({ message: 'No orders found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comprehensive vendor analytics dashboard
router.get('/vendors/:vendorId/analytics/dashboard', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { period = '30d' } = req.query;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get orders with basic aggregation
    const orders = await Order.find({ vendor: vendorId }).limit(50);
    
    // Calculate basic metrics safely
    let totalRevenue = 0;
    let statusBreakdown = {};
    let revenueByDate = {};
    let customerStats = {};
    
    orders.forEach(order => {
      // Safe revenue calculation
      if (order.totalAmount && !['Cancelled', 'Returned'].includes(order.status || order.orderStatus)) {
        totalRevenue += order.totalAmount;
      }
      
      // Status breakdown
      const status = order.status || order.orderStatus || 'Pending';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      
      // Revenue by date
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = { revenue: 0, orders: 0 };
      }
      revenueByDate[dateKey].orders += 1;
      if (order.totalAmount && !['Cancelled', 'Returned'].includes(order.status || order.orderStatus)) {
        revenueByDate[dateKey].revenue += order.totalAmount;
      }
      
      // Customer performance
      const customerName = order.customerName || 'Unknown Customer';
      if (!customerStats[customerName]) {
        customerStats[customerName] = { totalSpent: 0, orders: 0 };
      }
      customerStats[customerName].orders += 1;
      if (order.totalAmount && !['Cancelled', 'Returned'].includes(order.status || order.orderStatus)) {
        customerStats[customerName].totalSpent += order.totalAmount;
      }
    });
    
    // Convert to chart format
    const revenueChart = Object.entries(revenueByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7); // Last 7 days
    
    // Calculate top customers from real data
    const topCustomers = Object.entries(customerStats)
      .map(([customerName, stats]) => ({ customerName, ...stats }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
    
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const returnRate = orders.length > 0 ? ((statusBreakdown.Returned || 0) / orders.length) * 100 : 0;
    
    res.json({
      period,
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: orders.length,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        returnRate: Math.round(returnRate * 100) / 100,
        cancellationRate: Math.round(((statusBreakdown.Cancelled || 0) / orders.length) * 100 * 100) / 100,
                 revenueGrowth: 0, // Will calculate properly later
         orderGrowth: 0 // Will calculate properly later
      },
                    revenueChart,
       topCustomers,
       statusBreakdown,
             vendorInfo: {
         name: vendor.name,
         trustScore: vendor.trustScore || 50,
         totalSales: Math.round(totalRevenue * 100) / 100, // Use calculated revenue instead of stored count
         totalSalesCount: vendor.totalSales || 0, // Keep original count for reference
         overallReturnRate: Math.round(returnRate * 100) / 100 // Use calculated return rate for consistency
       }
    });

  } catch (error) {
    console.error('Error fetching vendor analytics dashboard:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get vendor product analytics
router.get('/vendors/:vendorId/analytics/products', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const [products, orders] = await Promise.all([
      Product.find({ vendor: vendorId }),
      Order.find({ vendor: vendorId })
    ]);

    // Product analytics
    const productAnalytics = products.map(product => {
      const productOrders = orders.filter(o => o.product && o.product.toString() === product._id.toString());
      const revenue = productOrders
        .filter(o => !['Cancelled', 'Returned'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);
      
      const views = product.views || 0;
      const conversionRate = views > 0 ? (productOrders.length / views) * 100 : 0;

      return {
        _id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        totalOrders: productOrders.length,
        revenue: parseFloat(revenue.toFixed(2)),
        views,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        authenticityScore: product.authenticityScore || 50,
        status: product.status || 'Listed'
      };
    });

    // Sort by revenue
    const topPerformers = [...productAnalytics].sort((a, b) => b.revenue - a.revenue);
    const lowPerformers = [...productAnalytics].sort((a, b) => a.revenue - b.revenue).slice(0, 5);

    res.json({
      totalProducts: products.length,
      productAnalytics,
      topPerformers: topPerformers.slice(0, 10),
      lowPerformers,
      categoryBreakdown: productAnalytics.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {}),
      averagePrice: productAnalytics.length > 0 ? 
        productAnalytics.reduce((sum, p) => sum + p.price, 0) / productAnalytics.length : 0
    });

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===========================================
// VENDOR ALERT MANAGEMENT ENDPOINTS
// ===========================================

const { AlertSystem, Alert } = require('../utils/alertSystem');

// Get all alerts for a specific vendor
router.get('/vendors/:vendorId/alerts', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status = 'all', severity = 'all', limit = 50 } = req.query;
    
    // Skip vendor verification for now to avoid MongoDB timeout
    // const vendor = await Vendor.findById(vendorId);
    // if (!vendor) {
    //   return res.status(404).json({ message: 'Vendor not found' });
    // }
    const vendorName = 'Vendor'; // Placeholder
    
    // Build query for vendor-related alerts
    let query = {
      $or: [
        { target: vendorId }, // Direct vendor alerts
        { 'data.vendorId': vendorId }, // Alerts with vendor data
        { 'data.seller': vendorId } // Product-related alerts
      ]
    };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (severity !== 'all') {
      query.severity = severity;
    }
    
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Calculate vendor alert statistics
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'Active').length,
      resolved: alerts.filter(a => a.status === 'Resolved').length,
      dismissed: alerts.filter(a => a.status === 'Dismissed').length,
      critical: alerts.filter(a => a.severity === 'Critical').length,
      high: alerts.filter(a => a.severity === 'High').length,
      medium: alerts.filter(a => a.severity === 'Medium').length,
      low: alerts.filter(a => a.severity === 'Low').length
    };
    
    res.json({
      vendorId,
      vendorName: vendorName,
      alerts,
      stats,
      totalAlerts: alerts.length
    });
  } catch (error) {
    console.error('Error fetching vendor alerts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create vendor-specific alert
router.post('/vendors/:vendorId/alerts', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const alertData = req.body;
    
    // Skip vendor verification for now
    // const vendor = await Vendor.findById(vendorId);
    // if (!vendor) {
    //   return res.status(404).json({ message: 'Vendor not found' });
    // }
    
    // Set vendor as target and add vendor data
    alertData.target = vendorId;
    alertData.targetType = 'Vendor';
    alertData.data = { ...alertData.data, vendorId, vendorName: 'Vendor' };
    
    const alert = await AlertSystem.createAlert(alertData);
    
    if (!alert) {
      return res.status(400).json({ message: 'Failed to create alert' });
    }
    
    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert
    });
  } catch (error) {
    console.error('Error creating vendor alert:', error);
    res.status(500).json({ message: error.message });
  }
});

// Resolve vendor alert
router.put('/vendors/:vendorId/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { vendorId, alertId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find and resolve alert
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    // Check if alert belongs to vendor
    const isVendorAlert = alert.target === vendorId || 
                         alert.data?.vendorId === vendorId || 
                         alert.data?.seller === vendorId;
    
    if (!isVendorAlert) {
      return res.status(403).json({ message: 'Alert does not belong to this vendor' });
    }
    
    const resolvedAlert = await AlertSystem.resolveAlert(alertId);
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alert: resolvedAlert
    });
  } catch (error) {
    console.error('Error resolving vendor alert:', error);
    res.status(500).json({ message: error.message });
  }
});

// Dismiss vendor alert
router.put('/vendors/:vendorId/alerts/:alertId/dismiss', async (req, res) => {
  try {
    const { vendorId, alertId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find and dismiss alert
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    // Check if alert belongs to vendor
    const isVendorAlert = alert.target === vendorId || 
                         alert.data?.vendorId === vendorId || 
                         alert.data?.seller === vendorId;
    
    if (!isVendorAlert) {
      return res.status(403).json({ message: 'Alert does not belong to this vendor' });
    }
    
    const dismissedAlert = await Alert.findByIdAndUpdate(
      alertId,
      { status: 'Dismissed' },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Alert dismissed successfully',
      alert: dismissedAlert
    });
  } catch (error) {
    console.error('Error dismissing vendor alert:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get vendor alert statistics
router.get('/vendors/:vendorId/alerts/stats', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Get all vendor alerts
    const alerts = await Alert.find({
      $or: [
        { target: vendorId },
        { 'data.vendorId': vendorId },
        { 'data.seller': vendorId }
      ]
    });
    
    // Calculate comprehensive statistics
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'Active').length,
      resolved: alerts.filter(a => a.status === 'Resolved').length,
      dismissed: alerts.filter(a => a.status === 'Dismissed').length,
      severityBreakdown: {
        critical: alerts.filter(a => a.severity === 'Critical').length,
        high: alerts.filter(a => a.severity === 'High').length,
        medium: alerts.filter(a => a.severity === 'Medium').length,
        low: alerts.filter(a => a.severity === 'Low').length
      },
      typeBreakdown: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {}),
      recentAlerts: alerts
        .filter(a => a.status === 'Active')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
      alertTrend: getAlertTrend(alerts)
    };
    
    res.json({
      vendorId,
      vendorName: vendor.name,
      stats
    });
  } catch (error) {
    console.error('Error fetching vendor alert stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function for alert trend calculation
function getAlertTrend(alerts) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toDateString(),
      count: 0
    };
  });
  
  alerts.forEach(alert => {
    const alertDate = new Date(alert.createdAt).toDateString();
    const dayIndex = last7Days.findIndex(day => day.date === alertDate);
    if (dayIndex !== -1) {
      last7Days[dayIndex].count++;
    }
  });
  
  return last7Days.map(day => ({
    date: new Date(day.date).toLocaleDateString(),
    count: day.count
  }));
}

module.exports = router;
