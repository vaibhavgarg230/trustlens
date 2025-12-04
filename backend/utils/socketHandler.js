// Real-time WebSocket handler for TRUSTLENS
const RealAIAnalyzer = require('./realAIAnalyzer');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.aiAnalyzer = new RealAIAnalyzer();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);
      
      // Handle user authentication/identification
      socket.on('authenticate', (userData) => {
        this.connectedUsers.set(socket.id, userData);
        socket.emit('authenticated', { success: true, socketId: socket.id });
        console.log(`✅ User authenticated: ${userData.username || 'Anonymous'}`);
      });

      // Real-time typing analysis
      socket.on('typing_data', (data) => {
        this.handleTypingAnalysis(socket, data);
      });

      // Real-time mouse movement tracking
      socket.on('mouse_data', (data) => {
        this.handleMouseAnalysis(socket, data);
      });

      // Trust score updates
      socket.on('request_trust_update', (userId) => {
        this.sendTrustScoreUpdate(socket, userId);
      });

      // Alert subscriptions
      socket.on('subscribe_alerts', (filters) => {
        socket.join('alerts');
        if (filters.severity) socket.join(`alerts_${filters.severity}`);
        socket.emit('alert_subscription_confirmed', filters);
      });

      // Marketplace activity tracking
      socket.on('marketplace_activity', (activity) => {
        this.broadcastMarketplaceActivity(activity);
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        this.connectedUsers.delete(socket.id);
      });
    });
  }

  // Handle real-time typing analysis with IP-based fraud detection
  async handleTypingAnalysis(socket, data) {
    try {
      const { userId, typingCadence, timestamp } = data;
      
      // Use RealAIAnalyzer with IP analysis integration
      const analysis = await this.aiAnalyzer.analyzeTypingBehaviorAdvanced(
        typingCadence, 
        [], // No mouse data in this call
        userId // Pass userId for IP analysis
      );
      
      console.log('🤖 Advanced AI Analysis with IP integration:', analysis);
      
      // Emit comprehensive analysis results
      socket.emit('typing_analysis_result', {
        userId,
        typingCadence,
        analysis,
        timestamp
      });

      // Broadcast to dashboard if suspicious or high IP risk
      if (analysis.classification.risk === 'High' || 
          (analysis.ipAnalysis && analysis.ipAnalysis.riskLevel === 'High')) {
        this.io.to('alerts').emit('real_time_alert', {
          type: analysis.ipAnalysis && analysis.ipAnalysis.riskLevel === 'High' 
                ? 'Multiple Accounts Same IP' 
                : 'Suspicious Typing Pattern',
          userId,
          severity: 'High',
          data: { 
            typingCadence, 
            analysis,
            ipAnalysis: analysis.ipAnalysis 
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Advanced typing analysis error:', error);
      socket.emit('analysis_error', { message: 'Advanced typing analysis failed' });
    }
  }

  // Handle real-time mouse movement analysis
  handleMouseAnalysis(socket, data) {
    const { userId, mouseMovements, timestamp } = data;
    
    const analysis = this.analyzeMouseMovements(mouseMovements);
    
    socket.emit('mouse_analysis_result', {
      userId,
      analysis,
      timestamp
    });

    // Check for bot-like mouse patterns
    if (analysis.isBot) {
      this.io.to('alerts').emit('real_time_alert', {
        type: 'Bot Mouse Pattern',
        userId,
        severity: 'High',
        data: { mouseMovements, analysis },
        timestamp: new Date()
      });
    }
  }

  // Send trust score updates
  async sendTrustScoreUpdate(socket, userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        socket.emit('trust_update_error', { message: 'User not found' });
        return;
      }

      // Calculate trend from previous trust score (if available)
      let trend = 'stable';
      if (user.behaviorData?.aiAnalysis?.classification) {
        const classification = user.behaviorData.aiAnalysis.classification;
        if (classification.type === 'Human') {
          trend = 'increasing';
        } else if (classification.type === 'Bot') {
          trend = 'decreasing';
        }
      }

      const trustData = {
        userId,
        currentScore: user.trustScore,
        trend: trend,
        lastUpdated: user.updatedAt || user.createdAt,
        riskLevel: user.riskLevel
      };

      socket.emit('trust_score_update', trustData);
    } catch (error) {
      console.error('Error fetching trust score:', error);
      socket.emit('trust_update_error', { message: 'Failed to fetch trust score' });
    }
  }

  // Broadcast marketplace activity
  broadcastMarketplaceActivity(activity) {
    this.io.emit('marketplace_update', {
      ...activity,
      timestamp: new Date(),
      connectedUsers: this.connectedUsers.size
    });
  }

  // Broadcast alerts to all subscribers
  broadcastAlert(alert) {
    this.io.to('alerts').emit('new_alert', {
      ...alert,
      timestamp: new Date()
    });

    // Send to specific severity channels
    if (alert.severity) {
      this.io.to(`alerts_${alert.severity}`).emit('severity_alert', alert);
    }
  }

  // Broadcast trust score changes
  broadcastTrustScoreChange(userId, oldScore, newScore, reason) {
    this.io.emit('trust_score_changed', {
      userId,
      oldScore,
      newScore,
      change: newScore - oldScore,
      reason,
      timestamp: new Date()
    });
  }

  // Broadcast review status updates for real-time dashboard updates
  broadcastReviewStatusUpdate(reviewId, newStatus, adminId) {
    console.log(`📡 Broadcasting review status update: ${reviewId} -> ${newStatus}`);
    
    this.io.emit('review_status_update', {
      type: 'review_status_update',
      reviewId,
      newStatus,
      adminId,
      timestamp: new Date()
    });
  }

  // Broadcast bulk operation completion
  broadcastBulkOperationComplete(operation, successful, failed, adminId) {
    console.log(`📡 Broadcasting bulk operation: ${operation} - ${successful} successful, ${failed} failed`);
    
    this.io.emit('bulk_operation_complete', {
      type: 'bulk_operation_complete',
      operation,
      successful,
      failed,
      adminId,
      timestamp: new Date()
    });
  }

  // Helper methods for analysis
  calculateVariance(data) {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }

  calculateConsistency(data) {
    const variance = this.calculateVariance(data);
    return variance === 0 ? 1 : Math.max(0, 1 - variance / 1000);
  }

  classifyTypingPattern(data) {
    const variance = this.calculateVariance(data);
    const consistency = this.calculateConsistency(data);
    
    if (variance === 0) {
      return { type: 'Bot', confidence: 95, risk: 'High' };
    } else if (variance < 25) {
      return { type: 'Suspicious', confidence: 78, risk: 'Medium' };
    } else {
      return { type: 'Human', confidence: 85, risk: 'Low' };
    }
  }

  analyzeMouseMovements(movements) {
    if (!movements || movements.length < 10) {
      return { isBot: false, confidence: 0, reason: 'Insufficient data' };
    }

    // Check for perfectly straight lines (bot behavior)
    let straightLines = 0;
    for (let i = 2; i < movements.length; i++) {
      const dx1 = movements[i-1].x - movements[i-2].x;
      const dy1 = movements[i-1].y - movements[i-2].y;
      const dx2 = movements[i].x - movements[i-1].x;
      const dy2 = movements[i].y - movements[i-1].y;
      
      // Check if movement is perfectly linear
      if (dx1 !== 0 && dy1 !== 0 && dx2 !== 0 && dy2 !== 0) {
        if (Math.abs(dy1/dx1 - dy2/dx2) < 0.01) {
          straightLines++;
        }
      }
    }

    const straightLineRatio = straightLines / (movements.length - 2);
    const isBot = straightLineRatio > 0.7; // Too many straight lines = bot

    return {
      isBot,
      confidence: Math.round(straightLineRatio * 100),
      straightLineRatio,
      reason: isBot ? 'Too many perfect straight lines' : 'Natural mouse movement'
    };
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.connectedUsers.size,
      activeRooms: this.io.sockets.adapter.rooms.size
    };
  }
}

module.exports = SocketHandler;
