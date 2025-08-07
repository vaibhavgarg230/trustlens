// Trust Analyzer - Core AI Engine for TRUSTLENS
const User = require('../models/User');

class TrustAnalyzer {
  
  // Calculate user trust score based on behavioral data and IP uniqueness
  static async calculateTrustScore(user) {
    let score = 50; // Base score
    
    // Calculate real-time account age
    const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    
    // Account age factor (older accounts are more trusted)
    const ageBonus = Math.min(accountAge * 2, 20);
    score += ageBonus;
    
    // Get real transaction count from orders
    const Order = require('../models/Order');
    const transactionCount = await Order.countDocuments({ customer: user._id });
    
    // Transaction history factor
    const transactionBonus = Math.min(transactionCount * 0.5, 15);
    score += transactionBonus;
    
    // Behavioral consistency check
    if (user.behaviorData.typingCadence.length > 0) {
      const consistency = this.analyzeTypingConsistency(user.behaviorData.typingCadence);
      score += consistency * 10;
    }
    
    // IP-based identity verification
    const ipImpact = await this.calculateIPUniquenessScore(user);
    score += ipImpact.scoreAdjustment;
    
    // Recent activity factor (positive for moderate activity, negative for excessive)
    if (transactionCount > 0 && accountAge > 0) {
      const activityRate = transactionCount / accountAge;
      if (activityRate > 0.5 && activityRate < 2) {
        score += 5; // Healthy activity rate
      } else if (activityRate > 5) {
        score -= 10; // Excessive activity (suspicious)
      }
    }
    
    // Account age milestones
    if (accountAge > 365) {
      score += 10; // 1+ year account
    } else if (accountAge > 90) {
      score += 5; // 3+ months account
    } else if (accountAge < 7) {
      score -= 5; // Very new account
    }
    
    // Transaction milestones
    if (transactionCount > 20) {
      score += 5; // High transaction volume
    } else if (transactionCount > 5) {
      score += 3; // Moderate transaction volume
    } else if (transactionCount === 0) {
      score -= 5; // No transactions
    }
    
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    
    // Update user's trust score in database
    if (user.trustScore !== finalScore) {
      await User.findByIdAndUpdate(user._id, { 
        trustScore: finalScore,
        accountAge: accountAge,
        transactionCount: transactionCount
      });
    }
    
    return finalScore;
  }
  
  // IP Uniqueness Analysis - Core fraud detection feature
  static async calculateIPUniquenessScore(user) {
    if (!user.ipAddress) {
      return {
        scoreAdjustment: 0,
        usersWithSameIP: 0,
        ipStatus: 'No IP recorded',
        riskLevel: 'Unknown'
      };
    }
    
    try {
      // Count users with the same IP address
      const usersWithSameIP = await User.countDocuments({ 
        ipAddress: user.ipAddress,
        _id: { $ne: user._id } // Exclude current user
      });
      
      const totalUsersWithIP = usersWithSameIP + 1; // Include current user
      
      console.log(`🔍 IP Analysis for ${user.username}: ${user.ipAddress} - ${totalUsersWithIP} total users`);
      
      let scoreAdjustment = 0;
      let ipStatus = '';
      let riskLevel = 'Low';
      
      if (totalUsersWithIP === 1) {
        // Unique IP - trustworthy
        scoreAdjustment = +10;
        ipStatus = 'Unique IP';
        riskLevel = 'Low';
      } else if (totalUsersWithIP === 2) {
        // Shared with one other user - might be family/household
        scoreAdjustment = 0;
        ipStatus = 'Shared IP (2 users)';
        riskLevel = 'Low';
      } else if (totalUsersWithIP >= 3) {
        // Multiple users on same IP - suspicious
        scoreAdjustment = -15;
        ipStatus = `Shared IP (${totalUsersWithIP} users)`;
        riskLevel = 'High';
      }
      
      return {
        scoreAdjustment,
        usersWithSameIP: totalUsersWithIP - 1,
        totalUsersWithIP,
        ipStatus,
        riskLevel,
        ipAddress: user.ipAddress
      };
      
    } catch (error) {
      console.error('Error calculating IP uniqueness:', error);
      return {
        scoreAdjustment: 0,
        usersWithSameIP: 0,
        ipStatus: 'Error checking IP',
        riskLevel: 'Unknown'
      };
    }
  }
  
