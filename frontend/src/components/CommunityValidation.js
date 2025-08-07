import React, { useState, useEffect } from 'react';

const CommunityValidation = () => {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [userVote, setUserVote] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [reasoning, setReasoning] = useState('');
  const [votedReviews, setVotedReviews] = useState(new Set());

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/enhanced-reviews/pending-review');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending reviews: ${response.status}`);
      }

      const data = await response.json();
      setPendingReviews(data);
      
      // Check which reviews the current user has already voted on
      const currentUserId = '6841c7373efc698423881aff'; // Demo user ID
      const userVotedReviews = new Set();
      
      data.forEach(authRecord => {
        const communityStep = authRecord.authenticationSteps?.find(step => step.step === 'community_validation');
        if (communityStep?.details?.votes) {
          const hasVoted = communityStep.details.votes.some(vote => vote.voterId === currentUserId);
          if (hasVoted) {
            userVotedReviews.add(authRecord.reviewId?._id || authRecord.reviewId);
          }
        }
      });
      
      setVotedReviews(userVotedReviews);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      setLoading(false);
      alert(`Failed to load pending reviews: ${error.message}`);
    }
  };

  const submitCommunityVote = async (reviewId) => {
    if (!userVote) {
      alert('Please select your assessment before submitting.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/enhanced-reviews/${reviewId}/community-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: '6841c7373efc698423881aff', // Demo user ID
          vote: userVote,
          confidence,
          reasoning
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Show success message and update the review status
        const successMessage = `✅ Review validated successfully!\n\nYour assessment: ${userVote.toUpperCase()}\nConfidence: ${confidence}%\n\nThank you for helping maintain review quality!`;
        alert(successMessage);
        
        // Mark this review as voted by the user
        setVotedReviews(prev => new Set([...prev, reviewId]));
        
        // Refresh the list to show updated status
        await fetchPendingReviews();
        setSelectedReview(null);
        setUserVote('');
        setReasoning('');
        setConfidence(75);
      } else {
        alert(`❌ Failed to submit vote: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting community vote:', error);
      alert(`❌ Failed to submit vote: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'authentic': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'suspicious': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'fake': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'requires_investigation': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'low': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Reviews for Community Validation...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Community Review Validation</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Help validate reviews that were flagged for community assessment</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Reviews</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {pendingReviews.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suspicious Reviews</h3>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
              {pendingReviews.filter(r => r.finalDecision?.status === 'suspicious').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">High Risk</h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
              {pendingReviews.filter(r => r.fraudIndicators?.some(fi => fi.severity === 'high' || fi.severity === 'critical')).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Auth Score</h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              {pendingReviews.length > 0 
                ? Math.round(pendingReviews.reduce((sum, r) => sum + (r.overallAuthenticationScore || 0), 0) / pendingReviews.length)
                : 0}%
            </p>
          </div>
        </div>

        {/* Pending Reviews List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews Requiring Community Validation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">These reviews were flagged by our AI system and need human validation</p>
          </div>
          <div className="p-6">
            {pendingReviews.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-4">✅</div>
                <p className="font-medium">No reviews pending community validation!</p>
                <p className="text-sm mt-2">All reviews have been processed or are currently being reviewed.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingReviews.map((authRecord) => (
                  <div key={authRecord._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Review by {authRecord.reviewId?.reviewerName || 'Anonymous'}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(authRecord.finalDecision?.status)}`}>
                            {authRecord.finalDecision?.status || 'unknown'}
                          </span>
                          <span>Auth Score: {authRecord.overallAuthenticationScore || 0}%</span>
                          <span>Fraud Indicators: {authRecord.fraudIndicators?.length || 0}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedReview(authRecord)}
                        disabled={votedReviews.has(authRecord.reviewId?._id || authRecord.reviewId)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                          votedReviews.has(authRecord.reviewId?._id || authRecord.reviewId)
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {votedReviews.has(authRecord.reviewId?._id || authRecord.reviewId) ? 'Voted' : 'Validate'}
                      </button>
                    </div>

                    {/* Review Content */}
                    <div className="bg-white dark:bg-gray-600 rounded-lg p-4 mb-4 transition-colors duration-200">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Review Content</h5>
                      <p className="text-gray-700 dark:text-gray-200 text-sm">
                        {authRecord.reviewId?.content || 'Review content not available'}
                      </p>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Rating: {authRecord.reviewId?.rating || 'N/A'} stars | 
                        Date: {authRecord.reviewId?.createdAt ? new Date(authRecord.reviewId.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    {/* Fraud Indicators */}
                    {authRecord.fraudIndicators && authRecord.fraudIndicators.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4 transition-colors duration-200">
                        <h5 className="font-medium text-red-900 dark:text-red-200 mb-2">🚨 Fraud Indicators Detected</h5>
                        <div className="space-y-2">
                          {authRecord.fraudIndicators
                            .filter(indicator => 
                              !indicator.description?.toLowerCase().includes('excessive word repetition') &&
                              !indicator.indicator?.toLowerCase().includes('excessive word repetition')
                            )
                            .map((indicator, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-red-800 dark:text-red-200">
                                {indicator.description || indicator.indicator}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(indicator.severity)}`}>
                                {indicator.severity} ({indicator.confidence}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis Summary */}
                    {authRecord.authenticationSteps && authRecord.authenticationSteps.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 transition-colors duration-200">
                        <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">🤖 AI Analysis Summary</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {authRecord.authenticationSteps.map((step, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-blue-800 dark:text-blue-200 capitalize">
                                {step.step.replace('_', ' ')}:
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                step.status === 'passed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {step.status} ({step.score || 0}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Community Vote Modal */}
        {selectedReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Community Validation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Review by {selectedReview.reviewId?.reviewerName || 'Anonymous'}
              </p>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-900 dark:text-white">
                  "{selectedReview.reviewId?.content || 'Review content not available'}"
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Assessment</label>
                <select
                  value={userVote}
                  onChange={(e) => setUserVote(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select your assessment...</option>
                  <option value="authentic">Authentic - Real customer review</option>
                  <option value="suspicious">Suspicious - Some concerns</option>
                  <option value="fake">Fake - Clearly fabricated</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Level: {confidence}%
                </label>
                <input
                  type="range"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reasoning (Optional)</label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Explain your assessment..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 h-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  maxLength="500"
                />
              </div>
              
              <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm transition-colors duration-200">
                <p className="text-gray-900 dark:text-white">
                  <strong>AI Assessment:</strong> {selectedReview.finalDecision?.status} ({selectedReview.finalDecision?.confidence || 0}%)
                </p>
                <p className="text-gray-900 dark:text-white">
                  <strong>Authentication Score:</strong> {selectedReview.overallAuthenticationScore || 0}%
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => submitCommunityVote(selectedReview.reviewId?._id || selectedReview.reviewId)}
                  disabled={!userVote}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors duration-200"
                >
                  Submit Vote
                </button>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityValidation;
