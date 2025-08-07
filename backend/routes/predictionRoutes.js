const express = require('express');
const router = express.Router();
const PredictionMarket = require('../models/PredictionMarket');
const PredictionAI = require('../utils/predictionAI');
const User = require('../models/User');

// Get all active prediction markets
router.get('/', async (req, res) => {
  try {
    const query = req.query.all === 'true' ? {} : { marketStatus: 'active' };
    const markets = await PredictionMarket.find(query)
      .populate('targetUser', 'username trustScore')
      .populate('bets.bettor', 'username')
      .sort({ createdAt: -1 });
    res.json(markets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new prediction market
router.post('/', async (req, res) => {
  try {
    const { targetUserId, marketType, predictionTarget, timeframeDays } = req.body;
    
    // Generate AI prediction for this market
    let aiPrediction;
    if (marketType === 'trust_score_prediction') {
      aiPrediction = await PredictionAI.predictTrustScore(
        targetUserId, 
        timeframeDays, 
        predictionTarget.value
      );
    } else if (marketType === 'fraud_likelihood') {
      aiPrediction = await PredictionAI.predictFraudLikelihood(targetUserId, timeframeDays);
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }
    
    const marketData = {
      targetUser: targetUserId,
      marketQuestion: req.body.marketQuestion || 
        `Will ${targetUser.username}'s trust score reach ${predictionTarget.value}+ in ${timeframeDays} days?`,
      marketType,
      predictionTarget: {
        value: predictionTarget.value,
        timeframe: timeframeDays,
        metric: predictionTarget.metric || 'trust_score'
      },
      aiPrediction,
      expiresAt: new Date(Date.now() + timeframeDays * 24 * 60 * 60 * 1000),
      createdBy: req.body.createdBy
    };
    
    const market = new PredictionMarket(marketData);
    await market.save();
    
    console.log(`📊 Created prediction market: ${market.marketQuestion}`);
    
    res.status(201).json({
      ...market.toObject(),
      aiPrediction
    });
  } catch (error) {
    console.error('Market creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Place a bet on a prediction market
router.post('/:id/bet', async (req, res) => {
  try {
    const { bettorId, prediction, amount, confidence } = req.body;
    
    const market = await PredictionMarket.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }
    
    if (market.marketStatus !== 'active') {
      return res.status(400).json({ message: 'Market is not active' });
    }
    
    // Calculate current odds
    market.updateOdds();
    const currentOdds = prediction === 'yes' ? market.currentOdds.yes : market.currentOdds.no;
    
    const bet = {
      bettor: bettorId,
      prediction,
      amount,
      odds: currentOdds,
      confidence: confidence || 75,
      timestamp: new Date()
    };
    
    market.bets.push(bet);
    market.updateOdds(); // Recalculate after adding bet
    
    await market.save();
    
    console.log(`💰 New bet placed: ${amount} on ${prediction} at ${currentOdds}x odds`);
    
    res.json({
      success: true,
      bet,
      newOdds: market.currentOdds,
      marketMetrics: market.marketMetrics
    });
  } catch (error) {
    console.error('Betting error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get market by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const market = await PredictionMarket.findById(req.params.id)
      .populate('targetUser', 'username trustScore accountAge transactionCount')
      .populate('bets.bettor', 'username trustScore');
    
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }
    
    res.json(market);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve a prediction market
router.post('/:id/resolve', async (req, res) => {
  try {
    const { actualValue, resolvedBy } = req.body;
    
    const market = await PredictionMarket.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }
    
    const resolved = market.resolveMarket(actualValue, resolvedBy);
    if (!resolved) {
      return res.status(400).json({ message: 'Market cannot be resolved' });
    }
    
    await market.save();
    
    // Calculate payouts for winners
    const winners = market.bets.filter(bet => bet.prediction === market.resolution.outcome);
    const totalWinningAmount = winners.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPool = market.totalPool;
    
    const payouts = winners.map(bet => ({
      bettor: bet.bettor,
      originalBet: bet.amount,
      payout: totalWinningAmount > 0 ? (bet.amount / totalWinningAmount) * totalPool : 0,
      profit: totalWinningAmount > 0 ? ((bet.amount / totalWinningAmount) * totalPool) - bet.amount : -bet.amount
    }));
    
    console.log(`🏁 Market resolved: ${market.resolution.outcome} (${payouts.length} winners)`);
    
    res.json({
      market,
      payouts,
      resolution: market.resolution
    });
  } catch (error) {
    console.error('Market resolution error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get AI-generated market suggestions
router.get('/suggestions/ai', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const suggestions = await PredictionAI.generateMarketSuggestions(limit);
    
    res.json({
      suggestions,
      count: suggestions.length,
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Market suggestions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get market statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await PredictionMarket.aggregate([
      {
        $group: {
          _id: '$marketStatus',
          count: { $sum: 1 },
          totalPool: { $sum: '$totalPool' },
          avgPool: { $avg: '$totalPool' }
        }
      }
    ]);
    
    const typeStats = await PredictionMarket.aggregate([
      {
        $group: {
          _id: '$marketType',
          count: { $sum: 1 },
          totalVolume: { $sum: '$totalPool' }
        }
      }
    ]);
    
    const totalBets = await PredictionMarket.aggregate([
      { $unwind: '$bets' },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalVolume: { $sum: '$bets.amount' },
          avgBetSize: { $avg: '$bets.amount' }
        }
      }
    ]);
    
    res.json({
      marketStats: stats,
      typeStats,
      bettingStats: totalBets[0] || { totalBets: 0, totalVolume: 0, avgBetSize: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's betting history
router.get('/user/:userId/bets', async (req, res) => {
  try {
    const markets = await PredictionMarket.find({
      'bets.bettor': req.params.userId
    }).populate('targetUser', 'username');
    
    const userBets = [];
    markets.forEach(market => {
      const userMarketBets = market.bets.filter(
        bet => bet.bettor.toString() === req.params.userId
      );
      userMarketBets.forEach(bet => {
        userBets.push({
          marketId: market._id,
          marketQuestion: market.marketQuestion,
          targetUser: market.targetUser,
          bet,
          marketStatus: market.marketStatus,
          resolution: market.resolution
        });
      });
    });
    
    res.json(userBets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
