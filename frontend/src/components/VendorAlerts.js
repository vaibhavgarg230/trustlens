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

const VendorAlerts = ({ vendorId }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [vendorName, setVendorName] = useState('');

  useEffect(() => {
    if (vendorId) {
      fetchVendorAlerts();
    }
  }, [vendorId]);

  useEffect(() => {
    applyFilters();
  }, [alerts, filter, severityFilter]);

  const fetchVendorAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/vendor/vendors/${vendorId}/alerts`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setAlerts(data.alerts || []);
      setStats(data.stats || {});
      setVendorName(data.vendorName || '');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendor alerts:', error);
      setError(`Failed to fetch alerts: ${error.message}`);
      setLoading(false);
    }
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
      const response = await fetch(`http://localhost:3001/api/vendor/vendors/${vendorId}/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Refresh alerts after resolving
      await fetchVendorAlerts();
      setSelectedAlert(null);
      
      // Show success message
      alert('Alert resolved successfully!');
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert(`Failed to resolve alert: ${error.message}`);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/vendor/vendors/${vendorId}/alerts/${alertId}/dismiss`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Refresh alerts after dismissing
      await fetchVendorAlerts();
      setSelectedAlert(null);
      
      // Show success message
      alert('Alert dismissed successfully!');
    } catch (error) {
      console.error('Error dismissing alert:', error);
      alert(`Failed to dismiss alert: ${error.message}`);
    }
  };

  const createTestAlert = async () => {
    try {
      const testAlert = {
        type: 'Bot Behavior',
        severity: 'Medium',
        description: `Test alert for vendor ${vendorName} - suspicious activity detected`,
        data: {
          source: 'manual_test',
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(`http://localhost:3001/api/vendor/vendors/${vendorId}/alerts`, {
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

      await fetchVendorAlerts();
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
        data: [
          stats.critical || 0,
          stats.high || 0,
          stats.medium || 0,
          stats.low || 0
        ],
        backgroundColor: [
          '#8B5CF6', // Purple for Critical
          '#EF4444', // Red for High
          '#F59E0B', // Yellow for Medium
          '#10B981'  // Green for Low
        ],
        borderWidth: 2,
        borderColor: '#374151'
      }]
    };
  };

  const getStatusDistributionData = () => {
    return {
      labels: ['Active', 'Resolved', 'Dismissed'],
      datasets: [{
        data: [
          stats.active || 0,
          stats.resolved || 0,
          stats.dismissed || 0
        ],
        backgroundColor: [
          '#EF4444', // Red for Active
          '#10B981', // Green for Resolved
          '#6B7280'  // Gray for Dismissed
        ],
        borderWidth: 2,
        borderColor: '#374151'
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
        <div className="flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={fetchVendorAlerts}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vendor Alerts Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {vendorName ? `Managing alerts for ${vendorName}` : 'Loading vendor information...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={createTestAlert}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Create Test Alert
          </button>
          <button
            onClick={fetchVendorAlerts}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-red-600">{stats.active || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-purple-600">{stats.critical || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">{stats.resolved || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alerts by Severity
          </h3>
          <div className="h-64">
            <Doughnut data={getSeverityDistributionData()} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alerts by Status
          </h3>
          <div className="h-64">
            <Doughnut data={getStatusDistributionData()} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Severity:
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Alerts
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {alerts.length === 0 ? 'No alerts found for this vendor.' : 'No alerts match the current filters.'}
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getSeverityIcon(alert.severity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          alert.status === 'Active' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          alert.status === 'Resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {alert.status === 'Active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveAlert(alert._id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert._id);
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getSeverityIcon(selectedAlert.severity)}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedAlert.type}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(selectedAlert.severity)}`}>
                        {selectedAlert.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedAlert.status === 'Active' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        selectedAlert.status === 'Resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {selectedAlert.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedAlert.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedAlert.createdAt).toLocaleString()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">Target:</span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">
                        {selectedAlert.target}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedAlert.targetType}
                      </span>
                    </div>
                  </div>
                </div>
                
                {selectedAlert.actions && selectedAlert.actions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Suggested Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlert.actions.map((action, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedAlert.status === 'Active' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => resolveAlert(selectedAlert._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
                    >
                      ✓ Resolve Alert
                    </button>
                    <button
                      onClick={() => dismissAlert(selectedAlert._id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAlerts;