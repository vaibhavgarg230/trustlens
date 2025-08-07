const mongoose = require('mongoose');

const predictionMarketSchema = new mongoose.Schema({
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  marketQuestion: {
    type: String,
    required: true,
    // e.g., "Will user123's trust score be above 70 in 30 days?"
  },
  marketType: {
    type: String,
    enum: ['trust_score_prediction', 'fraud_likelihood', 'account_longevity', 'transaction_success'],
    required: true
  },
  predictionTarget: {
    value: Number, // Target value (e.g., trust score of 70)
    timeframe: Number, // Days from now
    metric: String // What we're predicting
  },
  totalPool: {
    type: Number,
    default: 0
  },
  bets: [{
    bettor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    prediction: {
      type: String,
      enum: ['yes', 'no'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    odds: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    confidence: {
      type: Number,
      min: 1,
      max: 100
    }
  }],
  currentOdds: {
    yes: {
      type: Number,
      default: 1.5
    },
    no: {
      type: Number,
      default: 1.5
    }
  },
  marketStatus: {
    type: String,
    enum: ['active', 'closed', 'resolved', 'cancelled'],
    default: 'active'
  },
  resolution: {
    outcome: {
      type: String,
      enum: ['yes', 'no', 'cancelled']
    },
    actualValue: Number,
    resolvedAt: Date,
    resolvedBy: {
      type: String,
      enum: ['system', 'admin', 'community']
    }
  },
  aiPrediction: {
    prediction: {
      type: String,
      enum: ['yes', 'no']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    reasoning: [String],
    modelVersion: String
  },
  marketMetrics: {
    totalBettors: {
      type: Number,
      default: 0
    },
    yesPercentage: {
      type: Number,
      default: 50
    },
    noPercentage: {
      type: Number,
      default: 50
    },
    volumeWeightedOdds: Number,
    liquidityScore: Number
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate market liquidity
predictionMarketSchema.methods.calculateLiquidity = function() {
  const totalVolume = this.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const uniqueBettors = new Set(this.bets.map(bet => bet.bettor.toString())).size;
  return Math.min(100, (totalVolume / 100) * (uniqueBettors / 10) * 10);
};

// Update odds based on betting patterns
predictionMarketSchema.methods.updateOdds = function() {
  const yesBets = this.bets.filter(bet => bet.prediction === 'yes');
  const noBets = this.bets.filter(bet => bet.prediction === 'no');
  
  const yesAmount = yesBets.reduce((sum, bet) => sum + bet.amount, 0);
  const noAmount = noBets.reduce((sum, bet) => sum + bet.amount, 0);
  
  const total = yesAmount + noAmount;
  
  if (total > 0) {
    this.marketMetrics.yesPercentage = (yesAmount / total) * 100;
    this.marketMetrics.noPercentage = (noAmount / total) * 100;
    
    // Calculate odds (inverse probability with house edge)
    this.currentOdds.yes = total > 0 ? Math.max(1.1, (total * 0.95) / Math.max(yesAmount, 1)) : 1.5;
    this.currentOdds.no = total > 0 ? Math.max(1.1, (total * 0.95) / Math.max(noAmount, 1)) : 1.5;
  }
  
  this.marketMetrics.totalBettors = new Set(this.bets.map(bet => bet.bettor.toString())).size;
  this.totalPool = total;
  this.marketMetrics.liquidityScore = this.calculateLiquidity();
};

// Resolve market based on actual outcome
predictionMarketSchema.methods.resolveMarket = function(actualValue, resolvedBy = 'system') {
  if (this.marketStatus !== 'active') return false;
  
  // Convert actualValue to number to handle string inputs
  const numericValue = Number(actualValue);
  
  let outcome;
  if (this.marketType === 'trust_score_prediction') {
    outcome = numericValue >= this.predictionTarget.value ? 'yes' : 'no';
  } else if (this.marketType === 'fraud_likelihood') {
    // For fraud likelihood: 1 = fraud detected (YES), 0 = no fraud (NO)
    outcome = numericValue === 1 ? 'yes' : 'no';
    console.log(`🔍 Fraud resolution: actualValue=${actualValue}, numericValue=${numericValue}, outcome=${outcome}`);
  } else {
    // Default logic for other market types
    outcome = numericValue ? 'yes' : 'no';
  }
  
  this.resolution = {
    outcome,
    actualValue: numericValue,
    resolvedAt: new Date(),
    resolvedBy
  };
  
  this.marketStatus = 'resolved';
  return true;
};

module.exports = mongoose.model('PredictionMarket', predictionMarketSchema);
