const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');
const ImageAnalyzer = require('../utils/imageAnalyzer');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

// Initialize image analyzer
const imageAnalyzer = new ImageAnalyzer();

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

// Create a new product with AI-powered image analysis
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const productData = req.body;
    
    console.log('🖼️ Starting AI image analysis for product...');
    
    // Analyze uploaded images if any
    if (req.files && req.files.length > 0) {
      const imageAnalyses = [];
      
      for (const file of req.files) {
        console.log(`🔍 Analyzing image: ${file.originalname}`);
        const analysis = await imageAnalyzer.analyzeImageAuthenticity(file.buffer, file.originalname);
        imageAnalyses.push({
          filename: file.originalname,
          analysis: analysis,
          size: file.size,
          mimetype: file.mimetype
        });
      }
      
      // Calculate overall authenticity score from all images
      const avgAuthenticity = imageAnalyses.reduce((sum, img) => sum + img.analysis.authenticity, 0) / imageAnalyses.length;
      
      // Store image analysis data
      productData.metadata = {
        imageAnalysis: imageAnalyses,
        overallImageAuthenticity: Math.round(avgAuthenticity),
        imageCount: imageAnalyses.length,
        riskFactors: imageAnalyses.flatMap(img => img.analysis.riskFactors)
      };
      
      // Set authenticity score based on image analysis
      productData.authenticityScore = Math.round(avgAuthenticity);
      
      // Determine product status based on analysis
      if (avgAuthenticity < 40) {
        productData.status = 'Flagged';
      } else if (avgAuthenticity < 70) {
        productData.status = 'Under Review';
      } else {
        productData.status = 'Listed';
      }
      
      console.log(`✅ Image Analysis Complete - Authenticity: ${Math.round(avgAuthenticity)}%`);
    } else {
      // No images provided
      productData.authenticityScore = 30; // Lower score for no images
      productData.status = 'Under Review';
      productData.metadata = {
        imageAnalysis: [],
        overallImageAuthenticity: 30,
        imageCount: 0,
        riskFactors: ['no_images_provided']
      };
    }
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      ...product.toObject(),
      imageAnalysisResults: productData.metadata.imageAnalysis
    });
  } catch (error) {
    console.error('Error in product creation with image analysis:', error);
    res.status(400).json({ message: error.message });
  }
});

