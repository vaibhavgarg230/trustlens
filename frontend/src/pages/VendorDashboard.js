import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VendorProductManager from '../components/VendorProductManager';
import VendorOrderManager from '../components/VendorOrderManager';
import VendorAnalytics from '../components/VendorAnalytics';
import VendorAlerts from '../components/VendorAlerts';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const vendorId = localStorage.getItem('vendorId');

    if (!token || userRole !== 'vendor' || !vendorId) {
      navigate('/vendor/login');
      return;
    }

    fetchVendorData(vendorId);
  }, [navigate]);

  const fetchVendorData = async (vendorId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/vendor/vendors/${vendorId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const vendorData = await response.json();
        setVendor(vendorData);
      } else {
        setError('Failed to fetch vendor data');
      }
    } catch (err) {
      setError('Error loading vendor data');
      console.error('Vendor data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('vendorId');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/vendor/login')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
              <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {vendor?.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Welcome back, {vendor?.contactPerson?.name || 'Vendor'}!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Trust Score</h3>
              <p className="text-2xl font-bold text-blue-600">{vendor?.trustScore !== undefined ? Number(vendor.trustScore).toFixed(2) : '50.00'}/100</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Total Sales</h3>
              <p className="text-2xl font-bold text-green-600">₹{vendor?.totalSales || 0}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900">Return Rate</h3>
              <p className="text-2xl font-bold text-yellow-600">{vendor?.overallReturnRate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div 
            onClick={() => setActiveView('products')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Products</h3>
                <p className="text-sm text-gray-600">Manage inventory</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView('orders')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Orders</h3>
                <p className="text-sm text-gray-600">View & manage</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView('analytics')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-600">Sales insights</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView('alerts')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Alerts</h3>
                <p className="text-sm text-gray-600">Important notices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Content Rendering */}
        {activeView === 'products' && <VendorProductManager />}
        
        {activeView === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Company Details</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Name:</span> {vendor?.name}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Email:</span> {vendor?.companyEmail}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                    vendor?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Contact Person</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Name:</span> {vendor?.contactPerson?.name}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Email:</span> {vendor?.contactPerson?.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {vendor?.contactPerson?.phone || 'Not provided'}
                </p>
              </div>
            </div>
            
            {vendor?.addresses && vendor.addresses.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-2">Business Address</h4>
                <div className="text-sm text-gray-600">
                  <p>{vendor.addresses[0].street}</p>
                  <p>{vendor.addresses[0].city}, {vendor.addresses[0].state} {vendor.addresses[0].postalCode}</p>
                  <p>{vendor.addresses[0].country}</p>
                  <p>Phone: {vendor.addresses[0].phone}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'orders' && <VendorOrderManager />}
        
        {activeView === 'analytics' && <VendorAnalytics />}
        
        {activeView === 'alerts' && <VendorAlerts vendorId={vendor?._id} />}
      </main>
    </div>
  );
} 