  // Get detailed IP analysis for a user
  static async getIPAnalysisDetails(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.ipAddress) {
        return null;
      }
      
      // Get all users with the same IP
      const usersWithSameIP = await User.find({ 
        ipAddress: user.ipAddress,
        _id: { $ne: userId }
      }).select('username email createdAt trustScore');
      
      const ipAnalysis = await this.calculateIPUniquenessScore(user);
      
      return {
        ...ipAnalysis,
        otherUsers: usersWithSameIP.map(u => ({
          username: u.username,
          email: u.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
          createdAt: u.createdAt,
          trustScore: u.trustScore
        }))
      };
      
    } catch (error) {
      console.error('Error getting IP analysis details:', error);
      return null;
    }
  }
  
  // Analyze typing cadence for bot detection
  static analyzeTypingConsistency(typingData) {
    if (typingData.length < 5) return 0;
    
    // Calculate variance in typing speed
    const mean = typingData.reduce((a, b) => a + b) / typingData.length;
    const variance = typingData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / typingData.length;
    
    // Human typing has natural variance, bots are too consistent
    const humanVariance = variance > 100 && variance < 10000;
    return humanVariance ? 1 : -1;
  }
  
  // Detect suspicious patterns with IP-based analysis
  static async detectSuspiciousActivity(user) {
    const alerts = [];
    
    // Check for bot-like typing patterns
    if (user.behaviorData.typingCadence.length > 0) {
      const consistency = this.analyzeTypingConsistency(user.behaviorData.typingCadence);
      if (consistency < 0) {
        alerts.push({
          type: 'Suspicious Typing Pattern',
          severity: 'High',
          description: 'Typing pattern suggests automated behavior'
        });
      }
    }
    
    // Check for rapid account creation and high activity
    if (user.accountAge < 7 && user.transactionCount > 10) {
      alerts.push({
        type: 'Rapid Activity',
        severity: 'Medium',
        description: 'High transaction volume for new account'
      });
    }
    
    // IP-based fraud detection
    const ipAnalysis = await this.calculateIPUniquenessScore(user);
    if (ipAnalysis.totalUsersWithIP >= 3) {
      alerts.push({
        type: 'Multiple Accounts Same IP',
        severity: 'High',
        description: `${ipAnalysis.totalUsersWithIP} accounts detected from IP ${ipAnalysis.ipAddress}`,
        metadata: {
          ipAddress: ipAnalysis.ipAddress,
          userCount: ipAnalysis.totalUsersWithIP
        }
      });
    }
    
    // Check for accounts created in quick succession from same IP
    if (user.ipAddress) {
      const recentAccountsFromIP = await User.find({
        ipAddress: user.ipAddress,
        createdAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      });
      
      if (recentAccountsFromIP.length > 2) {
        alerts.push({
          type: 'Rapid Account Creation',
          severity: 'Critical',
          description: `${recentAccountsFromIP.length} accounts created from same IP in 24 hours`,
          metadata: {
            ipAddress: user.ipAddress,
            recentAccountCount: recentAccountsFromIP.length
          }
        });
      }
    }
    
    return alerts;
  }
  
  // NEW: Calculate seller trust score based on product return rates (supports both Users and Vendors)
  static async calculateSellerTrustWithReturnRate(sellerId) {
    try {
      const Product = require('../models/Product');
      const User = require('../models/User');
      const Vendor = require('../models/Vendor');
      
      // Get all products for this seller
      const products = await Product.find({ seller: sellerId });
      
      if (products.length === 0) {
        console.log(`📊 No products found for seller ${sellerId}`);
        return null;
      }
      
      // Calculate aggregate return rate across all products
      let totalSold = 0;
      let totalReturned = 0;
      products.forEach(product => {
        totalSold += product.totalSold;
        totalReturned += product.totalReturned;
      });
      const overallReturnRate = totalSold > 0 ? (totalReturned / totalSold) * 100 : 0;

      // Proportional trust score formula
      let trustScore = 80 - (overallReturnRate * 0.5);
      trustScore = Math.max(0, Math.min(100, trustScore));

      // Try to find seller as User first, then as Vendor
      let seller = await User.findById(sellerId);
      let isVendor = false;
      if (!seller) {
        seller = await Vendor.findById(sellerId);
        isVendor = true;
      }
      if (!seller) {
        console.log(`❌ Seller not found: ${sellerId}`);
        return null;
      }

      // Update seller's trust score and return rate data
      const updateData = {
        trustScore: trustScore,
        totalSales: totalSold,
        totalReturns: totalReturned,
        overallReturnRate: overallReturnRate
      };
      if (isVendor) {
        await Vendor.findByIdAndUpdate(sellerId, updateData);
      } else {
        await User.findByIdAndUpdate(sellerId, updateData);
      }
      console.log(`🎯 ${isVendor ? 'Vendor' : 'User'} trust updated: ${seller.name || seller.username} - Return Rate: ${overallReturnRate.toFixed(2)}%, Trust: ${trustScore}`);
      return {
        sellerId,
        sellerName: seller.name || seller.username,
        sellerType: isVendor ? 'Vendor' : 'User',
        productCount: products.length,
        totalSold,
        totalReturned,
        overallReturnRate: parseFloat(overallReturnRate.toFixed(2)),
        oldTrustScore: seller.trustScore,
        newTrustScore: trustScore,
        trustScoreChange: trustScore - (seller.trustScore || 0)
      };
      
    } catch (error) {
      console.error('Error calculating seller trust with return rate:', error);
      return null;
    }
  }
  
  // NEW: Get seller return rate analytics (supports both Users and Vendors)
  static async getSellerReturnAnalytics(sellerId) {
    try {
      const Product = require('../models/Product');
      const User = require('../models/User');
      const Vendor = require('../models/Vendor');
      
      // Try to find seller as User first, then as Vendor
      let seller = await User.findById(sellerId);
      let isVendor = false;
      
      if (!seller) {
        seller = await Vendor.findById(sellerId);
        isVendor = true;
      }
      
      const products = await Product.find({ seller: sellerId });
      
      if (!seller || products.length === 0) {
        return null;
      }
      
      const analytics = {
        seller: {
          id: seller._id,
          username: seller.name || seller.username,
          email: seller.companyEmail || seller.email,
          type: isVendor ? 'Vendor' : 'User',
          currentTrustScore: seller.trustScore || 50
        },
        products: products.map(product => ({
          id: product._id,
          name: product.name,
          totalSold: product.totalSold,
          totalReturned: product.totalReturned,
          returnRate: product.returnRate,
          returnRateCategory: product.returnRate > 50 ? 'High' :
                             product.returnRate > 20 ? 'Medium' : 'Low',
          trustImpact: product.returnRate > 50 ? -15 :
                      product.returnRate > 20 ? -7 : +5
        })),
        summary: {
          totalProducts: products.length,
          totalSold: products.reduce((sum, p) => sum + p.totalSold, 0),
          totalReturned: products.reduce((sum, p) => sum + p.totalReturned, 0),
          averageReturnRate: products.length > 0 
            ? products.reduce((sum, p) => sum + p.returnRate, 0) / products.length 
            : 0,
          totalTrustImpact: products.reduce((sum, p) => {
            return sum + (p.returnRate > 50 ? -15 : p.returnRate > 20 ? -7 : +5);
          }, 0)
        }
      };
      
      return analytics;
      
    } catch (error) {
      console.error('Error getting seller return analytics:', error);
      return null;
    }
  }
}

module.exports = TrustAnalyzer;
