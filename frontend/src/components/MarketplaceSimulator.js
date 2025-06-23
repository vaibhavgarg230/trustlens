import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const MarketplaceSimulator = () => {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [liveActivity, setLiveActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStats, setRealtimeStats] = useState({
    totalProducts: 0,
    fraudProducts: 0,
    fraudDetectionRate: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    fetchAllRealData();
    
    // Update activity and stats every 10 seconds
    const interval = setInterval(() => {
      fetchRealtimeStats();
      fetchRealtimeActivity();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllRealData = async () => {
    try {
      setLoading(true);
      
      // Fetch all real data in parallel
      const [productsRes, vendorsRes, statsRes, activityRes] = await Promise.all([
        apiService.getProducts(),
        apiService.getVendors(),
        apiService.getRealtimeStats(),
        apiService.getRealtimeActivity()
      ]);
      
      // Use REAL data only - no fallbacks
      const realProducts = (productsRes.data || []).map(product => ({
        ...product,
        // Use real authenticity score - no fallbacks
        authenticityScore: product.authenticityScore || 0,
        status: getProductStatus(product.authenticityScore || 0),
        image: getProductEmoji(product.category || product.name),
        // Use real review count from backend
        reviewCount: product.reviewCount || 0,
        // Vendor should already be populated from backend
        vendor: product.vendor || null,
        // Check if fraud flagged
        fraudFlagged: product.fraudFlagged || false
      }));

      setProducts(realProducts);
      setVendors(vendorsRes.data || []);
      setRealtimeStats(statsRes.data || {
        totalProducts: 0,
        fraudProducts: 0,
        fraudDetectionRate: 0,
        totalTransactions: 0
      });
      setLiveActivity(activityRes.data || []);
      
    } catch (error) {
      console.error('Error fetching real marketplace data:', error);
      // Show empty data if API fails - no mock fallbacks
      setProducts([]);
      setVendors([]);
      setRealtimeStats({
        totalProducts: 0,
        fraudProducts: 0,
        fraudDetectionRate: 0,
        totalTransactions: 0
      });
      setLiveActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const response = await apiService.getRealtimeStats();
      setRealtimeStats(response.data || {
        totalProducts: 0,
        fraudProducts: 0,
        fraudDetectionRate: 0,
        totalTransactions: 0
      });
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
    }
  };

  const fetchRealtimeActivity = async () => {
    try {
      const response = await apiService.getRealtimeActivity();
      setLiveActivity(response.data || []);
    } catch (error) {
      console.error('Error fetching realtime activity:', error);
    }
  };

  const getProductStatus = (score) => {
    if (score >= 85) return 'Verified';
    if (score >= 60) return 'Under Review';
    if (score < 60 && score > 0) return 'Flagged';
    return 'Unknown'; // For missing data
  };

  const getProductEmoji = (categoryOrName) => {
    const name = (categoryOrName || '').toLowerCase();
    if (name.includes('watch') || name.includes('time')) return '⌚';
    if (name.includes('bag') || name.includes('handbag')) return '👜';
    if (name.includes('laptop') || name.includes('computer')) return '💻';
    if (name.includes('phone') || name.includes('mobile')) return '📱';
    if (name.includes('shirt') || name.includes('cloth') || name.includes('denim') || name.includes('t-shirt')) return '👕';
    if (name.includes('shoe') || name.includes('boot') || name.includes('sneaker')) return '👟';
    if (name.includes('book')) return '📚';
    if (name.includes('headphone') || name.includes('audio')) return '🎧';
    if (name.includes('jewelry') || name.includes('necklace') || name.includes('bracelet') || name.includes('earring') || name.includes('pendant')) return '💎';
    if (name.includes('saree') || name.includes('dress')) return '👗';
    if (name.includes('camera') || name.includes('instax')) return '📷';
    if (name.includes('keyboard') || name.includes('techno')) return '⌨️';
    if (name.includes('graphics') || name.includes('card') || name.includes('gpu')) return '🖥️';
    if (name.includes('smartwatch') || name.includes('pulse')) return '⌚';
    return '📦'; // Default
  };

  const injectRealFraud = async () => {
    try {
      // Actually modify database records
      const response = await apiService.injectFraud();
      const { activities, updatedProducts } = response.data;
      
      // Add real fraud activities to live feed
      if (activities && activities.length > 0) {
        setLiveActivity(prev => [
          ...activities.map(activity => ({
            id: activity.id,
            message: activity.message,
            timestamp: new Date(activity.timestamp).toLocaleTimeString(),
            type: 'fraud'
          })),
          ...prev.slice(0, 12)
        ]);
      }
      
      // Refresh all data to show updated products
      setTimeout(() => {
        fetchAllRealData();
      }, 1000);
      
    } catch (error) {
      console.error('Error injecting real fraud:', error);
      
      // Add error activity
      setLiveActivity(prev => [{
      id: Date.now(),
        message: '❌ Fraud injection failed - Check backend connection',
      timestamp: new Date().toLocaleTimeString(),
        type: 'error'
      }, ...prev.slice(0, 14)]);
    }
  };

  // Real trust badge based on actual vendor trust scores
  const getTrustBadge = (vendor) => {
    if (!vendor || !vendor.name) {
      return { text: ' Missing Vendor', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '' };
    }
    
    const score = vendor.trustScore || 0;
    
    if (score >= 80) return { text: 'Elite Seller', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '' };
    if (score >= 60) return { text: 'Trusted', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '' };
    if (score >= 40) return { text: 'Verified', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '' };
    return { text: ' Low Trust', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '' };
  };

  // Real authenticity score colors based on actual scores
  const getAuthenticityColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score > 0) return 'bg-red-500';
    return 'bg-gray-400'; // For missing/unknown scores
  };

  const getAuthenticityText = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score > 0) return 'Poor';
    return ' Unknown';
  };

  // Real fraud detection rate with color coding
  const getFraudRateColor = (rate) => {
    if (rate >= 20) return 'text-red-600 dark:text-red-400';
    if (rate >= 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getFraudRateIcon = (rate) => {
    if (rate >= 20) return '';
    if (rate >= 10) return '';
    if (rate > 0) return '';
    return '✅';
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-3 text-lg text-gray-600 dark:text-gray-300">Loading real marketplace data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">TrustLens Marketplace</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Real-time fraud detection powered by MongoDB Atlas data</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
              <button 
                onClick={fetchAllRealData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Refresh Real Data</span>
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <button 
              onClick={injectRealFraud}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <span>⚡</span>
              <span>Inject Real Fraud</span>
            </button>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400"></span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Real Transactions</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{realtimeStats.totalTransactions}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">From MongoDB Atlas</p>
              </div>
        </div>
      </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400"></span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fraud Products</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{realtimeStats.fraudProducts}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Authenticity &lt; 70%</p>
              </div>
            </div>
        </div>
          
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400">{getFraudRateIcon(realtimeStats.fraudDetectionRate)}</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fraud Detection Rate</h3>
                <p className={`text-2xl font-bold ${getFraudRateColor(realtimeStats.fraudDetectionRate)}`}>
                  {realtimeStats.fraudDetectionRate}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {realtimeStats.fraudDetectionRate === 0 ? 'No frauds detected' : 'Real-time calculation'}
                </p>
        </div>
        </div>
      </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400"></span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Products Monitored</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{realtimeStats.totalProducts}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Live from database</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Product Grid */}
          <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2"></span>
                Real Product Listings
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({products.length} products)</span>
              </h3>
          </div>
          <div className="p-6">
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📦</div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No products available</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Please check your database connection</p>
                  <button 
                    onClick={fetchAllRealData}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => {
                    const trustBadge = getTrustBadge(product.vendor);
                    const authenticityColor = getAuthenticityColor(product.authenticityScore);
                    const authenticityText = getAuthenticityText(product.authenticityScore);
                    
                    return (
                      <div 
                        key={product._id} 
                        className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-105 ${
                          product.fraudFlagged || (product.authenticityScore < 70 && product.authenticityScore > 0)
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400' 
                            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-3xl">{product.image}</span>
                          <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'Verified' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      product.status === 'Flagged' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                              product.status === 'Under Review' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}>
                      {product.status}
                    </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${trustBadge.color}`}>
                              {trustBadge.icon} {trustBadge.text}
                            </span>
                            {product.fraudFlagged && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-200">
                                 FRAUD FLAGGED
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          by <span className="font-medium">{product.vendor?.name || ' Unknown Vendor'}</span>
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                          </span>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                               {product.reviewCount} reviews
                            </div>
                            <div className={`text-sm font-semibold ${
                              product.authenticityScore > 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                            }`}>
                              🔒 {product.authenticityScore > 0 ? `${product.authenticityScore.toFixed(1)}%` : ' Unknown'} authentic
                            </div>
                          </div>
                  </div>
                        
                        {/* Real Authenticity Score Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                            <span>Authenticity Score</span>
                            <span className={product.authenticityScore > 0 ? '' : 'text-red-600 dark:text-red-400'}>
                              {product.authenticityScore > 0 ? `${product.authenticityScore.toFixed(1)}%` : 'Unknown'}
                    </span>
                  </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                              className={`h-2 rounded-full transition-all duration-300 ${authenticityColor}`}
                              style={{ width: `${Math.max(product.authenticityScore || 0, 5)}%` }}
                      ></div>
                          </div>
                          <div className="text-right mt-1">
                            <span className={`text-xs font-medium ${
                              product.authenticityScore >= 90 ? 'text-green-600 dark:text-green-400' :
                              product.authenticityScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                              product.authenticityScore > 0 ? 'text-red-600 dark:text-red-400' :
                              'text-gray-500 dark:text-gray-400'
                            }`}>
                              {authenticityText}
                            </span>
                          </div>
                        </div>
                        
                        {/* Real Vendor Trust Info */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span> Trust: {product.vendor?.trustScore ? `${product.vendor.trustScore}%` : ' N/A'}</span>
                          <span> Return: {product.vendor?.returnRate !== undefined ? `${product.vendor.returnRate}%` : ' N/A'}</span>
                    </div>
                  </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

          {/* Real Live Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2"></span>
                Real Activity Feed
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">● LIVE</span>
              </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveActivity.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-2xl mb-2"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No recent activity</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Activity will appear from real database changes</p>
                  </div>
                ) : (
                  liveActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.type === 'fraud' ? 'bg-red-500 animate-pulse' : 
                        activity.type === 'warning' ? 'bg-yellow-500' :
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'error' ? 'bg-red-600' :
                        'bg-blue-500'
                  }`}></div>
                      <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                          activity.type === 'fraud' ? 'text-red-700 dark:text-red-300 font-medium' : 
                          activity.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300 font-medium' :
                          activity.type === 'success' ? 'text-green-700 dark:text-green-300' :
                          activity.type === 'error' ? 'text-red-800 dark:text-red-200 font-medium' :
                          'text-gray-700 dark:text-gray-300'
                    }`}>
                      {activity.message}
                    </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={fetchRealtimeActivity}
                  className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                >
                  🔄 Refresh Activity Feed
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default MarketplaceSimulator;
