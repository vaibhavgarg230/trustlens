import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

const AlertSystem = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, filter, severityFilter]);

  const fetchAlerts = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/alerts', {
      headers: {
        'Accept': 'application/json'
      }
    });
    const alertsData = await response.json();

    
    setAlerts(alertsData);
    calculateStats(alertsData); // This should update stats
    setLoading(false);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    setLoading(false);
  }
};


  const calculateStats = (alertsData) => {
  const stats = {
    total: alertsData.length,
    active: alertsData.filter(a => a.status === 'Active').length,
    resolved: alertsData.filter(a => a.status === 'Resolved').length,
    critical: alertsData.filter(a => a.severity === 'Critical').length,
    high: alertsData.filter(a => a.severity === 'High').length,
    medium: alertsData.filter(a => a.severity === 'Medium').length,
    low: alertsData.filter(a => a.severity === 'Low').length
  };
  

  setStats(stats);
};


  const applyFilters = () => {
    let filtered = alerts;

    if (filter !== 'all') {
      filtered = filtered.filter(alert => alert.status === filter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    setFilteredAlerts(filtered);
  };

  const resolveAlert = async (alertId) => {
  try {


    const response = await fetch(`http://localhost:3001/api/alerts/${alertId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status: 'Resolved' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();


    // FORCE COMPLETE REFRESH
    setSelectedAlert(null);
    setLoading(true);
    
    // Wait a moment for backend to update
    setTimeout(async () => {
      try {
        const freshResponse = await fetch('http://localhost:3001/api/alerts', {
          headers: { 'Accept': 'application/json' }
        });
        const freshAlerts = await freshResponse.json();
        

        
        setAlerts(freshAlerts);
        calculateStats(freshAlerts);
        setLoading(false);
        
        alert('Alert resolved successfully!');
      } catch (error) {
        console.error('Error refreshing after resolve:', error);
        setLoading(false);
      }
    }, 500); // 500ms delay to ensure backend is updated
    
  } catch (error) {
    console.error('Error resolving alert:', error);
    alert(`Failed to resolve alert: ${error.message}`);
  }
};

    

  const createTestAlert = async () => {
  try {
    const testAlert = {
      type: 'Bot Behavior', // Correct enum value
      severity: 'Medium',
      description: 'This is a test alert created from the Alert System interface',
      target: '6841c7373efc698423881aff',
      targetType: 'User', // Correct enum value (capital U)
      status: 'Active'
      // Removed 'source' field as it's not in your schema
    };



    const response = await fetch('http://localhost:3001/api/alerts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testAlert)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();


    await fetchAlerts();
    alert('Test alert created successfully!');
  } catch (error) {
    console.error('Error creating test alert:', error);
    alert(`Failed to create alert: ${error.message}`);
  }
};

  const getSeverityColor = (severity) => {
    const colors = {
      'Critical': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
      'High': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
      'Medium': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
      'Low': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'
    };
    return colors[severity] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      'Critical': '',
      'High': '',
      'Medium': '',
      'Low': ''
    };
    return icons[severity] || '';
  };



  const getSeverityDistributionData = () => {
    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [stats.critical, stats.high, stats.medium, stats.low],
        backgroundColor: ['#8b5cf6', '#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 2
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Alert System...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Alert Management System</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor and manage security alerts and system notifications</p>
            </div>
            <button
              onClick={createTestAlert}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
            >
              Create Test Alert
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Alerts</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.total || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.active || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resolved</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.resolved || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Critical</h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.critical || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity:</label>
              <select 
                value={severityFilter} 
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Severity Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Severity Distribution</h3>
            <Doughnut data={getSeverityDistributionData()} options={{ 
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

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setFilter('Active');
                  setSeverityFilter('all');
                }}
                className="w-full text-left p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200"
              >
                <div className="font-medium text-red-800 dark:text-red-200">View Active Alerts</div>
                <div className="text-sm text-red-600 dark:text-red-300">{stats.active} alerts need attention</div>
              </button>
              <button
                onClick={() => {
                  setSeverityFilter('Critical');
                  setFilter('all');
                }}
                className="w-full text-left p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200"
              >
                <div className="font-medium text-purple-800 dark:text-purple-200">Critical Alerts</div>
                <div className="text-sm text-purple-600 dark:text-purple-300">{stats.critical} critical issues</div>
              </button>
              <button
                onClick={() => {
                  fetchAlerts();
                }}
                className="w-full text-left p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
              >
                <div className="font-medium text-blue-800 dark:text-blue-200">Refresh Alerts</div>
                <div className="text-sm text-blue-600 dark:text-blue-300">Update alert list</div>
              </button>
            </div>
          </div>
        </div>

        {/* Alert List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Management</h3>
          </div>
          <div className="p-6">
            {filteredAlerts.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                {alerts.length === 0 ? (
                  <>
                    <div className="text-4xl mb-4">✅</div>
                    <p className="font-medium text-green-600 dark:text-green-400">No critical alerts active</p>
                    <p className="text-sm mt-2">Your system is running smoothly</p>
                    <p className="text-xs mt-1 text-gray-400">Create test alerts or wait for real security events</p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="font-medium">No alerts match your current filters</p>
                    <p className="text-sm mt-2">Try adjusting your status or severity filters</p>
                    <div className="mt-4 space-x-2">
                      <button
                        onClick={() => {setFilter('all'); setSeverityFilter('all');}}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={createTestAlert}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors duration-200"
                      >
                        Create Test Alert
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert._id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} transition-colors duration-200`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">{alert.type}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              alert.status === 'Active' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            }`}>
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-xs">
                            <span>Target: {alert.target}</span>
                            <span>Source: {alert.source}</span>
                            <span>{new Date(alert.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                        >
                          View
                        </button>
                        {alert.status === 'Active' && (
                          <button
                            onClick={() => resolveAlert(alert._id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors duration-200"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alert Detail Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Alert Details</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                  <p className="text-gray-900 dark:text-white">{selectedAlert.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Severity:</label>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description:</label>
                  <p className="text-gray-900 dark:text-white">{selectedAlert.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target:</label>
                  <p className="text-gray-900 dark:text-white">{selectedAlert.target}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created:</label>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                {selectedAlert.status === 'Active' && (
                  <button
                    onClick={() => resolveAlert(selectedAlert._id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition-colors duration-200"
                  >
                    Resolve Alert
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded font-medium transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertSystem;