// Analyze specific image endpoint
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    console.log('🔍 Performing live image analysis...');
    
    const analysis = await imageAnalyzer.analyzeImageAuthenticity(req.file.buffer, req.file.originalname);
    
    res.json({
      success: true,
      filename: req.file.originalname,
      fileSize: req.file.size,
      analysis: analysis,
      summary: {
        authenticityScore: analysis.authenticity,
        riskLevel: analysis.authenticity < 40 ? 'High' : 
                  analysis.authenticity < 70 ? 'Medium' : 'Low',
        aiGenerated: analysis.aiDetection.aiSignatures.length > 0,
        manipulated: analysis.riskFactors.some(factor => 
          factor.includes('editing') || factor.includes('manipulation')
        ),
        confidence: analysis.riskFactors.length === 0 ? 'High' : 'Medium'
      }
    });
  } catch (error) {
    console.error('Live image analysis error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Utility to get real-time vendor trust and return rate from orders
async function getVendorTrustAndReturnRate(vendorId) {
  // Get all orders for this vendor
  const orders = await Order.find({ vendor: vendorId });
  const returnedOrders = orders.filter(o => (o.status || o.orderStatus) === 'Returned').length;
  const totalOrders = orders.length;
  const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

  // Trust score formula (same as analytics/dashboard):
  // Use vendor.trustScore if you want to keep the existing logic, or recalculate here if needed
  // For now, use the stored trustScore for consistency with analytics, but always use real-time returnRate
  const vendor = await Vendor.findById(vendorId);
  return {
    trustScore: vendor?.trustScore || 50,
    returnRate: parseFloat(returnRate.toFixed(2)),
    rating: vendor?.rating || 0,
    name: vendor?.name || '',
    email: vendor?.companyEmail || vendor?.contactPerson?.email || '',
    username: vendor?.contactPerson?.name || (vendor?.name ? vendor.name.split(' ')[0] : ''),
    _id: vendor?._id || vendorId
  };
}

// Get all products with image analysis data
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate({
      path: 'seller',
      select: 'name companyEmail contactPerson trustScore overallReturnRate rating'
    });

    // For each product, fetch real-time vendor trust/return rate
    const productsWithVendorStats = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();
      if (productObj.seller) {
        // Use real-time calculation
        const vendorStats = await getVendorTrustAndReturnRate(productObj.seller._id);
        productObj.vendor = vendorStats;
      } else {
        productObj.vendor = null;
      }
      // Calculate current return rate for the product itself (not vendor-wide)
      const currentReturnRate = product.totalSold > 0 
        ? (product.totalReturned / product.totalSold) * 100 
        : 0;
      productObj.currentReturnRate = parseFloat(currentReturnRate.toFixed(2));
      productObj.returnRateCategory = currentReturnRate > 50 ? 'High' :
                                     currentReturnRate > 20 ? 'Medium' : 'Low';
      productObj.returnRateColor = currentReturnRate > 50 ? 'red' :
                                  currentReturnRate > 20 ? 'yellow' : 'green';
      return productObj;
    }));

    res.json(productsWithVendorStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product by ID with detailed image analysis
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({
      path: 'seller',
      select: 'name companyEmail contactPerson trustScore overallReturnRate rating'
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const productObj = product.toObject();
    
    // Map seller to vendor for frontend compatibility
    if (productObj.seller) {
      productObj.vendor = {
        _id: productObj.seller._id,
        name: productObj.seller.name,
        email: productObj.seller.companyEmail || productObj.seller.contactPerson?.email,
        username: productObj.seller.contactPerson?.name || productObj.seller.name.split(' ')[0],
        trustScore: productObj.seller.trustScore || 0,
        returnRate: productObj.seller.overallReturnRate || 0,
        rating: productObj.seller.rating || 0
      };
    } else {
      productObj.vendor = null;
    }
    
    res.json(productObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update product by ID
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product by ID
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by authenticity score range
router.get('/authenticity/:min/:max', async (req, res) => {
  try {
    const min = parseInt(req.params.min);
    const max = parseInt(req.params.max);
    
    const products = await Product.find({
      authenticityScore: { $gte: min, $lte: max }
    }).populate('seller', 'username email');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get flagged products (low authenticity)
router.get('/flagged/all', async (req, res) => {
  try {
    const flaggedProducts = await Product.find({
      $or: [
        { status: 'Flagged' },
        { authenticityScore: { $lt: 40 } }
      ]
    }).populate('seller', 'username email');
    
    res.json(flaggedProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track product purchase
router.post('/:id/purchase', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!product.seller || !product.seller._id) {
      return res.status(400).json({ message: 'Product is missing a valid seller. Please assign a seller to this product.' });
    }
    
    const oldTotalSold = product.totalSold;
    const oldReturnRate = product.returnRate;
    
    // Increment total sold
    product.totalSold += 1;
    
    // Add audit log
    product.adminLogs.push({
      action: 'purchase_tracked',
      performedBy: 'admin',
      timestamp: new Date(),
      details: {
        reason: 'Admin tracked a purchase for this product'
      },
      oldValue: {
        totalSold: oldTotalSold,
        returnRate: oldReturnRate
      },
      newValue: {
        totalSold: product.totalSold,
        returnRate: product.returnRate
      }
    });
    
    await product.save();
    
    // Recalculate seller trust score based on new return rate
    let trustResult = null;
    if (product.seller) {
      const TrustAnalyzer = require('../utils/trustAnalyzer');
      trustResult = await TrustAnalyzer.calculateSellerTrustWithReturnRate(product.seller._id);
      // Add trust recalculation to audit log
      if (trustResult) {
        product.adminLogs.push({
          action: 'trust_recalculated',
          performedBy: 'system',
          timestamp: new Date(),
          details: {
            reason: 'Trust score recalculated due to purchase tracking',
            sellerType: trustResult.sellerType,
            trustScoreChange: trustResult.trustScoreChange
          },
          oldValue: {
            sellerTrustScore: trustResult.oldTrustScore
          },
          newValue: {
            sellerTrustScore: trustResult.newTrustScore
          }
        });
        await product.save();
      }
    }
    
    console.log(`📦 Purchase tracked for product: ${product.name} (Total sold: ${product.totalSold})`);
    
    res.json({
      success: true,
      message: 'Purchase tracked successfully',
      product: {
        _id: product._id,
        name: product.name,
        totalSold: product.totalSold,
        totalReturned: product.totalReturned,
        returnRate: product.returnRate
      },
      trustResult
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Track product return
router.post('/:id/return', async (req, res) => {
  try {
    const { reason } = req.body;
    const product = await Product.findById(req.params.id).populate('seller');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!product.seller || !product.seller._id) {
      return res.status(400).json({ message: 'Product is missing a valid seller. Please assign a seller to this product.' });
    }
    
    const oldTotalReturned = product.totalReturned;
    const oldReturnRate = product.returnRate;
    
    // Increment total returned
    product.totalReturned += 1;
    
    // Add audit log
    product.adminLogs.push({
      action: 'return_tracked',
      performedBy: 'admin',
      timestamp: new Date(),
      details: {
        reason: reason || 'Not specified',
        description: 'Admin tracked a return for this product'
      },
      oldValue: {
        totalReturned: oldTotalReturned,
        returnRate: oldReturnRate
      },
      newValue: {
        totalReturned: product.totalReturned,
        returnRate: product.returnRate
      }
    });
    
    await product.save();
    
    console.log(`🔄 Return tracked for product: ${product.name} (Total returned: ${product.totalReturned}, Rate: ${product.returnRate}%)`);
    
    // Recalculate seller trust score based on new return rate
    if (product.seller) {
      const TrustAnalyzer = require('../utils/trustAnalyzer');
      const trustResult = await TrustAnalyzer.calculateSellerTrustWithReturnRate(product.seller._id);
      
      // Add trust recalculation to audit log
      if (trustResult) {
        product.adminLogs.push({
          action: 'trust_recalculated',
          performedBy: 'system',
          timestamp: new Date(),
          details: {
            reason: 'Trust score recalculated due to return tracking',
            sellerType: trustResult.sellerType,
            trustScoreChange: trustResult.trustScoreChange
          },
          oldValue: {
            sellerTrustScore: trustResult.oldTrustScore
          },
          newValue: {
            sellerTrustScore: trustResult.newTrustScore
          }
        });
        await product.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Return tracked successfully',
      product: {
        _id: product._id,
        name: product.name,
        totalSold: product.totalSold,
        totalReturned: product.totalReturned,
        returnRate: product.returnRate,
        reason: reason || 'Not specified'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product return analytics
router.get('/:id/return-analytics', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller', 'username email');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const analytics = {
      productId: product._id,
      productName: product.name,
      seller: product.seller,
      totalSold: product.totalSold,
      totalReturned: product.totalReturned,
      returnRate: product.returnRate,
      returnRateCategory: product.returnRate > 50 ? 'High' :
                         product.returnRate > 20 ? 'Medium' : 'Low',
      trustImpact: {
        penalty: product.returnRate > 50 ? -15 :
                product.returnRate > 20 ? -7 : +5,
        description: product.returnRate > 50 ? 'High return rate penalty' :
                    product.returnRate > 20 ? 'Medium return rate penalty' : 'Low return rate bonus'
      }
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product audit logs
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('adminLogs name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Sort logs by timestamp (newest first)
    const sortedLogs = product.adminLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      productId: product._id,
      productName: product.name,
      auditLogs: sortedLogs,
      totalLogs: sortedLogs.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Inject fraud scenario - actually modify database records
router.post('/inject-fraud', async (req, res) => {
  try {
    // Import AlertSystem for creating alerts
    const { AlertSystem } = require('../utils/alertSystem');
    
    // Find products that don't have fraud flags yet
    const productsToFlag = await Product.find({ 
      $or: [
        { fraudFlagged: { $ne: true } },
        { fraudFlagged: { $exists: false } }
      ]
    }).populate('seller', 'name').limit(3);
    
    if (productsToFlag.length === 0) {
      return res.json({ 
        message: 'No products available to flag for fraud',
        fraudCount: 0,
        activities: [],
        alertsCreated: []
      });
    }
    
    const activities = [];
    const updatedProducts = [];
    const alertsCreated = [];
    
    for (const product of productsToFlag) {
      // Force low authenticity score and set fraud flag
      const newScore = Math.floor(Math.random() * 30) + 20; // 20-49%
      
      await Product.findByIdAndUpdate(product._id, {
        authenticityScore: newScore,
        fraudFlagged: true,
        status: 'Flagged',
        fraudTimestamp: new Date()
      });
      
      // Create alert for fraud detection
      const alert = await AlertSystem.createAlert({
        type: 'Fake Review Detection', // Use enum value from schema
        target: product._id.toString(),
        targetType: 'Product',
        severity: newScore < 30 ? 'Critical' : 'High',
        description: `FRAUD INJECTION: Product "${product.name}" flagged with ${newScore}% authenticity score`,
        data: { 
          originalScore: product.authenticityScore,
          newScore: newScore,
          vendor: product.seller?.name || 'Unknown',
          fraudInjected: true,
          injectionTimestamp: new Date()
        },
        actions: ['Flag Account', 'Remove Content', 'Manual Review']
      });
      
      if (alert) {
        alertsCreated.push({
          alertId: alert._id,
          productId: product._id,
          severity: alert.severity,
          description: alert.description
        });
      }
      
      activities.push({
        id: Date.now() + Math.random(),
        message: `🚨 FRAUD INJECTED: "${product.name.substring(0, 30)}..." flagged (${newScore}% authenticity)`,
        vendor: product.seller?.name || 'Unknown Vendor',
        product: product.name,
        timestamp: new Date().toISOString(),
        type: 'fraud',
        authenticityScore: newScore
      });
      
      updatedProducts.push({
        _id: product._id,
        name: product.name,
        newAuthenticityScore: newScore,
        vendor: product.seller?.name || 'Unknown'
      });
    }
    
    console.log(`🚨 Fraud injection complete: ${productsToFlag.length} products flagged, ${alertsCreated.length} alerts created`);
    
    res.json({
      message: `Successfully injected fraud into ${productsToFlag.length} products`,
      fraudCount: productsToFlag.length,
      activities: activities,
      updatedProducts: updatedProducts,
      alertsCreated: alertsCreated
    });
    
  } catch (error) {
    console.error('Error injecting fraud:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get real-time marketplace stats
router.get('/stats/realtime', async (req, res) => {
  try {
    // Count total products
    const totalProducts = await Product.countDocuments();
    
    // Count fraud products (authenticityScore < 70)
    const fraudProducts = await Product.countDocuments({ 
      authenticityScore: { $lt: 70, $gt: 0 } 
    });
    
    // Calculate real fraud detection rate
    const fraudDetectionRate = totalProducts > 0 ? 
      ((fraudProducts / totalProducts) * 100).toFixed(1) : 0;
    
    // Get total transactions from all users
    const User = require('../models/User');
    const users = await User.find({}, 'transactionCount');
    const totalTransactions = users.reduce((sum, user) => sum + (user.transactionCount || 0), 0);
    
    // Get products with reviews for review-based transactions
    const productsWithReviews = await Product.find({ reviewCount: { $gt: 0 } }, 'reviewCount');
    const reviewBasedTransactions = productsWithReviews.reduce((sum, product) => sum + (product.reviewCount || 0), 0);
    
    // Combine both transaction counts
    const combinedTransactions = totalTransactions + reviewBasedTransactions;
    
    res.json({
      totalProducts,
      fraudProducts,
      fraudDetectionRate: parseFloat(fraudDetectionRate),
      totalTransactions: combinedTransactions,
      userTransactions: totalTransactions,
      reviewTransactions: reviewBasedTransactions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting realtime stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get real activity feed from database changes
router.get('/activity/realtime', async (req, res) => {
  try {
    // Get recent products sorted by creation/update time
    const recentProducts = await Product.find()
      .populate('seller', 'name')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10);
    
    const activities = [];
    
    for (const product of recentProducts) {
      const timeDiff = Date.now() - new Date(product.updatedAt).getTime();
      const isRecent = timeDiff < 30 * 60 * 1000; // 30 minutes
      
      if (isRecent || activities.length < 5) {
        // Real authenticity events
        if (product.fraudFlagged) {
          activities.push({
            id: `fraud-${product._id}`,
            message: `🚨 FRAUD DETECTED: "${product.name.substring(0, 25)}..." flagged for review`,
            vendor: product.seller?.name || 'Unknown Vendor',
            timestamp: product.fraudTimestamp || product.updatedAt,
            type: 'fraud'
          });
        } else if (product.authenticityScore < 70 && product.authenticityScore > 0) {
          activities.push({
            id: `low-auth-${product._id}`,
            message: `⚡ LOW AUTHENTICITY: "${product.name.substring(0, 25)}..." scored ${product.authenticityScore}%`,
            vendor: product.seller?.name || 'Unknown Vendor',
            timestamp: product.updatedAt,
            type: 'warning'
          });
        } else if (product.authenticityScore >= 90) {
          activities.push({
            id: `high-auth-${product._id}`,
            message: `✅ HIGH AUTHENTICITY: "${product.name.substring(0, 25)}..." verified at ${product.authenticityScore}%`,
            vendor: product.seller?.name || 'Unknown Vendor',
            timestamp: product.updatedAt,
            type: 'success'
          });
        }
        
        // Review-based activities
        if (product.reviewCount > 0) {
          activities.push({
            id: `review-${product._id}`,
            message: `📝 Review analysis: "${product.name.substring(0, 25)}..." (${product.reviewCount} reviews)`,
            vendor: product.seller?.name || 'Unknown Vendor',
            timestamp: product.updatedAt,
            type: 'normal'
          });
        }
      }
    }
    
    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15)
      .map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp).toLocaleTimeString()
      }));
    
    res.json(sortedActivities);
    
  } catch (error) {
    console.error('Error getting real activity feed:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products - Get all products (admin dashboard)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('seller', 'name trustScore')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// User: Buy product (synchronized with admin logic)
router.put('/:id/buy', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller');
    if (!product || product.quantity <= 0) return res.status(400).json({ message: 'Out of stock' });

    const oldTotalSold = product.totalSold;
    const oldQuantity = product.quantity;
    const oldReturnRate = product.returnRate;

    product.quantity -= 1;
    product.totalSold += 1;

    // Add audit log
    product.adminLogs.push({
      action: 'purchase_tracked',
      performedBy: 'user',
      timestamp: new Date(),
      details: {
        reason: 'User purchased this product'
      },
      oldValue: {
        totalSold: oldTotalSold,
        quantity: oldQuantity,
        returnRate: oldReturnRate
      },
      newValue: {
        totalSold: product.totalSold,
        quantity: product.quantity,
        returnRate: product.returnRate
      }
    });

    await product.save();

    res.json({ message: 'Product purchased successfully', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Return product (synchronized with admin logic)
router.put('/:id/return', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('seller');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const oldTotalReturned = product.totalReturned;
    const oldQuantity = product.quantity;
    const oldReturnRate = product.returnRate;

    product.totalReturned += 1;
    product.quantity += 1;

    // Add audit log
    product.adminLogs.push({
      action: 'return_tracked',
      performedBy: 'user',
      timestamp: new Date(),
      details: {
        reason: 'User returned this product',
        description: 'User tracked a return for this product'
      },
      oldValue: {
        totalReturned: oldTotalReturned,
        quantity: oldQuantity,
        returnRate: oldReturnRate
      },
      newValue: {
        totalReturned: product.totalReturned,
        quantity: product.quantity,
        returnRate: product.returnRate
      }
    });

    await product.save();

    res.json({ message: 'Product returned successfully', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
