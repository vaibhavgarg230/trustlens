import React, { useState, useEffect, useRef } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
import RealTimeBehaviorTracker from './RealTimeBehaviorTracker';

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
  const [showRealTimeTracker, setShowRealTimeTracker] = useState(false);

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
      websocketService.addEventListener('newAlert', handleNewAlert);
      websocketService.addEventListener('behavioralAnalysisResult', handleRealTimeAnalysisResult);
      
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
      addLiveActivity(' WebSocket connection failed', 'error');
    }
  };

  const handleRealTimeAlert = (alert) => {

    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
  };

  const handleTrustScoreChange = (data) => {

  };

  const handleMarketplaceUpdate = (data) => {

  };



  const handleNewAlert = (alert) => {

    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
  };

  const handleRealTimeAnalysisResult = (result) => {
    if (result.action === 'close') {
      setShowRealTimeTracker(false);
      return;
    }
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
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
      addLiveActivity('Dashboard refresh failed', 'error');
    }
  };

  const startBehavioralTracking = () => {
    setShowRealTimeTracker(true);
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
    // Trust Score Distribution - Show how many users fall into different trust score ranges
    
    if (dashboardData.users.length === 0) {
      return {
        labels: ['No Data Available'],
        datasets: [{
          label: 'Users',
          data: [0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        }]
      };
    }

    // Calculate distribution of users across trust score ranges
    const ranges = {
      '0-20%': dashboardData.users.filter(user => (user.trustScore || 0) <= 20).length,
      '21-40%': dashboardData.users.filter(user => (user.trustScore || 0) > 20 && (user.trustScore || 0) <= 40).length,
      '41-60%': dashboardData.users.filter(user => (user.trustScore || 0) > 40 && (user.trustScore || 0) <= 60).length,
      '61-80%': dashboardData.users.filter(user => (user.trustScore || 0) > 60 && (user.trustScore || 0) <= 80).length,
      '81-100%': dashboardData.users.filter(user => (user.trustScore || 0) > 80).length
    };

    // Color scheme for different trust levels
    const colors = {
      '0-20%': '#ef4444',     // Red for low trust
      '21-40%': '#f59e0b',    // Amber for medium-low trust
      '41-60%': '#eab308',    // Yellow for medium trust
      '61-80%': '#22c55e',    // Green for good trust
      '81-100%': '#10b981'    // Emerald for excellent trust
    };

    return {
      labels: Object.keys(ranges),
      datasets: [{
        label: 'Number of Users',
        data: Object.values(ranges),
        backgroundColor: Object.keys(ranges).map(range => colors[range]),
        borderColor: Object.keys(ranges).map(range => colors[range]),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
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
    } else if (chartType === 'bar') {
      baseOptions.scales = {
        x: {
          ticks: { color: tickColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: tickColor },
          grid: { color: gridColor },
          beginAtZero: true
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
          <div className="text-red-500 text-6xl mb-4"></div>
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
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={startBehavioralTracking}
                disabled={dashboardData.users.length === 0}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Behavioral Tracking
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards - Using Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers}</p>
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
              </div>
            </div>
          </div>


        </div>



        {/* Charts and Live Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Distribution</h3>
            <div className="text-sm text-green-600 dark:text-green-400 mb-2">
              Real data from MongoDB Atlas users
            </div>
            <div className="h-64">
              <Bar data={getTrustScoreChartData()} options={getChartOptions('bar')} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Alert Distribution</h3>
            <div className="text-sm text-green-600 dark:text-green-400 mb-2">
               Real data from MongoDB Atlas
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
                  <div>You will be notified in case of:</div>
                  <div className="text-sm mt-2 space-y-1">
                    <div>• New security alerts</div>
                    <div>• Trust score changes</div>
                    <div>• Marketplace activity</div>
                    <div>• System errors</div>
                  </div>
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
                <div className="text-4xl mb-2"></div>
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
        {/* Real-time Behavioral Tracker */}
        {showRealTimeTracker && (
          <RealTimeBehaviorTracker
            isActive={showRealTimeTracker}
            onAnalysisResult={handleRealTimeAnalysisResult}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
