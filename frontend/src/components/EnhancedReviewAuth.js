import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { apiService } from '../services/api';

const EnhancedReviewAuth = () => {
  const [reviews, setReviews] = useState([]);
  const [authRecords, setAuthRecords] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [authDetails, setAuthDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [buttonLoading, setButtonLoading] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  
  // Bulk Actions State
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Advanced Filtering State
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    authenticatedPercentage: 0,
    suspiciousPercentage: 0,
    fakePercentage: 0,
    averageScore: 0,
    trustScoreImpact: 0,
    dailyTrends: []
  });

  useEffect(() => {
    fetchReviewData();
    
    // WebSocket connection for real-time updates
    const socket = new WebSocket('ws://localhost:3001');
    
    socket.onopen = () => {

    };
    
    socket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);

        
        if (update.type === 'review_status_update') {
          showToast(`📡 Review ${update.reviewId} status updated to ${update.newStatus}`, 'success');
          fetchReviewData(); // Live refresh
        } else if (update.type === 'bulk_operation_complete') {
          showToast(`📡 Bulk operation completed: ${update.successful} successful, ${update.failed} failed`, 'success');
          fetchReviewData();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {

    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Cleanup WebSocket on unmount
    return () => {
      socket.close();
    };
  }, []);

  // Toast notification system
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      
      // Use apiService instead of direct fetch
      const reviewsResponse = await apiService.getReviews();
      const reviewsData = reviewsResponse.data || [];
      setReviews(reviewsData);

      // Fetch authentication records for reviews
      const authPromises = reviewsData.map(async (review) => {
        try {
          if (!review || !review._id) return null;
          
          const authResponse = await apiService.getEnhancedReviewSummary(review._id);
          return { reviewId: review._id, ...authResponse.data };
        } catch (error) {
          console.error('Error fetching auth data for review:', review?._id, error);
          return null;
        }
      });

      const authResults = await Promise.all(authPromises);
      const validAuthRecords = authResults.filter(record => record !== null && record.reviewId);
      setAuthRecords(validAuthRecords);
      
      calculateStats(validAuthRecords);
      await fetchDailyTrends(); // Fetch analytics data
      setLoading(false);
    } catch (error) {
      console.error('Error fetching review data:', error);
      showToast('Failed to load review data. Please try again.', 'error');
      setReviews([]);
      setAuthRecords([]);
      setLoading(false);
    }
  };

  const calculateStats = (authData) => {
    const stats = {
      total: authData.length,
      authentic: authData.filter(a => a.status === 'authentic').length,
      suspicious: authData.filter(a => a.status === 'suspicious').length,
      fake: authData.filter(a => a.status === 'fake').length,
      investigating: authData.filter(a => a.status === 'requires_investigation').length,
      avgScore: authData.length > 0 ? 
        Math.round(authData.reduce((sum, a) => sum + (a.authenticityScore ?? 100), 0) / authData.length) : 0
    };
    setStats(stats);
    
    // Calculate enhanced analytics
    calculateAnalytics(authData);
  };

  const calculateAnalytics = (authData) => {
    const total = authData.length;
    if (total === 0) {
      setAnalytics({
        totalReviews: 0,
        authenticatedPercentage: 0,
        suspiciousPercentage: 0,
        fakePercentage: 0,
        averageScore: 0,
        trustScoreImpact: 0,
        dailyTrends: []
      });
      return;
    }

    const authentic = authData.filter(a => a.status === 'authentic').length;
    const suspicious = authData.filter(a => a.status === 'suspicious').length;
    const fake = authData.filter(a => a.status === 'fake').length;
    const avgScore = Math.round(authData.reduce((sum, a) => sum + (a.authenticityScore ?? 100), 0) / total);
    
    // Calculate trust score impact (higher authentic % = positive impact)
    const trustScoreImpact = Math.round(((authentic / total) * 100) - ((fake / total) * 100));

    setAnalytics({
      totalReviews: total,
      authenticatedPercentage: Math.round((authentic / total) * 100),
      suspiciousPercentage: Math.round((suspicious / total) * 100),
      fakePercentage: Math.round((fake / total) * 100),
      averageScore: avgScore,
      trustScoreImpact: trustScoreImpact,
      dailyTrends: [] // Will be populated by fetchDailyTrends
    });
  };

  const fetchDailyTrends = async () => {
    try {
      const response = await apiService.getDailyReviewStats();
      const dailyData = response.data;
      
      setAnalytics(prev => ({
        ...prev,
        dailyTrends: dailyData
      }));
    } catch (error) {
      console.error('Error fetching daily trends:', error);
      // Fallback to empty data if API fails - no mock data
      setAnalytics(prev => ({
        ...prev,
        dailyTrends: []
      }));
    }
  };

  const authenticateReview = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [reviewId]: true }));
      
      const sourceData = {
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'browser_fingerprint',
        browserInfo: 'Chrome/91.0'
      };

      const response = await apiService.authenticateReview(reviewId, sourceData);
      const result = response.data;
      
      showToast(
        `Authentication completed! Score: ${result.authenticityScore ?? 100}%, Status: ${result.status}`,
        (result.authenticityScore ?? 100) > 70 ? 'success' : 'warning'
      );
      
      await fetchReviewData();
    } catch (error) {
      console.error('Error authenticating review:', error);
      showToast('Failed to authenticate review. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const viewAuthDetails = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [`details_${reviewId}`]: true }));
      
      const response = await apiService.getAuthenticationDetails(reviewId);
      const details = response.data;
      setAuthDetails(details);
    } catch (error) {
      console.error('Error fetching auth details:', error);
      showToast('Failed to load authentication details. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [`details_${reviewId}`]: false }));
    }
  };

  // Manual Review Action Functions
  const approveReview = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [`approve_${reviewId}`]: true }));
      
      // Find the auth record for this review - try multiple matching strategies
      let authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
      
      // If not found, try matching with reviewId as ObjectId string
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId.toString() === reviewId.toString());
      }
      
      // If still not found, try matching with review._id
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId._id === reviewId);
      }
      
      if (!authRecord) {
        showToast('Authentication record not found for this review', 'error');
        return;
      }

      const decision = {
        status: 'authentic',
        confidence: 95,
        reasoning: 'Manually approved by administrator',
        decidedBy: 'admin_user',
        decidedAt: new Date()
      };

      const response = await apiService.updateReviewDecision(authRecord._id, decision);
      showToast('Review approved successfully ✅', 'success');
      await fetchReviewData(); // Refresh data
    } catch (error) {
      console.error('❌ Error approving review:', error);
      showToast('Failed to approve review. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [`approve_${reviewId}`]: false }));
    }
  };

  const rejectReview = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [`reject_${reviewId}`]: true }));
      
      // Find the auth record for this review - try multiple matching strategies
      let authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
      
      // If not found, try matching with reviewId as ObjectId string
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId.toString() === reviewId.toString());
      }
      
      // If still not found, try matching with review._id
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId._id === reviewId);
      }
      
      if (!authRecord) {
        showToast('Authentication record not found for this review', 'error');
        return;
      }

      const decision = {
        status: 'suspicious',
        confidence: 85,
        reasoning: 'Manually rejected by administrator',
        decidedBy: 'admin_user',
        decidedAt: new Date()
      };

      const response = await apiService.updateReviewDecision(authRecord._id, decision);
      showToast('Review rejected ❌', 'warning');
      await fetchReviewData();
    } catch (error) {
      console.error('❌ Error rejecting review:', error);
      showToast('Failed to reject review. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [`reject_${reviewId}`]: false }));
    }
  };

  const escalateReview = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [`escalate_${reviewId}`]: true }));
      
      // Find the auth record for this review - try multiple matching strategies
      let authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
      
      // If not found, try matching with reviewId as ObjectId string
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId.toString() === reviewId.toString());
      }
      
      // If still not found, try matching with review._id
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId._id === reviewId);
      }
      
      if (!authRecord) {
        showToast('Authentication record not found for this review', 'error');
        return;
      }

      const decision = {
        status: 'requires_investigation',
        confidence: 70,
        reasoning: 'Escalated for expert review by administrator',
        decidedBy: 'admin_user',
        decidedAt: new Date()
      };

      const response = await apiService.updateReviewDecision(authRecord._id, decision);
      showToast('Review escalated for investigation ⚠️', 'warning');
      await fetchReviewData();
    } catch (error) {
      console.error('❌ Error escalating review:', error);
      showToast('Failed to escalate review. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [`escalate_${reviewId}`]: false }));
    }
  };

  const markFraudulent = async (reviewId) => {
    try {
      setButtonLoading(prev => ({ ...prev, [`fraud_${reviewId}`]: true }));
      
      // Find the auth record for this review - try multiple matching strategies
      let authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
      
      // If not found, try matching with reviewId as ObjectId string
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId.toString() === reviewId.toString());
      }
      
      // If still not found, try matching with review._id
      if (!authRecord) {
        authRecord = authRecords.find(auth => auth && auth.reviewId && auth.reviewId._id === reviewId);
      }
      
      if (!authRecord) {
        showToast('Authentication record not found for this review', 'error');
        return;
      }

      const decision = {
        status: 'fake',
        confidence: 95,
        reasoning: 'Marked as fraudulent by administrator',
        decidedBy: 'admin_user',
        decidedAt: new Date()
      };

      const response = await apiService.updateReviewDecision(authRecord._id, decision);
      showToast('Review marked as fraudulent 🚨', 'error');
      await fetchReviewData();
    } catch (error) {
      console.error('❌ Error marking review as fraudulent:', error);
      showToast('Failed to mark review as fraudulent. Please try again.', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, [`fraud_${reviewId}`]: false }));
    }
  };

  // Selection Functions
  const toggleReviewSelection = (reviewId) => {
    setSelectedReviews(prev => {
      if (prev.includes(reviewId)) {
        return prev.filter(id => id !== reviewId);
      } else {
        return [...prev, reviewId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReviews([]);
      setSelectAll(false);
    } else {
      const allFilteredIds = filteredReviews.map(review => review._id);
      setSelectedReviews(allFilteredIds);
      setSelectAll(true);
    }
  };

  // Clear selection when filters change
  const clearSelection = () => {
    setSelectedReviews([]);
    setSelectAll(false);
  };

  // Bulk Action Functions
  const bulkApprove = async () => {
    if (selectedReviews.length === 0) {
      showToast('No reviews selected for bulk approval', 'warning');
      return;
    }

    try {
      setButtonLoading(prev => ({ ...prev, bulkApprove: true }));
      
      const results = [];
      for (const reviewId of selectedReviews) {
        try {
          const authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
          if (!authRecord) {
            results.push({ reviewId, success: false, error: 'No auth record found' });
            continue;
          }

          const decision = {
            status: 'authentic',
            confidence: 95,
            reasoning: 'Bulk approved by administrator',
            decidedBy: 'admin',
            decidedAt: new Date()
          };

          const response = await apiService.updateReviewDecision(authRecord._id, decision);
          results.push({ reviewId, success: true, data: response.data });
        } catch (error) {
          results.push({ reviewId, success: false, error: error.message });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed > 0) {
        showToast(`Bulk approve completed: ${successful} successful, ${failed} failed`, 'warning');
      } else {
        showToast(`Successfully approved ${successful} reviews ✅`, 'success');
      }
      

      clearSelection();
      await fetchReviewData();
    } catch (error) {
      console.error('Error in bulk approve:', error);
      showToast('Bulk approve operation failed', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, bulkApprove: false }));
    }
  };

  const bulkReject = async () => {
    if (selectedReviews.length === 0) {
      showToast('No reviews selected for bulk rejection', 'warning');
      return;
    }

    try {
      setButtonLoading(prev => ({ ...prev, bulkReject: true }));
      
      const results = [];
      for (const reviewId of selectedReviews) {
        try {
          const authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
          if (!authRecord) {
            results.push({ reviewId, success: false, error: 'No auth record found' });
            continue;
          }

          const decision = {
            status: 'suspicious',
            confidence: 85,
            reasoning: 'Bulk rejected by administrator',
            decidedBy: 'admin',
            decidedAt: new Date()
          };

          const response = await apiService.updateReviewDecision(authRecord._id, decision);
          results.push({ reviewId, success: true, data: response.data });
        } catch (error) {
          results.push({ reviewId, success: false, error: error.message });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed > 0) {
        showToast(`Bulk reject completed: ${successful} successful, ${failed} failed`, 'warning');
      } else {
        showToast(`Successfully rejected ${successful} reviews ❌`, 'warning');
      }
      

      clearSelection();
      await fetchReviewData();
    } catch (error) {
      console.error('Error in bulk reject:', error);
      showToast('Bulk reject operation failed', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, bulkReject: false }));
    }
  };

  const bulkEscalate = async () => {
    if (selectedReviews.length === 0) {
      showToast('No reviews selected for bulk escalation', 'warning');
      return;
    }

    try {
      setButtonLoading(prev => ({ ...prev, bulkEscalate: true }));
      
      const results = [];
      for (const reviewId of selectedReviews) {
        try {
          const authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
          if (!authRecord) {
            results.push({ reviewId, success: false, error: 'No auth record found' });
            continue;
          }

          const decision = {
            status: 'requires_investigation',
            confidence: 70,
            reasoning: 'Bulk escalated by administrator',
            decidedBy: 'admin',
            decidedAt: new Date()
          };

          const response = await apiService.updateReviewDecision(authRecord._id, decision);
          results.push({ reviewId, success: true, data: response.data });
        } catch (error) {
          results.push({ reviewId, success: false, error: error.message });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed > 0) {
        showToast(`Bulk escalate completed: ${successful} successful, ${failed} failed`, 'warning');
      } else {
        showToast(`Successfully escalated ${successful} reviews ⚠️`, 'warning');
      }
      

      clearSelection();
      await fetchReviewData();
    } catch (error) {
      console.error('Error in bulk escalate:', error);
      showToast('Bulk escalate operation failed', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, bulkEscalate: false }));
    }
  };

  const bulkMarkFraudulent = async () => {
    if (selectedReviews.length === 0) {
      showToast('No reviews selected for bulk fraud marking', 'warning');
      return;
    }

    try {
      setButtonLoading(prev => ({ ...prev, bulkMarkFraudulent: true }));
      
      const results = [];
      for (const reviewId of selectedReviews) {
        try {
          const authRecord = authRecords.find(auth => auth && auth.reviewId === reviewId);
          if (!authRecord) {
            results.push({ reviewId, success: false, error: 'No auth record found' });
            continue;
          }

          const decision = {
            status: 'fake',
            confidence: 95,
            reasoning: 'Bulk marked as fraudulent by administrator',
            decidedBy: 'admin',
            decidedAt: new Date()
          };

          const response = await apiService.updateReviewDecision(authRecord._id, decision);
          results.push({ reviewId, success: true, data: response.data });
        } catch (error) {
          results.push({ reviewId, success: false, error: error.message });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed > 0) {
        showToast(`Bulk fraud marking completed: ${successful} successful, ${failed} failed`, 'warning');
      } else {
        showToast(`Successfully marked ${successful} reviews as fraudulent 🚨`, 'error');
      }
      

      clearSelection();
      await fetchReviewData();
    } catch (error) {
      console.error('Error in bulk mark fraudulent:', error);
      showToast('Bulk fraud marking operation failed', 'error');
    } finally {
      setButtonLoading(prev => ({ ...prev, bulkMarkFraudulent: false }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'authentic': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'suspicious': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'fake': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      'requires_investigation': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getWorkflowStageColor = (stage) => {
    const colors = {
      'automated_screening': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'community_review': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'expert_validation': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'final_approval': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'completed': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    };
    return colors[stage] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getAuthScoreData = () => {
    const scoreRanges = {
      'Excellent (90-100)': authRecords.filter(a => (a.authenticityScore ?? 100) >= 90).length,
      'Good (70-89)': authRecords.filter(a => (a.authenticityScore ?? 100) >= 70 && (a.authenticityScore ?? 100) < 90).length,
      'Fair (50-69)': authRecords.filter(a => (a.authenticityScore ?? 100) >= 50 && (a.authenticityScore ?? 100) < 70).length,
      'Poor (0-49)': authRecords.filter(a => (a.authenticityScore ?? 100) < 50).length
    };

    return {
      labels: Object.keys(scoreRanges),
      datasets: [{
        data: Object.values(scoreRanges),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 2
      }]
    };
  };

  const getAuthTrendData = () => {
    // Use real analytics data only - no mock fallback
    const trendData = analytics.dailyTrends.length > 0 ? analytics.dailyTrends : [];

    const labels = trendData.map(item => 
      typeof item.date === 'string' ? new Date(item.date).toLocaleDateString() : item.date
    );
    const scores = trendData.map(item => item.avgScore || item.reviews);

    return {
      labels: labels,
      datasets: [{
        label: 'Average Auth Score',
        data: scores,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    };
  };

  const filteredReviews = reviews.filter(review => {
    const authRecord = authRecords.find(auth => auth && auth.reviewId === review._id);
    
    // Status filter
    if (filter !== 'all' && (!authRecord || authRecord.status !== filter)) {
      return false;
    }
    
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const reviewerMatch = review.reviewer?.username?.toLowerCase().includes(searchLower);
      const contentMatch = review.content?.toLowerCase().includes(searchLower);
      if (!reviewerMatch && !contentMatch) {
        return false;
      }
    }
    
    // Date range filter
    if (dateRange.from || dateRange.to) {
      const reviewDate = new Date(review.createdAt || review.date);
      if (dateRange.from && reviewDate < new Date(dateRange.from)) {
        return false;
      }
      if (dateRange.to && reviewDate > new Date(dateRange.to)) {
        return false;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Enhanced Review Authentication...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Enhanced Review Authentication</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Multi-step verification and credibility assessment for reviews</p>
        </div>

        {/* Enhanced Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <span className="text-blue-600 dark:text-blue-400 text-xl"></span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reviews</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalReviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <span className="text-green-600 dark:text-green-400 text-xl"></span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Authenticated</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.authenticatedPercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <span className="text-yellow-600 dark:text-yellow-400 text-xl"></span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Suspicious</h3>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.suspiciousPercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <span className="text-red-600 dark:text-red-400 text-xl"></span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fake</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.fakePercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
                <span className="text-indigo-600 dark:text-indigo-400 text-xl"></span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Score</h3>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${analytics.trustScoreImpact >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <span className={`text-xl ${analytics.trustScoreImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {analytics.trustScoreImpact >= 0 ? '' : ''}
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trust Impact</h3>
                <p className={`text-2xl font-bold ${analytics.trustScoreImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {analytics.trustScoreImpact >= 0 ? '+' : ''}{analytics.trustScoreImpact}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters & Search</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status:</label>
              <select 
                value={filter} 
                onChange={(e) => { setFilter(e.target.value); clearSelection(); }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Reviews</option>
                <option value="authentic">Authentic</option>
                <option value="suspicious">Suspicious</option>
                <option value="fake">Fake</option>
                <option value="requires_investigation">Under Investigation</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); clearSelection(); }}
                placeholder="Search reviewer or content..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Date:</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => { setDateRange(prev => ({ ...prev, from: e.target.value })); clearSelection(); }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Date:</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => { setDateRange(prev => ({ ...prev, to: e.target.value })); clearSelection(); }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </div>
            <button
              onClick={() => {
                setFilter('all');
                setSearchTerm('');
                setDateRange({ from: '', to: '' });
                clearSelection();
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Authentication Score Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Score Distribution</h3>
            <Doughnut data={getAuthScoreData()} options={{ 
              responsive: true,
              plugins: {
                legend: {
                  labels: {
                    color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                  }
                }
              }
            }} />
          </div>

          {/* Authentication Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Score Trend</h3>
            <Line data={getAuthTrendData()} options={{ 
              responsive: true,
              plugins: {
                legend: {
                  labels: {
                    color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                  }
                }
              },
              scales: {
                x: {
                  ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                  }
                },
                y: {
                  ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Review Authentication List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Authentication Management</h3>
              {filteredReviews.length > 0 && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-600 dark:text-gray-300">
                    Select All ({filteredReviews.length})
                  </label>
                </div>
              )}
            </div>
            {selectedReviews.length > 0 && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {selectedReviews.length} selected
              </div>
            )}
          </div>
          
          {/* Bulk Action Toolbar */}
          {selectedReviews.length > 0 && (
            <div className="sticky top-0 bg-black/80 backdrop-blur-md p-3 z-50 border-b border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm text-white font-medium">
                  {selectedReviews.length} review{selectedReviews.length > 1 ? 's' : ''} selected:
                </span>
                
                <button
                  onClick={bulkApprove}
                  disabled={buttonLoading.bulkApprove}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  {buttonLoading.bulkApprove && (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Bulk Approve</span>
                </button>
                
                <button
                  onClick={bulkReject}
                  disabled={buttonLoading.bulkReject}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  {buttonLoading.bulkReject && (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Bulk Reject</span>
                </button>
                
                <button
                  onClick={bulkEscalate}
                  disabled={buttonLoading.bulkEscalate}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  {buttonLoading.bulkEscalate && (
                    <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Bulk Escalate</span>
                </button>
                
                <button
                  onClick={bulkMarkFraudulent}
                  disabled={buttonLoading.bulkMarkFraudulent}
                  className="bg-red-800 hover:bg-red-900 disabled:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  {buttonLoading.bulkMarkFraudulent && (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Bulk Fraud</span>
                </button>
                
                <button
                  onClick={clearSelection}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          <div className="p-6">
            {filteredReviews.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No reviews found with current filters.</p>
                <p className="text-sm">Try adjusting your filters or authenticate more reviews!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => {
                  if (!review || !review._id) return null; // Safety check
                  
                  const authRecord = authRecords.find(auth => auth && auth.reviewId === review._id);
                  
                  // Determine background color based on status
                  const getReviewBackgroundColor = (status) => {
                    switch (status) {
                      case 'authentic':
                        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
                      case 'suspicious':
                        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
                      case 'fake':
                        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
                      case 'requires_investigation':
                        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
                      default:
                        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600';
                    }
                  };

                  return (
                    <div key={review._id} className={`rounded-lg p-4 transition-colors duration-200 ${getReviewBackgroundColor(authRecord?.status)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Individual Review Checkbox */}
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              checked={selectedReviews.includes(review._id)}
                              onChange={() => toggleReviewSelection(review._id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">Review by {review.reviewer?.username || 'Unknown'}</h4>
                              <span className="text-sm text-gray-500 dark:text-gray-400">Rating: {review.rating}/5</span>
                            </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{review.content}</p>
                          
                          {authRecord ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Auth Score:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{authRecord.authenticityScore ?? 100}%</span>
                                {authRecord.aiAnalysisData?.modelUsed && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <div>Model: {authRecord.aiAnalysisData.modelUsed}</div>
                                    {authRecord.aiAnalysisData?.reasoning && (
                                      <div>{authRecord.aiAnalysisData.reasoning}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(authRecord.status)}`}>
                                  {authRecord.status}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Workflow:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getWorkflowStageColor(authRecord.workflowStage)}`}>
                                  {authRecord.workflowStage}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Fraud Indicators:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{authRecord.fraudIndicators}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              No authentication record found
                              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                💡 Click "Authenticate" button to create an authentication record and enable manual review actions
                              </div>
                            </div>
                          )}

                          {/* Manual Review Action Buttons */}
                          {authRecord && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <button
                                onClick={() => approveReview(review._id)}
                                disabled={buttonLoading[`approve_${review._id}`]}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm px-3 py-1 rounded transition-colors duration-200 flex items-center space-x-1"
                              >
                                {buttonLoading[`approve_${review._id}`] && (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                )}
                                <span>Approve</span>
                              </button>
                              
                              <button
                                onClick={() => rejectReview(review._id)}
                                disabled={buttonLoading[`reject_${review._id}`]}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm px-3 py-1 rounded transition-colors duration-200 flex items-center space-x-1"
                              >
                                {buttonLoading[`reject_${review._id}`] && (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                )}
                                <span>Reject</span>
                              </button>
                              
                              <button
                                onClick={() => escalateReview(review._id)}
                                disabled={buttonLoading[`escalate_${review._id}`]}
                                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black text-sm px-3 py-1 rounded transition-colors duration-200 flex items-center space-x-1"
                              >
                                {buttonLoading[`escalate_${review._id}`] && (
                                  <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                                )}
                                <span>Escalate</span>
                              </button>
                              
                              <button
                                onClick={() => markFraudulent(review._id)}
                                disabled={buttonLoading[`fraud_${review._id}`]}
                                className="bg-red-800 hover:bg-red-900 disabled:bg-red-600 text-white text-sm px-3 py-1 rounded transition-colors duration-200 flex items-center space-x-1"
                              >
                                {buttonLoading[`fraud_${review._id}`] && (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                )}
                                <span>Mark Fraudulent</span>
                              </button>
                            </div>
                          )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          {authRecord ? (
                            <button
                              onClick={() => viewAuthDetails(review._id)}
                              disabled={buttonLoading[`details_${review._id}`]}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded transition-colors duration-200 flex items-center space-x-1"
                            >
                              {buttonLoading[`details_${review._id}`] && (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              )}
                              <span>View Details</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => authenticateReview(review._id)}
                              disabled={buttonLoading[review._id]}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded transition-colors duration-200 flex items-center space-x-1"
                            >
                              {buttonLoading[review._id] && (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              )}
                              <span>Authenticate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Authentication Details Modal */}
        {authDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Details</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">🧠 AI Authenticity Score:</label>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{authDetails.overallAuthenticationScore || authDetails.authenticityScore || 0}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Status: {authDetails.finalDecision?.status === 'authentic' ? 'Authentic' : 
                            authDetails.finalDecision?.status === 'suspicious' ? 'Suspicious' : 
                            authDetails.finalDecision?.status === 'fake' ? 'Fake' : 'Under Investigation'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Analysis Steps:</label>
                  <div className="space-y-2">
                    {authDetails.authenticationSteps?.map((step, index) => (
                      <div key={index} className="border-l-2 border-gray-200 pl-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {step.step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            step.status === 'passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {step.status} ({step.score || 0}%)
                          </span>
                        </div>
                        {step.aiAnalysis && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <div>Model: {step.aiAnalysis.modelUsed}</div>
                            <div>Reasoning: {step.aiAnalysis.reasoning}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credibility Factors:</label>
                  <div className="text-sm space-y-1">
                    <div>Purchase Verified: {authDetails.credibilityFactors?.purchaseVerification?.verified ? 'Yes' : 'No'}</div>
                    <div>Review Consistency: {authDetails.credibilityFactors?.reviewerHistory?.reviewConsistency || 0}%</div>
                    <div>Content Quality: {authDetails.credibilityFactors?.contentQuality?.detailLevel || 0}%</div>
                  </div>
                </div>

                {authDetails.fraudIndicators?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">🚨 AI-Detected Risk Factors:</label>
                    <div className="space-y-1">
                      {authDetails.fraudIndicators.map((indicator, index) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400 border-l-2 border-red-200 pl-2">
                          <div className="font-medium">• {indicator.indicator.replace(/_/g, ' ')}</div>
                          <div className="text-xs">Severity: {indicator.severity} | Confidence: {indicator.confidence}%</div>
                          <div className="text-xs text-gray-500">{indicator.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {authDetails.finalDecision?.reasoning && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">🧠 AI Decision Reasoning:</label>
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {authDetails.finalDecision.reasoning.map((reason, index) => (
                        <div key={index}>• {reason}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Linguistic Analysis Section */}
                {authDetails.authenticationSteps?.some(step => step.linguisticAnalysis) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">🔬 Linguistic Analysis:</label>
                    {authDetails.authenticationSteps
                      .filter(step => step.linguisticAnalysis)
                      .map((step, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900 p-3 rounded mt-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>Word Count: {step.linguisticAnalysis.wordCount}</div>
                            <div>Lexical Diversity: {(step.linguisticAnalysis.lexicalDiversity * 100).toFixed(1)}%</div>
                            <div>Avg Sentence Length: {step.linguisticAnalysis.avgSentenceLength?.toFixed(1)}</div>
                            <div>Sentence Variance: {step.linguisticAnalysis.sentenceVariance?.toFixed(1)}</div>
                            <div>Readability Score: {step.linguisticAnalysis.readabilityScore?.toFixed(1)}</div>
                            <div>Emotional Words: {step.linguisticAnalysis.emotionalWords?.length || 0}</div>
                          </div>
                          {step.linguisticAnalysis.tfidfTopTerms?.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium">🔑 Key Terms: </span>
                              <span className="text-xs">{step.linguisticAnalysis.tfidfTopTerms.join(', ')}</span>
                            </div>
                          )}
                          {step.linguisticAnalysis.posDistribution && (
                            <div className="mt-2 text-xs">
                              <span className="font-medium">📚 Grammar: </span>
                              Nouns: {step.linguisticAnalysis.posDistribution.nouns}, 
                              Verbs: {step.linguisticAnalysis.posDistribution.verbs}, 
                              Adjectives: {step.linguisticAnalysis.posDistribution.adjectives}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setAuthDetails(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded font-medium transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div className={`max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 ${
              toastMessage.type === 'error' ? 'border-l-4 border-red-500' :
              toastMessage.type === 'warning' ? 'border-l-4 border-yellow-500' :
              'border-l-4 border-green-500'
            }`}>
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {toastMessage.type === 'error' ? (
                      <div className="w-5 h-5 text-red-400">❌</div>
                    ) : toastMessage.type === 'warning' ? (
                      <div className="w-5 h-5 text-yellow-400">⚠️</div>
                    ) : (
                      <div className="w-5 h-5 text-green-400">✅</div>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {toastMessage.message}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setToastMessage(null)}
                    >
                      <span className="sr-only">Close</span>
                      <div className="w-5 h-5">✕</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedReviewAuth;
