import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import apiService from '../services/api';
import websocketService from '../services/websocketService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    users: [],
    alerts: [],
    reviews: [],
    products: []
  });
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [liveActivity, setLiveActivity] = useState([]);
  const [behavioralTracking, setBehavioralTracking] = useState(false);
  const [currentTypingAnalysis, setCurrentTypingAnalysis] = useState(null);
  const [currentMouseAnalysis, setCurrentMouseAnalysis] = useState(null);
  const [behavioralStats, setBehavioralStats] = useState({
    totalSamples: 0,
    humanLikePatterns: 0,
    suspiciousPatterns: 0,
    lastAnalysis: null
  });

  useEffect(() => {
    initializeRealTimeConnection();
    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => {
      clearInterval(interval);
      websocketService.disconnect();
    };
  }, []);

  const initializeRealTimeConnection = () => {

    
    try {
      // Connect to WebSocket server
      websocketService.connect();
      
      // Subscribe to alerts
      websocketService.subscribeToAlerts({ severity: 'High' });
      
      // Setup event listeners for real-time updates
      websocketService.addEventListener('alert', handleRealTimeAlert);
      websocketService.addEventListener('trustScoreChange', handleTrustScoreChange);
      websocketService.addEventListener('marketplaceUpdate', handleMarketplaceUpdate);
      websocketService.addEventListener('typingAnalysis', handleTypingAnalysis);
      websocketService.addEventListener('newAlert', handleNewAlert);
      
      // Update connection status
      const updateConnectionStatus = () => {
        setConnectionStatus(websocketService.getConnectionStatus());
      };
      
      // Check connection status every 5 seconds
      const statusInterval = setInterval(updateConnectionStatus, 5000);
      updateConnectionStatus();
      
      return () => clearInterval(statusInterval);
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      addLiveActivity('❌ WebSocket connection failed', 'error');
    }
  };

  const handleRealTimeAlert = (alert) => {

    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
    addLiveActivity(`🚨 ALERT: ${alert.type} - ${alert.severity}`, 'alert');
  };

  const handleTrustScoreChange = (data) => {

    addLiveActivity(`📊 Trust score changed: ${data.change > 0 ? '+' : ''}${data.change}`, 'trust');
  };

  const handleMarketplaceUpdate = (data) => {

    addLiveActivity(`🛒 Marketplace: ${data.type || 'Activity detected'}`, 'marketplace');
  };

  const handleTypingAnalysis = (data) => {

    
    // Update current typing analysis state
    setCurrentTypingAnalysis(data.analysis);
    
    // Update behavioral statistics
    setBehavioralStats(prev => {
      const newStats = {
        ...prev,
        totalSamples: prev.totalSamples + 1,
        lastAnalysis: new Date().toLocaleTimeString()
      };
      
      if (data.analysis.classification.risk === 'Low') {
        newStats.humanLikePatterns = prev.humanLikePatterns + 1;
      } else if (data.analysis.classification.risk === 'High') {
        newStats.suspiciousPatterns = prev.suspiciousPatterns + 1;
      }
      
      return newStats;
    });
    
    // Add to live activity feed with detailed info
    const classification = data.analysis.classification;
    const variance = Math.round(data.analysis.variance);
    const confidence = classification.confidence;
    
    if (classification.risk === 'High') {
      addLiveActivity(`⚠️ SUSPICIOUS: ${classification.type} typing (${confidence}% confidence, variance: ${variance})`, 'behavior');
    } else if (classification.risk === 'Low') {
      addLiveActivity(`🧠 HUMAN-LIKE: Natural typing pattern detected (variance: ${variance})`, 'behavior');
    } else {
      addLiveActivity(`⌨️ ANALYSIS: ${classification.type} pattern (${confidence}% confidence)`, 'behavior');
    }
  };

  const handleNewAlert = (alert) => {

    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
  };

  const addLiveActivity = (message, type = 'info') => {
    const activity = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLiveActivity(prev => [activity, ...prev.slice(0, 19)]);
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch core dashboard data using apiService
      const [usersRes, alertsRes, reviewsRes, productsRes, alertStatsRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getAlerts(),
        apiService.getReviews(),
        apiService.getProducts(),
        apiService.getAlertStats()
      ]);

      setDashboardData({
        users: usersRes.data || [],
        alerts: alertsRes.data || [],
        reviews: reviewsRes.data || [],
        products: productsRes.data || []
      });

      setAlertStats(alertStatsRes.data || null);
      setLoading(false);
      addLiveActivity('📊 Dashboard data refreshed', 'system');
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
      addLiveActivity('❌ Dashboard refresh failed', 'error');
    }
  };

  const startBehavioralTracking = () => {
    if (dashboardData.users.length > 0) {
      const userId = dashboardData.users[0]._id;
      const trackingResult = websocketService.startBehavioralTracking(userId);
      
      if (trackingResult) {
        setBehavioralTracking(true);
        // Reset behavioral stats when starting new session
        setBehavioralStats({
          totalSamples: 0,
          humanLikePatterns: 0,
          suspiciousPatterns: 0,
          lastAnalysis: null
        });
        setCurrentTypingAnalysis(null);
        setCurrentMouseAnalysis(null);
        
        addLiveActivity(`TRACKING STARTED for user: ${userId.substring(0, 8)}...`, 'system');
        addLiveActivity('Collecting typing patterns every 10s, mouse data every 15s', 'system');
      } else {
        addLiveActivity('Failed to start tracking - WebSocket not connected', 'error');
      }
    } else {
      addLiveActivity('No users available for tracking', 'error');
    }
  };

  const stopBehavioralTracking = () => {
    websocketService.stopBehavioralTracking();
    setBehavioralTracking(false);
    addLiveActivity('🛑 Stopped behavioral tracking', 'system');
  };

  const calculateMetrics = () => {
    const totalUsers = dashboardData.users.length;
    const avgTrustScore = dashboardData.users.length > 0 
      ? (dashboardData.users.reduce((sum, user) => sum + (user.trustScore || 0), 0) / totalUsers).toFixed(1)
      : 0;
    
    // NOTE: Show total alerts (all statuses) to match MongoDB Atlas collection
    const totalAlerts = dashboardData.alerts.length;
    // Also calculate active alerts for reference
    const activeAlerts = dashboardData.alerts.filter(alert => alert.status === 'Active').length;
    
    // Calculate fraud detection rate based on authentic reviews vs total reviews
    const authenticReviews = dashboardData.reviews.filter(review => !review.isAIGenerated).length;
    const fraudDetectionRate = dashboardData.reviews.length > 0
      ? ((authenticReviews / dashboardData.reviews.length) * 100).toFixed(1)
      : 0;

    return { totalUsers, avgTrustScore, totalAlerts, activeAlerts, fraudDetectionRate };
  };

  const getTrustScoreChartData = () => {
    // Historical trust score data
    // Need endpoint: GET /api/users/trust-score-history or similar
    // Expected format: { dates: ['2024-01-01', ...], scores: [65, 72, 78, ...] }
    
    if (dashboardData.users.length === 0) {
      return {
        labels: ['No Data Available'],
        datasets: [{
          label: 'Average Trust Score',
          data: [0],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    // CURRENT: Using real current average trust score from MongoDB Atlas users
    const currentAvgScore = calculateMetrics().avgTrustScore;
    
    // When backend endpoint is ready, replace this with:
    // const historicalData = await apiService.getTrustScoreHistory();
    // return { labels: historicalData.dates, datasets: [{ data: historicalData.scores }] }
    
    return {
      labels: ['Current Score'],
      datasets: [{
        label: 'Average Trust Score',
        data: [currentAvgScore],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }]
    };
  };

  const getAlertDistributionData = () => {
    // VERIFIED: Using real alert data from MongoDB Atlas via apiService.getAlerts()
    if (dashboardData.alerts.length === 0) {
      return {
        labels: ['No Alerts Found'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 2,
        }]
      };
    }

    // Process real MongoDB Atlas alert data by severity
    const alertCounts = {
      Critical: dashboardData.alerts.filter(alert => alert.severity === 'Critical').length,
      High: dashboardData.alerts.filter(alert => alert.severity === 'High').length,
      Medium: dashboardData.alerts.filter(alert => alert.severity === 'Medium').length,
      Low: dashboardData.alerts.filter(alert => alert.severity === 'Low').length,
    };

    // Enhanced color scheme with better contrast
    const colors = { 
      Critical: '#8b5cf6', // Purple for critical
      High: '#ef4444',     // Red for high
      Medium: '#f59e0b',   // Amber for medium
      Low: '#10b981'       // Green for low
    };

    // Filter out zero counts for cleaner visualization
    const filteredLabels = [];
    const filteredData = [];
    const filteredColors = [];

    Object.entries(alertCounts).forEach(([severity, count]) => {
      if (count > 0) {
        filteredLabels.push(`${severity} (${count})`);
        filteredData.push(count);
        filteredColors.push(colors[severity]);
      }
    });

    // Fallback if all counts are zero
    if (filteredLabels.length === 0) {
      return {
        labels: ['No Active Alerts'],
        datasets: [{
          data: [1],
          backgroundColor: ['#10b981'],
          borderColor: ['#059669'],
          borderWidth: 2,
        }]
      };
    }

    return {
      labels: filteredLabels,
      datasets: [{
        data: filteredData,
        backgroundColor: filteredColors,
        borderColor: filteredColors.map(color => color),
        borderWidth: 2,
        hoverOffset: 4,
      }]
    };
  };

  // Placeholder function for future trust score history endpoint
  const getTrustScoreHistory = async () => {
    // Implement when backend endpoint is ready
    // Expected endpoint: GET /api/users/trust-score-history
    // Expected response: { dates: ['2024-01-01', '2024-01-02', ...], scores: [65, 72, 78, ...] }
    
    try {
      // const historyData = await apiService.getTrustScoreHistory();
      // return historyData;
      
      // For now, return null to indicate no historical data available
      return null;
    } catch (error) {
      console.error('Error fetching trust score history:', error);
      return null;
    }
  };

  // Enhanced chart options for better responsiveness and theming
  const getChartOptions = (chartType = 'line') => {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const tickColor = isDark ? '#9ca3af' : '#6b7280';

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: {
              size: 12,
              family: 'Inter, sans-serif'
            }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
        }
      }
    };

    if (chartType === 'line') {
      baseOptions.scales = {
        x: {
          ticks: { color: tickColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: tickColor },
          grid: { color: gridColor },
          beginAtZero: true,
          max: 100
        }
      };
    }

    return baseOptions;
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-900 dark:text-white">Loading TRUSTLENS Dashboard...</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Fetching real-time data from MongoDB Atlas</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-xl text-gray-900 dark:text-white mb-2">Dashboard Error</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">{error}</div>
          <button 
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header with Real-Time Status */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TRUSTLENS Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Real-time marketplace trust monitoring from MongoDB Atlas</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {connectionStatus.isConnected ? 'Real-Time Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={behavioralTracking ? stopBehavioralTracking : startBehavioralTracking}
                disabled={dashboardData.users.length === 0}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  behavioralTracking 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {behavioralTracking ? 'Stop Tracking' : 'Start Behavioral Tracking'}
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards - Using Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Live from database</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Trust Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.avgTrustScore}%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">AI-calculated</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <div className="w-6 h-6 bg-yellow-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalAlerts}</p>
                <p className="text-xs text-red-600 dark:text-red-400">All statuses</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <div className="w-6 h-6 bg-red-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeAlerts}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Real-time monitoring</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <div className="w-6 h-6 bg-purple-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Authentic Reviews</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.fraudDetectionRate}%</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">AI-verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Behavioral Tracking Panel - Only show when tracking is active */}
        {behavioralTracking && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🎯 Live Behavioral Analysis</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400">Tracking Active</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Analysis */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Pattern</h4>
                {currentTypingAnalysis ? (
                  <div className="space-y-2">
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      currentTypingAnalysis.classification.risk === 'High' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : currentTypingAnalysis.classification.risk === 'Low'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {currentTypingAnalysis.classification.type}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Confidence: {currentTypingAnalysis.classification.confidence}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Variance: {Math.round(currentTypingAnalysis.variance)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Consistency: {Math.round(currentTypingAnalysis.consistency * 100)}%
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Waiting for typing data...
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Session Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Total Samples:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{behavioralStats.totalSamples}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Human-like:</span>
                    <span className="font-medium text-green-600">{behavioralStats.humanLikePatterns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Suspicious:</span>
                    <span className="font-medium text-red-600">{behavioralStats.suspiciousPatterns}</span>
                  </div>
                  {behavioralStats.lastAnalysis && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Last Update:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{behavioralStats.lastAnalysis}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Classification Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI Analysis</h4>
                {behavioralStats.totalSamples > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600 dark:text-gray-300">Human Score:</span>
                        <span className="font-medium">
                          {Math.round((behavioralStats.humanLikePatterns / behavioralStats.totalSamples) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(behavioralStats.humanLikePatterns / behavioralStats.totalSamples) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {behavioralStats.suspiciousPatterns > behavioralStats.humanLikePatterns 
                        ? "⚠️ Potential bot behavior detected"
                        : "✅ Human-like patterns dominant"
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Collecting baseline data...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charts and Live Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Overview</h3>
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
              📊 Historical trend data needs backend endpoint
            </div>
            <div className="h-64">
              <Line data={getTrustScoreChartData()} options={getChartOptions('line')} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Alert Distribution</h3>
            <div className="text-sm text-green-600 dark:text-green-400 mb-2">
              ✅ Real data from MongoDB Atlas
            </div>
            <div className="h-64">
              <Doughnut data={getAlertDistributionData()} options={getChartOptions('doughnut')} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Live Activity Feed</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {liveActivity.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <div>No recent activity</div>
                </div>
              ) : (
                liveActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'alert' ? 'bg-red-500' :
                      activity.type === 'trust' ? 'bg-blue-500' :
                      activity.type === 'behavior' ? 'bg-yellow-500' :
                      activity.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{activity.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Alerts from Database */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts from Database</h3>
          </div>
          <div className="p-6">
            {[...realTimeAlerts, ...dashboardData.alerts].length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-2">✅</div>
                <div>No alerts found</div>
                <div className="text-sm mt-1">System is running smoothly</div>
              </div>
            ) : (
              [...realTimeAlerts, ...dashboardData.alerts].slice(0, 8).map((alert, index) => (
                <div key={alert._id || alert.id || index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      alert.severity === 'Critical' ? 'bg-purple-500' :
                      alert.severity === 'High' ? 'bg-red-500' :
                      alert.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{alert.type || 'Unknown Alert'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{alert.description || 'No description available'}</p>
                      {(alert.timestamp || alert.createdAt) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(alert.timestamp || alert.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.severity === 'Critical' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                    alert.severity === 'High' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    alert.severity === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                    'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  }`}>
                    {alert.severity || 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
