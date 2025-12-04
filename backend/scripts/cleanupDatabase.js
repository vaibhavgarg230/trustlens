// backend/scripts/cleanupDatabase.js
// Safe database cleanup script to remove excess data while keeping essentials

require('dotenv').config();
const mongoose = require('mongoose');

// Import all models
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const ReviewAuthentication = require('../models/ReviewAuthentication');
const CommunityValidation = require('../models/CommunityValidation');
const PredictionMarket = require('../models/PredictionMarket');
const ProductLifecycle = require('../models/ProductLifecycle');
const Admin = require('../models/Admin');

const MONGO_URI = process.env.MONGO_URI;

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

async function showCurrentStats() {
  console.log('\n📊 Current Database Statistics:');
  console.log('================================');
  
  const stats = {
    users: await User.countDocuments(),
    vendors: await Vendor.countDocuments(),
    products: await Product.countDocuments(),
    orders: await Order.countDocuments(),
    reviews: await Review.countDocuments(),
    reviewAuthentications: await ReviewAuthentication.countDocuments(),
    communityValidations: await CommunityValidation.countDocuments(),
    predictionMarkets: await PredictionMarket.countDocuments(),
    productLifecycles: await ProductLifecycle.countDocuments(),
    admins: await Admin.countDocuments(),
  };
  
  Object.entries(stats).forEach(([collection, count]) => {
    console.log(`  ${collection.padEnd(25)}: ${count}`);
  });
  
  return stats;
}

async function cleanupOldOrders(keepRecent = 50) {
  console.log(`\n🗑️  Cleaning up old orders (keeping ${keepRecent} most recent)...`);
  
  try {
    // Get most recent orders to keep
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(keepRecent)
      .select('_id');
    
    const keepIds = recentOrders.map(o => o._id);
    
    // Delete all other orders
    const result = await Order.deleteMany({
      _id: { $nin: keepIds }
    });
    
    console.log(`   ✅ Deleted ${result.deletedCount} old orders`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning orders:', error.message);
    return 0;
  }
}

async function cleanupOldReviews(keepRecent = 100) {
  console.log(`\n🗑️  Cleaning up old reviews (keeping ${keepRecent} most recent)...`);
  
  try {
    const recentReviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(keepRecent)
      .select('_id');
    
    const keepIds = recentReviews.map(r => r._id);
    
    const result = await Review.deleteMany({
      _id: { $nin: keepIds }
    });
    
    console.log(`   ✅ Deleted ${result.deletedCount} old reviews`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning reviews:', error.message);
    return 0;
  }
}

async function cleanupReviewAuthentications(keepRecent = 50) {
  console.log(`\n🗑️  Cleaning up review authentications (keeping ${keepRecent} most recent)...`);
  
  try {
    const recent = await ReviewAuthentication.find()
      .sort({ createdAt: -1 })
      .limit(keepRecent)
      .select('_id');
    
    const keepIds = recent.map(r => r._id);
    
    const result = await ReviewAuthentication.deleteMany({
      _id: { $nin: keepIds }
    });
    
    console.log(`   ✅ Deleted ${result.deletedCount} review authentications`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning review authentications:', error.message);
    return 0;
  }
}

async function cleanupCommunityValidations() {
  console.log('\n🗑️  Cleaning up community validations...');
  
  try {
    const result = await CommunityValidation.deleteMany({});
    console.log(`   ✅ Deleted ${result.deletedCount} community validations`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning community validations:', error.message);
    return 0;
  }
}

async function cleanupPredictionMarkets() {
  console.log('\n🗑️  Cleaning up prediction markets...');
  
  try {
    const result = await PredictionMarket.deleteMany({});
    console.log(`   ✅ Deleted ${result.deletedCount} prediction markets`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning prediction markets:', error.message);
    return 0;
  }
}

async function cleanupProductLifecycles() {
  console.log('\n🗑️  Cleaning up product lifecycles...');
  
  try {
    // Keep lifecycles for products that still exist
    const products = await Product.find().select('_id');
    const productIds = products.map(p => p._id);
    
    const result = await ProductLifecycle.deleteMany({
      productId: { $nin: productIds }
    });
    
    console.log(`   ✅ Deleted ${result.deletedCount} orphaned product lifecycles`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning product lifecycles:', error.message);
    return 0;
  }
}

async function cleanupTestUsers() {
  console.log('\n🗑️  Cleaning up test users (keeping real users)...');
  
  try {
    // Keep users that have actual orders or reviews
    const usersWithOrders = await Order.distinct('customer');
    const usersWithReviews = await Review.distinct('reviewer');
    const keepUserIds = [...new Set([...usersWithOrders, ...usersWithReviews])];
    
    // Also keep users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).select('_id');
    
    const recentUserIds = recentUsers.map(u => u._id.toString());
    const allKeepIds = [...new Set([...keepUserIds.map(id => id.toString()), ...recentUserIds])];
    
    const result = await User.deleteMany({
      _id: { $nin: allKeepIds },
      // Also delete users with test emails
      email: { $regex: /test|demo|fake|temp|example/i }
    });
    
    console.log(`   ✅ Deleted ${result.deletedCount} test users`);
    return result.deletedCount;
  } catch (error) {
    console.error('   ❌ Error cleaning test users:', error.message);
    return 0;
  }
}

async function cleanupOrphanedData() {
  console.log('\n🗑️  Cleaning up orphaned data...');
  
  let deleted = 0;
  
  try {
    // Clean up reviews without products
    const products = await Product.find().select('_id');
    const productIds = products.map(p => p._id);
    const reviewResult = await Review.deleteMany({
      product: { $nin: productIds }
    });
    deleted += reviewResult.deletedCount;
    console.log(`   ✅ Deleted ${reviewResult.deletedCount} orphaned reviews`);
    
    // Clean up orders without products
    const orderResult = await Order.deleteMany({
      product: { $nin: productIds }
    });
    deleted += orderResult.deletedCount;
    console.log(`   ✅ Deleted ${orderResult.deletedCount} orphaned orders`);
    
    // Clean up orders without customers
    const users = await User.find().select('_id');
    const userIds = users.map(u => u._id);
    const orderCustomerResult = await Order.deleteMany({
      customer: { $nin: userIds }
    });
    deleted += orderCustomerResult.deletedCount;
    console.log(`   ✅ Deleted ${orderCustomerResult.deletedCount} orders with invalid customers`);
    
  } catch (error) {
    console.error('   ❌ Error cleaning orphaned data:', error.message);
  }
  
  return deleted;
}

async function fullCleanup(options = {}) {
  const {
    keepRecentOrders = 50,
    keepRecentReviews = 100,
    keepRecentAuths = 50,
    cleanCommunityValidations = true,
    cleanPredictionMarkets = true,
    cleanProductLifecycles = true,
    cleanTestUsers = true,
    cleanOrphaned = true
  } = options;
  
  console.log('\n🧹 Starting Database Cleanup...');
  console.log('================================\n');
  
  // Show current stats
  await showCurrentStats();
  
  let totalDeleted = 0;
  
  // Cleanup operations
  if (cleanOrphaned) {
    totalDeleted += await cleanupOrphanedData();
  }
  
  totalDeleted += await cleanupOldOrders(keepRecentOrders);
  totalDeleted += await cleanupOldReviews(keepRecentReviews);
  totalDeleted += await cleanupReviewAuthentications(keepRecentAuths);
  
  if (cleanCommunityValidations) {
    totalDeleted += await cleanupCommunityValidations();
  }
  
  if (cleanPredictionMarkets) {
    totalDeleted += await cleanupPredictionMarkets();
  }
  
  if (cleanProductLifecycles) {
    totalDeleted += await cleanupProductLifecycles();
  }
  
  if (cleanTestUsers) {
    totalDeleted += await cleanupTestUsers();
  }
  
  // Show final stats
  console.log('\n📊 Final Database Statistics:');
  console.log('================================');
  await showCurrentStats();
  
  console.log(`\n✅ Cleanup complete! Total documents deleted: ${totalDeleted}`);
  
  return totalDeleted;
}

// Main execution
async function main() {
  await connectToDatabase();
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'stats') {
    await showCurrentStats();
  } else if (command === 'full') {
    // Full cleanup with default options
    await fullCleanup();
  } else if (command === 'aggressive') {
    // More aggressive cleanup
    await fullCleanup({
      keepRecentOrders: 20,
      keepRecentReviews: 50,
      keepRecentAuths: 20,
      cleanCommunityValidations: true,
      cleanPredictionMarkets: true,
      cleanProductLifecycles: true,
      cleanTestUsers: true,
      cleanOrphaned: true
    });
  } else {
    // Show usage
    console.log(`
📋 Database Cleanup Script
==========================

Usage:
  node cleanupDatabase.js [command]

Commands:
  stats       - Show current database statistics
  full        - Full cleanup (keeps 50 orders, 100 reviews, 50 auths)
  aggressive  - Aggressive cleanup (keeps 20 orders, 50 reviews, 20 auths)

Examples:
  node cleanupDatabase.js stats
  node cleanupDatabase.js full
  node cleanupDatabase.js aggressive

⚠️  WARNING: This will permanently delete data!
   Make sure you have a backup before running cleanup.
    `);
  }
  
  await mongoose.connection.close();
  console.log('\n👋 Disconnected from MongoDB');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fullCleanup, showCurrentStats };

