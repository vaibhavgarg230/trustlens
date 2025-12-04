import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  // Connect to WebSocket server
  connect(serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001') {
    if (this.socket) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket server...');
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    this.setupEventHandlers();
    return this.socket;
  }

  // Setup core event handlers
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
      this.authenticate();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('authenticated', (data) => {
      console.log('🔐 WebSocket authenticated:', data);
    });

    // Real-time alert handling
    this.socket.on('real_time_alert', (alert) => {
      console.log('🚨 Real-time alert received:', alert);
      this.notifyListeners('alert', alert);
    });

    // Trust score updates
    this.socket.on('trust_score_changed', (data) => {
      console.log('📊 Trust score changed:', data);
      this.notifyListeners('trustScoreChange', data);
    });

    // Marketplace updates
    this.socket.on('marketplace_update', (data) => {
      console.log('🛒 Marketplace update:', data);
      this.notifyListeners('marketplaceUpdate', data);
    });

    // Typing analysis results
    this.socket.on('typing_analysis_result', (data) => {
      console.log('⌨️ Typing analysis result:', data);
      this.notifyListeners('typingAnalysis', data);
    });

    // Mouse analysis results
    this.socket.on('mouse_analysis_result', (data) => {
      console.log('🖱️ Mouse analysis result:', data);
      this.notifyListeners('mouseAnalysis', data);
    });

    // New alerts
    this.socket.on('new_alert', (alert) => {
      console.log('🔔 New alert:', alert);
      this.notifyListeners('newAlert', alert);
    });
  }

  // Authenticate with server
  authenticate(userData = { username: 'Dashboard_User', role: 'admin' }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', userData);
    }
  }

  // Subscribe to alerts
  subscribeToAlerts(filters = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_alerts', filters);
      console.log('🔔 Subscribed to alerts with filters:', filters);
    }
  }

  // Send typing data for analysis
  sendTypingData(userId, typingCadence) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_data', {
        userId,
        typingCadence,
        timestamp: new Date()
      });
    }
  }

  // Send mouse data for analysis
  sendMouseData(userId, mouseMovements) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mouse_data', {
        userId,
        mouseMovements,
        timestamp: new Date()
      });
    }
  }

  // Send marketplace activity
  sendMarketplaceActivity(activity) {
    if (this.socket && this.isConnected) {
      this.socket.emit('marketplace_activity', activity);
    }
  }

  // Request trust score update
  requestTrustUpdate(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('request_trust_update', userId);
    }
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Notify all listeners for an event
  notifyListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Start real-time behavioral data collection
  // Note: Actual data collection should be done by RealTimeBehaviorTracker component
  // This method is kept for compatibility but does not generate fake data
  startBehavioralTracking(userId) {
    if (!this.isConnected) {
      console.warn('⚠️ WebSocket not connected. Cannot start behavioral tracking.');
      return;
    }

    console.log('🎯 Behavioral tracking ready for user:', userId);
    console.log('📝 Note: Use RealTimeBehaviorTracker component to collect real behavioral data');
    
    // Do not generate fake data - real data should come from RealTimeBehaviorTracker
    // This method is kept for API compatibility
    return { typingInterval: null, mouseInterval: null };
  }

  // Stop behavioral tracking
  stopBehavioralTracking() {
    // Cleanup is handled by RealTimeBehaviorTracker component
    console.log('🛑 Behavioral tracking stopped');
    this.trackingIntervals = null;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      transport: this.socket?.io?.engine?.transport?.name || null
    };
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.stopBehavioralTracking();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
