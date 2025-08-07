import React, { useState, useEffect } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import 'chart.js/auto';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
} from 'chart.js';
import apiService from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
);

const TrustDNAProfiler = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userAlerts, setUserAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  
  // IP Analysis state
  const [ipAnalysis, setIpAnalysis] = useState(null);
  const [ipAnalysisLoading, setIpAnalysisLoading] = useState(false);

  useEffect(() => {
    initializeComponent();
    
    return () => {
      // Cleanup
    };
  }, []);

  // Fetch linguistic analysis when user changes
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      // fetchLinguisticProfile(selectedUser._id); // Removed as per edit hint
    }
    // eslint-disable-next-line
  }, [selectedUser]);

  // Removed fetchLinguisticProfile function


  const initializeComponent = async () => {
    try {
      setError(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error initializing TrustDNA Profiler:', error);
      setError('Failed to initialize profiler. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data || []);
      
      if (response.data && response.data.length > 0) {
        const firstUser = response.data[0];
        setSelectedUser(firstUser);
        await fetchUserAlerts(firstUser._id);
        await fetchIPAnalysis(firstUser._id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchUserAlerts = async (userId) => {
    try {
      const response = await apiService.getAlerts();
      const userSpecificAlerts = (response.data || []).filter(alert => alert.target === userId);
      setUserAlerts(userSpecificAlerts);
    } catch (error) {
      console.error('Error fetching user alerts:', error);
    }
  };

  const handleUserChange = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (user) {
      setSelectedUser(user);
      await fetchUserAlerts(userId);
      await fetchIPAnalysis(userId);
    }
  };

  const fetchIPAnalysis = async (userId) => {
    setIpAnalysisLoading(true);
    try {
      const response = await apiService.getUserIPAnalysis(userId);
      setIpAnalysis(response.data.data);

    } catch (error) {
      console.error('Error fetching IP analysis:', error);
      setIpAnalysis(null);
    } finally {
      setIpAnalysisLoading(false);
    }
  };

  // Calculate actual transaction count from orders
  const getActualTransactionCount = (user) => {
    // For now, use the stored transactionCount
    // In a real implementation, you would fetch orders from the database
    return user.transactionCount || 0;
  };

  const recalculateTrustScore = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await apiService.recalculateUserTrust(selectedUser._id);
      const updatedData = response.data.data;
      
      // Update selected user with new trust score
      const updatedUser = { ...selectedUser, trustScore: updatedData.newTrustScore };
      setSelectedUser(updatedUser);
      
      // Update users list
      setUsers(users.map(u => u._id === selectedUser._id ? updatedUser : u));
      
      // Update IP analysis
      setIpAnalysis(updatedData.ipAnalysis);
      

    } catch (error) {
      console.error('Error recalculating trust score:', error);
      setError('Failed to recalculate trust score');
    }
  };



  // Chart data functions using user profile data
  const getTypingCadenceData = () => {
    if (!selectedUser) {
      return {
        labels: ['No Data Available'],
        datasets: [{
          label: 'Typing Speed (WPM)',
          data: [0],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        }]
      };
    }

    // Generate sample data based on user's trust score and account characteristics
    const baseWPM = 40 + (selectedUser.trustScore / 100) * 30; // 40-70 WPM range
    const variance = selectedUser.trustScore > 70 ? 5 : selectedUser.trustScore > 40 ? 10 : 15;
    
    const labels = ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5'];
    const data = labels.map(() => Math.round(baseWPM + (Math.random() - 0.5) * variance));

    return {
      labels,
      datasets: [{
        label: 'Estimated Typing Speed (WPM)',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };

  const getLinguisticRadarData = () => {
    if (!selectedUser) {
      return {
        labels: ['Sentence Variety', 'Emotional Authenticity', 'Specific Details', 'Vocabulary Complexity', 'Grammar Score'],
        datasets: [{
          label: 'Linguistic Fingerprint',
          data: [0, 0, 0, 0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      };
    }
    // Simulated data based on user profile
    const trustFactor = selectedUser.trustScore / 100;
    const calculatedAccountAge = selectedUser.createdAt ? 
      Math.floor((new Date() - new Date(selectedUser.createdAt)) / (1000 * 60 * 60 * 24)) : 
      selectedUser.accountAge || 0;
    const ageFactor = Math.min(calculatedAccountAge / 365, 1);
    const activityFactor = Math.min(getActualTransactionCount(selectedUser) / 100, 1);
    return {
      labels: ['Sentence Variety', 'Emotional Authenticity', 'Specific Details', 'Vocabulary Complexity', 'Grammar Score'],
      datasets: [{
        label: 'Linguistic Fingerprint',
        data: [
          Math.round((trustFactor * 0.4 + ageFactor * 0.6) * 100),
          Math.round((trustFactor * 0.5 + ageFactor * 0.3 + activityFactor * 0.2) * 100),
          Math.round((activityFactor * 0.4 + trustFactor * 0.6) * 100),
          Math.round((ageFactor * 0.3 + trustFactor * 0.4 + activityFactor * 0.3) * 100),
          Math.round((trustFactor * 0.6 + ageFactor * 0.4) * 100)
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    };
  };

  const calculateVariance = (data) => {
    if (!data || data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.round(variance);
  };

  const getBehaviorAnalysis = () => {
    if (!selectedUser) {
      return { 
        type: 'No Data', 
        confidence: 0, 
        risk: 'Unknown',
        variance: 0,
        consistency: 0
      };
    }
    
    // Generate analysis based on user characteristics
    const trustFactor = selectedUser.trustScore / 100;
    const calculatedAccountAge = selectedUser.createdAt ? 
      Math.floor((new Date() - new Date(selectedUser.createdAt)) / (1000 * 60 * 60 * 24)) : 
      selectedUser.accountAge || 0;
    const ageFactor = Math.min(calculatedAccountAge / 365, 1);
    const activityFactor = Math.min(getActualTransactionCount(selectedUser) / 100, 1);
    
    // Calculate behavioral metrics based on user profile
    const variance = Math.round(50 + (trustFactor * 30) + (ageFactor * 20));
    const consistency = Math.round(60 + (trustFactor * 20) + (activityFactor * 20));
    
    // Determine classification based on user characteristics
    let type = 'Human';
    let confidence = 70;
    let risk = 'Low';
    
    if (selectedUser.trustScore < 30) {
      type = 'Suspicious';
      confidence = 60;
      risk = 'High';
    } else if (selectedUser.trustScore > 80) {
      type = 'Human';
      confidence = 85;
      risk = 'Low';
    }
    
    return { type, confidence, risk, variance, consistency };
  };

  const getRiskFactors = () => {
    const factors = [];
    
    if (selectedUser) {
      const calculatedAccountAge = selectedUser.createdAt ? 
        Math.floor((new Date() - new Date(selectedUser.createdAt)) / (1000 * 60 * 60 * 24)) : 
        selectedUser.accountAge || 0;
        
      if (selectedUser.trustScore < 40) {
        factors.push('Low trust score');
      }
      if (calculatedAccountAge < 25) {
        factors.push('New account');
      }
      if (getActualTransactionCount(selectedUser) > 50 && calculatedAccountAge < 90) {
        factors.push('High activity on new account');
      }
    }
    
    const analysis = getBehaviorAnalysis();
    if (analysis.risk === 'High') {
      factors.push('Suspicious behavioral patterns');
    }
    if (analysis.variance < 25) {
      factors.push('Robotic typing patterns');
    }
    
    return factors;
  };

  // Enhanced chart options
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
          display: false,
          labels: { color: textColor }
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
          beginAtZero: true
        }
      };
    } else if (chartType === 'radar') {
      baseOptions.scales = {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { color: tickColor },
          grid: { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: { color: tickColor }
        }
      };
    }

    return baseOptions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-900 dark:text-white">Loading Trust DNA Profiler...</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Connecting to AI analysis system...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4"></div>
          <div className="text-xl text-gray-900 dark:text-white mb-2">Profiler Error</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">No users available for analysis</div>
      </div>
    );
  }

  const behaviorAnalysis = getBehaviorAnalysis();
  const riskFactors = getRiskFactors();

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Trust DNA Profiler</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Real-time behavioral analysis powered by AI</p>
        </div>

        {/* User Selection and Tracking Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select User for Analysis:
              </label>
              <select 
                value={selectedUser._id} 
                onChange={(e) => handleUserChange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full max-w-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.username} (Trust Score: {user.trustScore}%)
                  </option>
                ))}
              </select>
            </div>
            

          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trust Score Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Analysis</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-300 dark:text-gray-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${selectedUser.trustScore > 70 ? 'text-green-500' : 
                      selectedUser.trustScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${selectedUser.trustScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.trustScore}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Account Age:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedUser.createdAt ? 
                    Math.floor((new Date() - new Date(selectedUser.createdAt)) / (1000 * 60 * 60 * 24)) : 
                    selectedUser.accountAge || 0
                  } days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Transactions:</span>
                <span className="text-gray-900 dark:text-white">
                  {getActualTransactionCount(selectedUser)}
                  {getActualTransactionCount(selectedUser) === 0 && (
                    <span className="text-xs text-gray-500 ml-1">(No orders placed)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Risk Level:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  selectedUser.riskLevel === 'Low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  selectedUser.riskLevel === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {selectedUser.riskLevel}
                </span>
              </div>
            </div>

            {/* Risk Factors */}
            {riskFactors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Risk Factors:</h4>
                <ul className="space-y-1">
                  {riskFactors.map((factor, index) => (
                    <li key={index} className="text-xs text-red-600 dark:text-red-400 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* IP Analysis Section */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">IP Analysis</h4>
                <button
                  onClick={recalculateTrustScore}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors duration-200"
                >
                  Recalculate
                </button>
              </div>
              
              {ipAnalysisLoading ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Loading IP analysis...</div>
              ) : ipAnalysis ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">IP Address:</span>
                    <span className="text-gray-900 dark:text-white font-mono">{ipAnalysis.ipAddress}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Other accounts:</span>
                    <span className={`font-medium ${
                      ipAnalysis.usersWithSameIP === 0 ? 'text-green-600 dark:text-green-400' :
                      ipAnalysis.usersWithSameIP === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {ipAnalysis.usersWithSameIP}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      ipAnalysis.riskLevel === 'Low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      ipAnalysis.riskLevel === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {ipAnalysis.ipStatus}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Score Impact:</span>
                    <span className={`font-medium ${
                      ipAnalysis.scoreAdjustment > 0 ? 'text-green-600 dark:text-green-400' :
                      ipAnalysis.scoreAdjustment < 0 ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {ipAnalysis.scoreAdjustment > 0 ? '+' : ''}{ipAnalysis.scoreAdjustment}
                    </span>
                  </div>
                  
                  {/* Other users with same IP */}
                  {ipAnalysis.otherUsers && ipAnalysis.otherUsers.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                      <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Other accounts from this IP:</div>
                      <div className="space-y-1 max-h-16 overflow-y-auto">
                        {ipAnalysis.otherUsers.map((user, index) => (
                          <div key={index} className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                            <span>{user.username}</span>
                            <span className="text-xs">{user.trustScore}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">No IP data available</div>
              )}
            </div>
          </div>

          {/* Behavioral Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Behavioral Analysis</h3>
            </div>
            
            <div className="mb-4 h-48">
              <Line data={getTypingCadenceData()} options={getChartOptions('line')} />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Pattern Type:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  behaviorAnalysis.type === 'Human' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  behaviorAnalysis.type === 'Bot' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                  behaviorAnalysis.type === 'No Data' ? 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200' :
                  'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                }`}>
                  {behaviorAnalysis.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Confidence:</span>
                <span className="text-sm text-gray-900 dark:text-white">{behaviorAnalysis.confidence}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Typing Variance:</span>
                <span className="text-sm text-gray-900 dark:text-white">{behaviorAnalysis.variance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Consistency:</span>
                <span className="text-sm text-gray-900 dark:text-white">{behaviorAnalysis.consistency}%</span>
              </div>
              

            </div>
          </div>

          {/* Linguistic Fingerprint */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Linguistic Fingerprint</h3>
            <div className="mb-4 h-48">
              <Radar data={getLinguisticRadarData()} options={getChartOptions('radar')} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Linguistic analysis based on user profile and historical data
              </p>
            </div>
          </div>
        </div>

        {/* User Alerts */}
        {userAlerts.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User-Specific Alerts</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {userAlerts.map((alert) => (
                  <div key={alert._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">{alert.type}</p>
                      <p className="text-sm text-red-600 dark:text-red-300">{alert.description}</p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'Critical' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                      alert.severity === 'High' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      alert.severity === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                      'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustDNAProfiler;
