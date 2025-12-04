import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/customer/login');
      return;
    }

    // Decode JWT to get user ID
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      fetchUserData(payload.id);
    } catch (err) {
      console.error('Invalid token:', err);
      navigate('/customer/login');
    }
  }, [navigate]);



  const fetchUserData = async (userId) => {
    try {
      const response = await apiService.getUserById(userId);
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskLevelColor = (level) => {
    if (level === 'Low') return 'text-green-600 bg-green-100';
    if (level === 'Medium') return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/customer/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TrustLens</h1>
              <span className="ml-3 text-sm text-gray-500">Customer Dashboard</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user.username}!
              </h2>
              <p className="text-gray-600">
                Account created: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Trust Score */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Trust Score</p>
                <p className={`text-2xl font-bold px-3 py-1 rounded-full ${getTrustScoreColor(user.trustScore)}`}>
                  {user.trustScore}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Level */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Risk Level</p>
                <p className={`text-lg font-semibold px-3 py-1 rounded-full ${getRiskLevelColor(user.riskLevel)}`}>
                  {user.riskLevel}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{user.transactionCount}</p>
              </div>
            </div>
          </div>

          {/* Account Age */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Age</p>
                <p className="text-2xl font-bold text-green-600">{user.accountAge} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Activity */}
        {user.recentActivity && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Last Order</p>
                <p className="text-lg font-medium text-gray-900">
                  {user.recentActivity.lastOrderDate 
                    ? new Date(user.recentActivity.lastOrderDate).toLocaleDateString()
                    : 'No orders yet'
                  }
                </p>
                {user.recentActivity.daysSinceLastOrder !== null && (
                  <p className="text-xs text-gray-500">
                    {user.recentActivity.daysSinceLastOrder} days ago
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-lg font-medium text-green-600">
                  ₹{user.recentActivity.totalSpent.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Last 5 orders
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Recent Orders</p>
                <p className="text-lg font-medium text-blue-600">
                  {user.recentActivity.recentOrders}
                </p>
                <p className="text-xs text-gray-500">
                  Last 5 orders
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Username</label>
              <p className="text-lg font-medium text-gray-900">{user.username}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <p className="text-lg font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mobile Number</label>
              <p className="text-lg font-medium text-gray-900">{user.mobileNumber}</p>
            </div>

          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/customer/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Browse Products
            </button>
            <button 
              onClick={() => navigate('/customer/orders')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
            >
              My Orders
            </button>

          </div>
        </div>
      </div>
    </div>
  );
} 