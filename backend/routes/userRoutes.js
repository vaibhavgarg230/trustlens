const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TrustAnalyzer = require('../utils/trustAnalyzer');
const RealAIAnalyzer = require('../utils/realAIAnalyzer');
const { AlertSystem } = require('../utils/alertSystem');

// Initialize the real AI analyzer
const aiAnalyzer = new RealAIAnalyzer();

// Create a new user with ADVANCED AI behavioral analysis
router.post('/', async (req, res) => {
  try {
    const userData = req.body;
    
    console.log('🧠 Starting advanced AI behavioral analysis...');
    
    // Calculate basic trust score
    userData.trustScore = TrustAnalyzer.calculateTrustScore(userData);
    
    // REAL AI behavioral analysis if typing data exists
    if (userData.behaviorData && userData.behaviorData.typingCadence && userData.behaviorData.typingCadence.length > 0) {
      const behaviorAnalysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(
        userData.behaviorData.typingCadence,
        userData.behaviorData.mousePatterns || []
      );
      
      // Store detailed behavioral analysis
      userData.behaviorData.aiAnalysis = behaviorAnalysis;
      
      // Adjust trust score based on AI analysis
      if (behaviorAnalysis.classification === 'Bot') {
        userData.trustScore = Math.max(10, userData.trustScore - 40);
        userData.riskLevel = 'High';
      } else if (behaviorAnalysis.classification === 'Suspicious') {
        userData.trustScore = Math.max(20, userData.trustScore - 20);
        userData.riskLevel = 'Medium';
      }
      
      console.log(`🤖 Behavioral Analysis: ${behaviorAnalysis.classification} (${behaviorAnalysis.confidence}% confidence)`);
    }
    
    const user = new User(userData);
    await user.save();
    
    // Advanced alert checking with AI analysis
    await AlertSystem.checkUserBehavior(user);
    
    console.log(`✅ User created with AI-enhanced trust score: ${user.trustScore}%`);
    
    res.status(201).json({
      ...user.toObject(),
      aiEnhanced: true
    });
  } catch (error) {
    console.error('Error in AI user analysis:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID with detailed AI analysis and real-time calculations
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Calculate real-time account age
    const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    
    // Get real transaction count from orders
    const Order = require('../models/Order');
    const transactionCount = await Order.countDocuments({ customer: user._id });
    
    // Get real-time trust score calculation
    const realTimeTrustScore = await TrustAnalyzer.calculateTrustScore(user);
    
    // Calculate real-time risk level based on current data
    let realTimeRiskLevel = 'Medium';
    if (realTimeTrustScore >= 80) {
      realTimeRiskLevel = 'Low';
    } else if (realTimeTrustScore < 40) {
      realTimeRiskLevel = 'High';
    }
    
    // Get recent activity data
    const recentOrders = await Order.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('createdAt status totalAmount');
    
    // Calculate activity metrics
    const lastOrderDate = recentOrders.length > 0 ? recentOrders[0].createdAt : null;
    const totalSpent = recentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const daysSinceLastOrder = lastOrderDate ? Math.floor((new Date() - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24)) : null;
    
    // Add real-time behavioral analysis if data exists
    let enhancedUser = user.toObject();
    if (user.behaviorData.typingCadence.length > 0) {
      const realtimeAnalysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(user.behaviorData.typingCadence);
      enhancedUser.realtimeBehaviorAnalysis = realtimeAnalysis;
    }
    
    // Update user with real-time calculated values
    enhancedUser.accountAge = accountAge;
    enhancedUser.transactionCount = transactionCount;
    enhancedUser.trustScore = realTimeTrustScore;
    enhancedUser.riskLevel = realTimeRiskLevel;
    enhancedUser.recentActivity = {
      lastOrderDate,
      daysSinceLastOrder,
      totalSpent,
      recentOrders: recentOrders.length
    };
    enhancedUser.lastUpdated = new Date();
    
    // Update the database with real-time values
    await User.findByIdAndUpdate(user._id, {
      accountAge: accountAge,
      transactionCount: transactionCount,
      trustScore: realTimeTrustScore,
      riskLevel: realTimeRiskLevel
    });
    
    res.json(enhancedUser);
  } catch (error) {
    console.error('Error fetching user with real-time data:', error);
    res.status(500).json({ message: error.message });
  }
});

// REAL-TIME behavioral analysis endpoint
router.post('/:id/analyze-behavior', async (req, res) => {
  try {
    const { typingData, mouseData } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    console.log('🔍 Performing real-time behavioral analysis...');
    
    const behaviorAnalysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(typingData, mouseData);
    
    // Update user's behavioral data
    user.behaviorData.typingCadence = typingData;
    if (mouseData) user.behaviorData.mousePatterns = mouseData;
    user.behaviorData.aiAnalysis = behaviorAnalysis;
    
    // Recalculate trust score based on new analysis
    const oldTrustScore = user.trustScore;
    if (behaviorAnalysis.classification === 'Bot') {
      user.trustScore = Math.max(10, user.trustScore - 30);
      user.riskLevel = 'High';
    } else if (behaviorAnalysis.classification === 'Human') {
      user.trustScore = Math.min(100, user.trustScore + 10);
      user.riskLevel = user.riskLevel === 'High' ? 'Medium' : user.riskLevel;
    }
    
    await user.save();
    
    // Check for new alerts based on updated analysis
    await AlertSystem.checkUserBehavior(user);
    
    res.json({
      success: true,
      behaviorAnalysis,
      trustScoreChange: user.trustScore - oldTrustScore,
      newTrustScore: user.trustScore,
      riskLevel: user.riskLevel
    });
  } catch (error) {
    console.error('Real-time analysis error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user with AI-enhanced analysis
router.put('/:id', async (req, res) => {
  try {
    const userData = req.body;
    
    // Recalculate trust score with AI enhancement
    userData.trustScore = TrustAnalyzer.calculateTrustScore(userData);
    
    // AI behavioral analysis if new typing data
    if (userData.behaviorData && userData.behaviorData.typingCadence) {
      const behaviorAnalysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(userData.behaviorData.typingCadence);
      userData.behaviorData.aiAnalysis = behaviorAnalysis;
      
      // Adjust trust score based on AI analysis
      if (behaviorAnalysis.classification === 'Bot') {
        userData.trustScore = Math.max(10, userData.trustScore - 40);
      }
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, userData, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check for alerts with updated data
    await AlertSystem.checkUserBehavior(user);
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get suspicious activity alerts for a user
router.get('/:id/alerts', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Combine traditional and AI-powered alerts
    const traditionalAlerts = TrustAnalyzer.detectSuspiciousActivity(user);
    
    let aiAlerts = [];
    if (user.behaviorData.aiAnalysis) {
      aiAlerts = user.behaviorData.aiAnalysis.analysis.riskFactors.map(factor => ({
        type: 'AI Behavioral Analysis',
        severity: 'High',
        description: `AI detected: ${factor.replace('_', ' ')}`
      }));
    }
    
    res.json([...traditionalAlerts, ...aiAlerts]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get IP analysis for a user
router.get('/users/:id/ip-analysis', async (req, res) => {
  try {
    const ipAnalysis = await TrustAnalyzer.getIPAnalysisDetails(req.params.id);
    
    if (!ipAnalysis) {
      return res.status(404).json({ 
        error: 'IP analysis not available for this user',
        message: 'User not found or no IP address recorded'
      });
    }
    
    res.json({ 
      success: true,
      data: ipAnalysis 
    });
  } catch (error) {
    console.error('Error getting IP analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate trust score for a user (includes IP analysis)
router.post('/:id/recalculate-trust', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const newTrustScore = await TrustAnalyzer.calculateTrustScore(user);
    const ipAnalysis = await TrustAnalyzer.getIPAnalysisDetails(req.params.id);
    res.json({ 
      success: true,
      data: {
        userId: user._id,
        username: user.username,
        oldTrustScore: user.trustScore,
        newTrustScore: newTrustScore,
        ipAnalysis: ipAnalysis
      }
    });
  } catch (error) {
    console.error('Error recalculating trust score:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Get seller return rate analytics
router.get('/:id/seller-analytics', async (req, res) => {
  try {
    const TrustAnalyzer = require('../utils/trustAnalyzer');
    const analytics = await TrustAnalyzer.getSellerReturnAnalytics(req.params.id);
    
    if (!analytics) {
      return res.status(404).json({ message: 'Seller analytics not found' });
    }
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// NEW: Recalculate seller trust score with return rate
router.post('/:id/recalculate-seller-trust', async (req, res) => {
  try {
    const TrustAnalyzer = require('../utils/trustAnalyzer');
    const result = await TrustAnalyzer.calculateSellerTrustWithReturnRate(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Unable to recalculate seller trust score' });
    }
    
    res.json({
      success: true,
      message: 'Seller trust score recalculated based on return rates',
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// NEW: Get linguistic analysis for a user
router.get('/:id/linguistic-analysis', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's review history
    const Review = require('../models/Review');
    const LinguisticAnalyzer = require('../utils/linguisticAnalyzer');
    const linguisticAnalyzer = new LinguisticAnalyzer();

    const userReviews = await Review.find({ reviewer: req.params.id })
      .select('content enhancedFingerprint enhancedAuthenticity behaviorMetrics createdAt')
      .sort({ createdAt: -1 })
      .limit(50); // Analyze last 50 reviews

    let linguisticProfile = {
      sentenceVariety: 50,
      emotionalAuthenticity: 50,
      specificDetails: 50,
      vocabularyComplexity: 50,
      grammarScore: 50,
      overallAuthenticity: 50,
      reviewCount: userReviews.length,
      analysisMethod: 'profile_based'
    };

    if (userReviews.length > 0) {
      // Analyze all reviews to create comprehensive linguistic profile
      const allReviewContent = userReviews.map(r => r.content).join(' ');
      const combinedFingerprint = linguisticAnalyzer.generateLinguisticFingerprint(
        allReviewContent,
        {} // No behavioral metrics for historical analysis
      );

      // Calculate average metrics from individual reviews
      const totalMetrics = {
        sentenceVariety: 0,
        emotionalAuthenticity: 0,
        specificDetails: 0,
        vocabularyComplexity: 0,
        grammarScore: 0,
        authenticityScore: 0
      };

      let validReviews = 0;
      userReviews.forEach(review => {
        if (review.enhancedFingerprint) {
          const fingerprint = review.enhancedFingerprint;
          const authenticity = review.enhancedAuthenticity;

          // Calculate sentence variety from fingerprint data
          const sentenceVariety = Math.min(100, Math.max(0, 
            (fingerprint.avgWordsPerSentence / 20) * 100 + 
            (fingerprint.sentenceCount / userReviews.length) * 10
          ));

          // Calculate emotional authenticity from sentiment score
          const emotionalAuthenticity = Math.min(100, Math.max(0, 
            50 + (fingerprint.sentimentScore * 100)
          ));

          // Calculate specific details from vocabulary richness
          const specificDetails = Math.min(100, Math.max(0, 
            fingerprint.vocabularyRichness * 100
          ));

          // Calculate vocabulary complexity
          const vocabularyComplexity = Math.min(100, Math.max(0, 
            (fingerprint.avgCharsPerWord / 8) * 100 + 
            (fingerprint.vocabularyRichness * 50)
          ));

          // Calculate grammar score from punctuation and capitalization patterns
          const grammarScore = Math.min(100, Math.max(0, 
            50 + (fingerprint.punctuationDensity * 200) + 
            (fingerprint.capitalizationRatio * 100)
          ));

          totalMetrics.sentenceVariety += sentenceVariety;
          totalMetrics.emotionalAuthenticity += emotionalAuthenticity;
          totalMetrics.specificDetails += specificDetails;
          totalMetrics.vocabularyComplexity += vocabularyComplexity;
          totalMetrics.grammarScore += grammarScore;
          totalMetrics.authenticityScore += authenticity?.authenticityScore || 50;
          validReviews++;
        }
      });

      if (validReviews > 0) {
        linguisticProfile = {
          sentenceVariety: Math.round(totalMetrics.sentenceVariety / validReviews),
          emotionalAuthenticity: Math.round(totalMetrics.emotionalAuthenticity / validReviews),
          specificDetails: Math.round(totalMetrics.specificDetails / validReviews),
          vocabularyComplexity: Math.round(totalMetrics.vocabularyComplexity / validReviews),
          grammarScore: Math.round(totalMetrics.grammarScore / validReviews),
          overallAuthenticity: Math.round(totalMetrics.authenticityScore / validReviews),
          reviewCount: userReviews.length,
          analysisMethod: 'review_based',
          lastReviewDate: userReviews[0].createdAt,
          averageReviewLength: Math.round(allReviewContent.length / userReviews.length),
          linguisticFingerprint: {
            vocabularyRichness: combinedFingerprint.vocabularyRichness,
            commonWordsRatio: combinedFingerprint.commonWordsRatio,
            sentimentScore: combinedFingerprint.sentimentScore,
            punctuationDensity: combinedFingerprint.punctuationDensity,
            capitalizationRatio: combinedFingerprint.capitalizationRatio,
            repetitionScore: combinedFingerprint.repetitionScore,
            avgWordsPerSentence: combinedFingerprint.avgWordsPerSentence,
            avgCharsPerWord: combinedFingerprint.avgCharsPerWord
          }
        };
      }
    } else {
      // Fallback: Generate linguistic profile based on user characteristics
      const trustFactor = user.trustScore / 100;
      const accountAge = user.createdAt ? 
        Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) : 
        user.accountAge || 0;
      const ageFactor = Math.min(accountAge / 365, 1);
      const transactionCount = user.transactionCount || 0;
      const activityFactor = Math.min(transactionCount / 100, 1);
      linguisticProfile = {
        sentenceVariety: Math.round((trustFactor * 0.4 + ageFactor * 0.6) * 100),
        emotionalAuthenticity: Math.round((trustFactor * 0.5 + ageFactor * 0.3 + activityFactor * 0.2) * 100),
        specificDetails: Math.round((activityFactor * 0.4 + trustFactor * 0.6) * 100),
        vocabularyComplexity: Math.round((ageFactor * 0.3 + trustFactor * 0.4 + activityFactor * 0.3) * 100),
        grammarScore: Math.round((trustFactor * 0.6 + ageFactor * 0.4) * 100),
        overallAuthenticity: Math.round((trustFactor * 0.7 + ageFactor * 0.3) * 100),
        reviewCount: 0,
        analysisMethod: 'profile_based',
        profileFactors: {
          trustScore: user.trustScore,
          accountAge: accountAge,
          transactionCount: transactionCount,
          riskLevel: user.riskLevel
        }
      };
    }

    res.json({
      success: true,
      userId: req.params.id,
      username: user.username,
      linguisticProfile,
      analysisTimestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error performing linguistic analysis',
      error: error.message 
    });
  }
});

module.exports = router;
