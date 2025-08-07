import React, { useState, useEffect, useRef } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import apiService from '../services/api';

// Simple toast notification system
const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

const ProductTracker = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [returnAnalytics, setReturnAnalytics] = useState(null);
  const [sellerAnalytics, setSellerAnalytics] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [buttonLoading, setButtonLoading] = useState({});
  const [trustScoreHighlight, setTrustScoreHighlight] = useState(false);
  const prevTrustScoreRef = useRef(null);

  useEffect(() => {
    fetchProductData();
  }, []);

  useEffect(() => {
    // Highlight trust score if it changes
    if (analytics && analytics.trust && typeof analytics.trust.authenticityScore === 'number') {
      const currentScore = analytics.trust.authenticityScore;
      if (prevTrustScoreRef.current !== null && prevTrustScoreRef.current !== currentScore) {
        setTrustScoreHighlight(true);
        showToast('Trust score updated!', 'success');
        setTimeout(() => setTrustScoreHighlight(false), 1200);
      }
      prevTrustScoreRef.current = currentScore;
    }
  }, [analytics?.trust?.authenticityScore]);

  const fetchProductData = async () => {
    try {
      // Use apiService instead of direct fetch
      const productsResponse = await apiService.getProducts();
      const productsData = productsResponse.data;
      setProducts(productsData);

      if (productsData.length > 0) {
        const firstProduct = productsData[0];
        setSelectedProduct(firstProduct);
        await fetchProductAnalytics(firstProduct._id);
        await fetchProductTimeline(firstProduct._id);
        await fetchReturnAnalytics(firstProduct._id);
        
        // Fetch seller analytics if seller exists
        if (firstProduct.seller && firstProduct.seller._id) {
          await fetchSellerAnalytics(firstProduct.seller._id);
        }
      }

      // Fetch seller insights (using first product's seller)
      if (productsData.length > 0 && productsData[0].seller) {
        try {
          const response = await apiService.getProductLifecycleInsights(productsData[0].seller._id || productsData[0].seller);
          setInsights(response.data);
        } catch (error) {
          console.error('Error fetching insights:', error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching product data:', error);
      setLoading(false);
    }
  };

  const fetchProductAnalytics = async (productId) => {
    try {
      const response = await apiService.getProductLifecycleAnalytics(productId);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Initialize lifecycle if it doesn't exist
      await initializeLifecycle(productId);
    }
  };

  const fetchProductTimeline = async (productId) => {
    try {
      const response = await apiService.getProductLifecycleTimeline(productId);
      setTimeline(response.data.timeline || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const fetchReturnAnalytics = async (productId) => {
    try {
      const response = await apiService.getProductReturnAnalytics(productId);
      setReturnAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching return analytics:', error);
      setReturnAnalytics(null);
    }
  };

  const fetchSellerAnalytics = async (sellerId) => {
    try {
      // Try user analytics first, then vendor analytics
      let response;
      try {
        response = await apiService.getSellerAnalytics(sellerId);
      } catch (userError) {
        // If user analytics fails, try vendor analytics
        response = await apiService.getVendorAnalytics(sellerId);
      }
      setSellerAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching seller analytics:', error);
      setSellerAnalytics(null);
    }
  };

  const fetchAuditLogs = async (productId) => {
    try {
      const response = await apiService.getProductAuditLogs(productId);
      setAuditLogs(response.data.auditLogs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
    }
  };

  const initializeLifecycle = async (productId) => {
    try {
      await apiService.initializeProductLifecycle({
        productId,
        sellerId: selectedProduct?.seller || '6841c7373efc698423881aff',
        initialPrice: selectedProduct?.price || 0
      });

      await fetchProductAnalytics(productId);
      await fetchProductTimeline(productId);
    } catch (error) {
      console.error('Error initializing lifecycle:', error);
    }
  };

  const handleProductChange = async (productId) => {
    const product = products.find(p => p._id === productId);
    setSelectedProduct(product);
    // Always try to fetch analytics, and if missing, initialize lifecycle
    try {
      await fetchProductAnalytics(productId);
    } catch (error) {
      await initializeLifecycle(productId);
      await fetchProductAnalytics(productId);
    }
    await fetchProductTimeline(productId);
    await fetchReturnAnalytics(productId);
    await fetchAuditLogs(productId);
    // Fetch seller analytics if seller exists
    if (product.seller && product.seller._id) {
      await fetchSellerAnalytics(product.seller._id);
    }
  };

  const progressStage = async (newStage) => {
    try {
      await apiService.progressProductLifecycle({
        productId: selectedProduct._id,
        newStage,
        performedBy: selectedProduct.seller || '6841c7373efc698423881aff',
        details: { timestamp: new Date(), action: `Progressed to ${newStage}` }
      });

      await fetchProductAnalytics(selectedProduct._id);
      await fetchProductTimeline(selectedProduct._id);
      showToast(`Product progressed to ${newStage} stage!`, 'success');
    } catch (error) {
      console.error('Error progressing stage:', error);
    }
  };

  const trackView = async () => {
    try {
      await apiService.trackProductView({
        productId: selectedProduct._id,
        viewerId: '6841c7373efc698423881aff'
      });

      await fetchProductAnalytics(selectedProduct._id);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // NEW: Track product purchase
  const trackPurchase = async () => {
    setButtonLoading(prev => ({ ...prev, purchase: true }));
    try {
      const response = await apiService.trackProductPurchase(selectedProduct._id);

      
      // Refresh data
      await fetchProductData();
      await fetchAuditLogs(selectedProduct._id);
      showToast('Purchase tracked successfully!', 'success');
    } catch (error) {
      console.error('Error tracking purchase:', error);
      showToast('Error tracking purchase', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, purchase: false }));
    }
  };

  // NEW: Track product return
  const trackReturn = async () => {
    setButtonLoading(prev => ({ ...prev, return: true }));
    try {
      const reason = prompt('Enter return reason (optional):') || 'No reason specified';
      const response = await apiService.trackProductReturn(selectedProduct._id, reason);

      
      // Refresh data
      await fetchProductData();
      await fetchAuditLogs(selectedProduct._id);
      showToast('Return tracked successfully!', 'success');
    } catch (error) {
      console.error('Error tracking return:', error);
      showToast('Error tracking return', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, return: false }));
    }
  };

  // NEW: Recalculate seller trust score
  const recalculateSellerTrust = async () => {
    if (!selectedProduct.seller || !selectedProduct.seller._id) {
      showToast('No seller information available', 'error');
      return;
    }

    setButtonLoading(prev => ({ ...prev, trust: true }));
    try {
      // Try user trust recalculation first, then vendor
      let response;
      try {
        response = await apiService.recalculateSellerTrust(selectedProduct.seller._id);
      } catch (userError) {
        response = await apiService.recalculateVendorTrust(selectedProduct.seller._id);
      }
      // Use backend-calculated trust score and update UI
      if (response && response.data && response.data.data) {
        const { newTrustScore, oldTrustScore, returnRatePenalties, overallReturnRate } = response.data.data;
        // Optionally, update sellerAnalytics in state if needed
        await fetchSellerAnalytics(selectedProduct.seller._id);
        showToast(`Trust score updated: ${oldTrustScore} → ${newTrustScore} (Return Rate: ${overallReturnRate.toFixed(2)}%, Penalty/Bonus: ${returnRatePenalties})`, 'success');
      } else {
        showToast('Trust score recalculated, but no data returned.', 'warning');
      }
    } catch (error) {
      console.error('Error recalculating seller trust:', error);
      showToast('Error recalculating seller trust', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, trust: false }));
    }
  };

  // NEW: Fetch detailed analytics for modal
  const fetchDetailedAnalytics = async (productId) => {
    try {
      setDetailedAnalytics(null);
      const [returnAnalyticsRes, productRes] = await Promise.all([
        apiService.getProductReturnAnalytics(productId),
        apiService.getProductById(productId)
      ]);
      
      const analytics = {
        product: productRes.data,
        returns: returnAnalyticsRes.data,
        returnReasons: {}
      };
      
      // Process return reasons for chart
      if (returnAnalyticsRes.data.returns && returnAnalyticsRes.data.returns.length > 0) {
        returnAnalyticsRes.data.returns.forEach(ret => {
          const reason = ret.reason || 'unspecified';
          const friendlyReason = reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          analytics.returnReasons[friendlyReason] = (analytics.returnReasons[friendlyReason] || 0) + 1;
        });
      }
      
      setDetailedAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
    }
  };

  // NEW: Open details modal
  const openDetailsModal = async (product) => {
    setShowDetailsModal(true);
    await fetchDetailedAnalytics(product._id);
  };

  // NEW: Check if product should be flagged
  const getProductFlags = (product) => {
    const flags = [];
    
    // High return rate flag
    if (product.returnRate > 50) {
      flags.push({
        type: 'critical',
        icon: '',
        label: 'Critical Return Rate',
        description: `${product.returnRate}% return rate detected. Severe trust penalty applied.`,
        color: 'bg-red-100 text-red-800 border-red-200'
      });
    } else if (product.returnRate >= 30 && product.returnRate <= 50) {
      flags.push({
        type: 'warning',
        icon: '',
        label: 'High Return Rate',
        description: `${product.returnRate}% return rate detected. Trust penalty applied.`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      });
    }
    
    // Rapid returns flag
    if (product.totalReturned >= 3 && product.totalSold > 0) {
      const rapidReturnRate = (product.totalReturned / product.totalSold) * 100;
      if (rapidReturnRate > 75) {
        flags.push({
          type: 'critical',
          icon: '',
          label: 'Rapid Returns',
          description: `${product.totalReturned} returns out of ${product.totalSold} sales. Possible fraud pattern.`,
          color: 'bg-red-100 text-red-800 border-red-200'
        });
      }
    }
    
    // New product with returns flag
    const productAge = product.createdAt ? (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24) : 0;
    if (productAge <= 30 && product.returnRate > 25) {
      flags.push({
        type: 'warning',
        icon: '',
        label: 'New Product Flag',
        description: `New product (${Math.round(productAge)} days) with ${product.returnRate}% returns.`,
        color: 'bg-orange-100 text-orange-800 border-orange-200'
      });
    }
    
    return flags;
  };

  const getStageColor = (stage) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'listed': 'bg-blue-100 text-blue-800',
      'promoted': 'bg-purple-100 text-purple-800',
      'sold': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-200 text-green-900',
      'reviewed': 'bg-indigo-100 text-indigo-800',
      'archived': 'bg-gray-200 text-gray-600'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  // NEW: Get return rate badge styling
  const getReturnRateBadge = (returnRate) => {
    if (returnRate > 50) {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '🔴',
        label: 'High',
        description: 'High return rate - Trust penalty applied'
      };
    } else if (returnRate > 20) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '🟡',
        label: 'Medium',
        description: 'Medium return rate - Minor trust penalty'
      };
    } else {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '🟢',
        label: 'Low',
        description: 'Low return rate - Trust bonus applied'
      };
    }
  };

  const getPerformanceChartData = () => {
    if (!analytics) return { labels: [], datasets: [] };

    return {
      labels: ['Views', 'Inquiries', 'Favorites'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          analytics.performance.views || 0,
          analytics.performance.inquiries || 0,
          analytics.performance.favorites || 0
        ],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 2
      }]
    };
  };

  const getTrustTrendData = () => {
    if (!analytics?.trust?.trustTrend) return { labels: [], datasets: [] };

    const trend = analytics.trust.trustTrend.slice(-7); // Last 7 entries
    return {
      labels: trend.map((_, i) => `Day ${i + 1}`),
      datasets: [{
        label: 'Trust Score',
        data: trend.map(t => t.score),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Product Tracker...</div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Product Lifecycle Tracker</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor product journey from creation to completion</p>
            {selectedProduct && (
              <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mt-4">{selectedProduct.name}</h3>
            )}
          </div>

          {/* Product Selection */}
          {/* Remove the product selection dropdown section */}
          {/* Find and delete the <div> that contains the label 'Select Product:' and the <select> element */}

            {/* Action Buttons Section */}
            <div className="p-4 rounded bg-gray-50 dark:bg-gray-700 shadow-sm mt-4 w-full">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Actions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={trackView}
                  className="bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Track View
                </button>
                <button
                  onClick={() => progressStage('listed')}
                  className="bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  List Product
                </button>
                <button
                  onClick={() => progressStage('promoted')}
                  className="bg-purple-600 hover:bg-purple-700 focus:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Promote
                </button>
                <button
                  onClick={() => progressStage('sold')}
                  className="bg-yellow-600 hover:bg-yellow-700 focus:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Mark Sold
                </button>
                
                <button
                  onClick={trackPurchase}
                  disabled={buttonLoading.purchase}
                  className="bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  {buttonLoading.purchase ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>Track Purchase</>
                  )}
                </button>
                <button
                  onClick={trackReturn}
                  disabled={buttonLoading.return}
                  className="bg-red-600 hover:bg-red-700 focus:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {buttonLoading.return ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>Track Return</>
                  )}
                </button>
                <button
                  onClick={recalculateSellerTrust}
                  disabled={buttonLoading.trust}
                  className="bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {buttonLoading.trust ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>Update Trust</>
                  )}
                </button>
              </div>
            </div>

          </div>

          {selectedProduct && (
            <>
              {/* Product Flags Alert (if any) */}
              {getProductFlags(selectedProduct).length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-yellow-50 dark:from-red-900/20 dark:to-yellow-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                        Product Flagged - Requires Attention
                      </h3>
                      <div className="mt-2 space-y-1">
                        {getProductFlags(selectedProduct).map((flag, index) => (
                          <div key={index} className="text-sm text-red-700 dark:text-red-300">
                            <span className="font-medium">{flag.label}:</span> {flag.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Lifecycle Stepper */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
                <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Product Lifecycle Journey</h3>
                <div className="flex items-center justify-between overflow-x-auto pb-4">
                  {[
                    { key: 'draft', label: 'Draft', icon: '📝', color: 'gray' },
                    { key: 'listed', label: 'Listed', icon: '🏪', color: 'blue' },
                    { key: 'promoted', label: 'Promoted', icon: '⭐', color: 'purple' },
                    { key: 'sold', label: 'Sold', icon: '💰', color: 'green' },
                    { key: 'delivered', label: 'Delivered', icon: '📦', color: 'emerald' },
                    { key: 'reviewed', label: 'Reviewed', icon: '⭐', color: 'indigo' }
                  ].map((stage, index, stages) => {
                    const currentStage = analytics?.summary?.currentStage || 'draft';
                    const currentIndex = stages.findIndex(s => s.key === currentStage);
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    const stageTimeline = timeline.find(t => t.stage === stage.key);
                    
                    return (
                      <div key={stage.key} className="flex items-center">
                        {/* Stage Circle */}
                        <div className="flex flex-col items-center">
                          <div 
                            className={`
                              relative flex items-center justify-center w-12 h-12 rounded-full border-2 
                              transition-all duration-300
                              ${isActive ? `bg-${stage.color}-500 border-${stage.color}-500 text-white shadow-lg` : ''}
                              ${isCompleted ? `bg-green-500 border-green-500 text-white` : ''}
                              ${!isActive && !isCompleted ? `bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-700 dark:border-gray-600` : ''}
                            `}
                          >
                            <span className="text-lg">
                              {isCompleted ? '✅' : stage.icon}
                            </span>
                            
                            {/* Pulse animation for current stage */}
                            {isActive && (
                              <div className={`absolute inset-0 rounded-full bg-${stage.color}-500 animate-ping opacity-25`}></div>
                            )}
                          </div>
                          
                          {/* Stage Label */}
                          <div className="mt-2 text-center min-w-0">
                            <div className={`text-sm font-medium ${isActive ? `text-${stage.color}-600 dark:text-${stage.color}-400` : 'text-gray-600 dark:text-gray-300'}`}>
                              {stage.label}
                            </div>
                            {stageTimeline && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(stageTimeline.timestamp).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Connector Line */}
                        {index < stages.length - 1 && (
                          <div className={`
                            h-0.5 w-16 mx-4 transition-colors duration-300
                            ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                          `}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Return Status (if applicable) */}
                {selectedProduct && (selectedProduct.totalReturned > 0 || selectedProduct.returnRate > 0) && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-red-600 dark:text-red-400 text-lg">🔄</span>
                        <div>
                          <div className="text-sm font-medium text-red-800 dark:text-red-200">Returns Detected</div>
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {selectedProduct.totalReturned} of {selectedProduct.totalSold} sold items returned ({selectedProduct.returnRate}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                
              </div>

              {/* NEW: Return Analytics & Seller Analytics */}
              {(returnAnalytics || sellerAnalytics) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Return Analytics */}
                  {returnAnalytics && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Return Analytics</h3>
                      </div>
                      <div className="p-6">
                        {/* Horizontal Responsive Grid for Return Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow p-4 transition-colors duration-200">
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {returnAnalytics.totalSold}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Total Sold</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow p-4 transition-colors duration-200">
                            <div className="text-xl font-bold text-red-600 dark:text-red-400">
                              {returnAnalytics.totalReturned}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Total Returned</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow p-4 transition-colors duration-200">
                            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {returnAnalytics.returnRate}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Return Rate</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow p-4 transition-colors duration-200">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReturnRateBadge(returnAnalytics.returnRate).color}`}>
                                {getReturnRateBadge(returnAnalytics.returnRate).icon} {getReturnRateBadge(returnAnalytics.returnRate).label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Return Category</div>
                          </div>
                        </div>
                        
                        {/* Trust Impact Description */}
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Impact Details:</span> {returnAnalytics.trustImpact.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Seller Analytics */}
                  {sellerAnalytics && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seller Analytics</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{sellerAnalytics.seller.username}</p>
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">Current Trust Score:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{Number(sellerAnalytics.seller.currentTrustScore).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Lifecycle Timeline</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {timeline.length > 0 ? timeline.map((event, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className={`w-3 h-3 rounded-full mt-2 ${getStageColor(event.stage).includes('green') ? 'bg-green-500' : 
                          getStageColor(event.stage).includes('blue') ? 'bg-blue-500' :
                          getStageColor(event.stage).includes('yellow') ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">{event.action}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(event.stage)}`}>
                              {event.stage}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                              By {event.performedBy} • {new Date(event.timestamp).toLocaleString()}
                          </p>

                          {event.details && Object.keys(event.details).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {JSON.stringify(event.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <p>No timeline events yet.</p>
                        <p className="text-sm">Track views or progress stages to see activity!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Return Details Modal */}
              {showDetailsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return Analytics Details</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {detailedAnalytics?.product?.name || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDetailsModal(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6">
                      {detailedAnalytics ? (
                        <div className="space-y-6">
                          {/* Summary Stats - 5 Metric Cards in Responsive Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-colors duration-200">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {detailedAnalytics.returns?.totalSold || 0}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Total Sold</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-colors duration-200">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {detailedAnalytics.returns?.totalReturned || 0}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Total Returned</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-colors duration-200">
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {detailedAnalytics.returns?.returnRate || 0}%
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Return Rate</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-colors duration-200">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {detailedAnalytics.returns?.returnRateCategory || 
                                  (detailedAnalytics.returns?.returnRate > 50 ? 'High' :
                                   detailedAnalytics.returns?.returnRate > 20 ? 'Medium' : 'Low')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Return Category</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-colors duration-200">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-full ${
                                  (detailedAnalytics.returns?.returnRate || 0) > 50 ? 'bg-red-500' :
                                  (detailedAnalytics.returns?.returnRate || 0) > 20 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                  {(detailedAnalytics.returns?.returnRate || 0) > 50 ? 'Red' :
                                   (detailedAnalytics.returns?.returnRate || 0) > 20 ? 'Yellow' : 'Green'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">Badge Color</div>
                            </div>
                          </div>

                          {/* Return Reasons Chart */}
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Return Reasons Breakdown</h4>
                            {Object.keys(detailedAnalytics.returnReasons).length > 0 ? (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chart */}
                                <div className="h-64">
                                  <Doughnut 
                                    data={{
                                      labels: Object.keys(detailedAnalytics.returnReasons),
                                      datasets: [{
                                        data: Object.values(detailedAnalytics.returnReasons),
                                        backgroundColor: [
                                          '#ef4444', '#f97316', '#eab308', 
                                          '#22c55e', '#3b82f6', '#8b5cf6',
                                          '#ec4899', '#14b8a6'
                                        ],
                                        borderWidth: 2,
                                        borderColor: '#ffffff'
                                      }]
                                    }}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: 'right',
                                          labels: {
                                            color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
                                            usePointStyle: true,
                                            padding: 20
                                          }
                                        },
                                        tooltip: {
                                          callbacks: {
                                            label: (context) => {
                                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                                            }
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Breakdown List */}
                                <div className="space-y-3">
                                  {Object.entries(detailedAnalytics.returnReasons).map(([reason, count]) => (
                                    <div key={reason} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">{reason}</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{count} returns</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          ({((count / (detailedAnalytics.returns?.totalReturned || 1)) * 100).toFixed(1)}%)
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">📊</div>
                                <p className="text-gray-600 dark:text-gray-300">No return reasons recorded yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Data will appear here after customers return items</p>
                              </div>
                            )}
                          </div>

                          {/* Recent Returns */}
                          {detailedAnalytics.returns?.returns && detailedAnalytics.returns.returns.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Returns</h4>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {detailedAnalytics.returns.returns.slice(0, 10).map((returnItem, index) => (
                                  <div key={index} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {returnItem.reason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unspecified'}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(returnItem.returnDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {returnItem.reasonText && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                          "{returnItem.reasonText}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading detailed analytics...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      
    </>
  );
};

export default ProductTracker;
