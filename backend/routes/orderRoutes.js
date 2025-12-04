const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Helper function to extract IP address
const extractIPAddress = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
};

// @route   POST /api/orders/test
// @desc    Test order creation
// @access  Public
router.post('/test', async (req, res) => {
  try {
    const order = new Order({
      customer: '6857920cc2ccae45651063f4',
      customerEmail: 'test@test.com',
      customerName: 'Test User',
      product: '6854f36e02f89bb95cacbbd6',
      productName: 'Test Product',
      productPrice: 100,
      productImage: 'test.jpg',
      vendor: '685452eb5917db3a6cd4c3b0',
      vendorName: 'Test Vendor',
      vendorTrustScore: 50,
      quantity: 1,
      totalAmount: 100,
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345'
      },
      paymentMethod: 'Cash on Delivery',
      orderNumber: `TL${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
    });
    
    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    console.error('Test order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private (Customer only)
const verifyToken = require('../middleware/verifyTokenMiddleware');
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      productId,
      quantity = 1,
      shippingAddress,
      paymentMethod = 'Cash on Delivery'
    } = req.body;

    // Get customer ID from authenticated token
    const customerId = req.user.id;
    
    // Validate required fields
    if (!productId || !shippingAddress) {
      return res.status(400).json({ 
        error: 'Product ID and shipping address are required' 
      });
    }

    // Fetch customer details
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch product details using direct database query
    const Product = require('../models/Product');
    const product = await Product.findById(productId).populate('seller', 'name trustScore');
    
    if (!product || !product.name) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check inventory
    if (product.quantity < quantity) {
      return res.status(400).json({ 
        error: `Insufficient inventory. Only ${product.quantity} items available` 
      });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;

    // Extract IP address
    const ipAddress = extractIPAddress(req);

    // Get vendor data (prefer seller field)
    const vendorData = product.seller;
    const vendorId = vendorData?._id || vendorData;
    const vendorName = vendorData?.name || 'Unknown Vendor';
    const vendorTrustScore = vendorData?.trustScore || 50;
    
    const order = new Order({
      customer: customerId,
      customerEmail: customer.email,
      customerName: customer.username,
      product: productId,
      productName: product.name,
      productPrice: product.price,
      productImage: product.images?.[0] || '',
      vendor: vendorId,
      vendorName: vendorName,
      vendorTrustScore: vendorTrustScore,
      quantity,
      totalAmount,
      shippingAddress,
      paymentMethod,
      ipAddress,
      orderNumber: `TL${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
    });

    await order.save();

    // Update product inventory
    await Product.findByIdAndUpdate(productId, {
      $inc: { 
        quantity: -quantity,
        totalSold: quantity
      }
    });

    // Update customer transaction count and recalculate trust score
    customer.transactionCount = (customer.transactionCount || 0) + 1;
    
    // Recalculate trust score based on new transaction
    const TrustAnalyzer = require('../utils/trustAnalyzer');
    const newTrustScore = await TrustAnalyzer.calculateTrustScore(customer);
    customer.trustScore = newTrustScore;
    
    await customer.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order,
      orderNumber: order.orderNumber,
      updatedTrustScore: newTrustScore
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// @route   GET /api/orders/customer/:customerId
// @desc    Get all orders for a customer
// @access  Private (Customer only)
router.get('/customer/:customerId', verifyToken, async (req, res) => {
  // Verify customer can only access their own orders
  if (req.user.id !== req.params.customerId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You can only access your own orders' });
  }
  try {
    const { customerId } = req.params;
    
    const orders = await Order.getCustomerOrders(customerId);
    
    res.json({
      orders,
      totalOrders: orders.length
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   GET /api/orders/vendor/:vendorId
// @desc    Get all orders for a vendor
// @access  Private (Vendor or Admin only)
router.get('/vendor/:vendorId', verifyToken, async (req, res) => {
  // Verify vendor can only access their own orders (unless admin)
  if (req.user.id !== req.params.vendorId && req.user.role !== 'admin' && req.user.role !== 'vendor') {
    return res.status(403).json({ error: 'Forbidden: You can only access your own vendor orders' });
  }
  try {
    const { vendorId } = req.params;
    
    const orders = await Order.getVendorOrders(vendorId);
    
    res.json({
      orders,
      totalOrders: orders.length
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   GET /api/orders/:orderId
// @desc    Get order details by ID
// @access  Private (Customer, Vendor, or Admin only)
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('customer', 'username email trustScore')
      .populate('product', 'name images category description')
      .populate('vendor', 'name trustScore rating');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Verify access rights: customer, vendor, or admin can access
    const isCustomer = order.customer._id.toString() === req.user.id || order.customer.toString() === req.user.id;
    const isVendor = order.vendor._id.toString() === req.user.id || order.vendor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own orders' });
    }
    
    res.json(order);

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// @route   PUT /api/orders/:orderId/status
// @desc    Update order status
// @access  Private (Customer, Vendor, or Admin only)
router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, description, updatedBy = 'Customer', trackingNumber } = req.body;
    
    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Verify access rights: customer can update their own orders, vendor can update their orders, admin can update any
    const isCustomer = order.customer.toString() === req.user.id;
    const isVendor = order.vendor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own orders' });
    }
    
    // Only vendor or admin can update to Shipped/Delivered
    if (['Shipped', 'Delivered'].includes(status) && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only vendor or admin can update order to Shipped/Delivered' });
    }
    
    // Update tracking number if provided
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
      await order.save();
    }
    
    await order.updateStatus(status, description, updatedBy);
    
    res.json({
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// @route   POST /api/orders/:orderId/cancel
// @desc    Cancel an order
// @access  Private (Customer, Vendor, or Admin only)
router.post('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = 'Customer requested cancellation' } = req.body;
    
    const order = await Order.findById(orderId).populate('product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Verify access rights: customer can cancel their own orders, vendor/admin can cancel any
    const isCustomer = order.customer.toString() === req.user.id;
    const isVendor = order.vendor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only cancel your own orders' });
    }
    
    // Check if order can be cancelled
    if (['Delivered', 'Cancelled', 'Returned'].includes(order.status)) {
      return res.status(400).json({ 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }
    
    // Update order status
    await order.updateStatus('Cancelled', reason, 'Customer');
    
    // Restore product inventory
    const product = await Product.findById(order.product._id);
    if (product) {
      product.quantity += order.quantity;
      product.totalSold = Math.max(0, (product.totalSold || 0) - order.quantity);
      await product.save();
    }
    
    res.json({
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (admin view)
// @access  Private (Admin only)
router.get('/', verifyToken, async (req, res) => {
  // Only admin can view all orders
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('customer', 'username email')
      .populate('product', 'name category')
      .populate('vendor', 'name trustScore')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const totalOrders = await Order.countDocuments(query);
    
    res.json({
      orders,
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / parseInt(limit))
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   GET /api/orders/stats/overview
// @desc    Get order statistics
// @access  Private (Admin or Vendor only)
router.get('/stats/overview', verifyToken, async (req, res) => {
  // Admin and vendors can view stats
  if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
    return res.status(403).json({ error: 'Forbidden: Admin or Vendor access required' });
  }
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
    
    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Returned'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    // Get recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'username')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      deliveryRate: totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0,
      cancellationRate: totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0,
      recentOrders
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

module.exports = router; 