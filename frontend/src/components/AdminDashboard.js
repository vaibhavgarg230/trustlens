import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import MarketplaceSimulator from './MarketplaceSimulator';
import TrustDNAProfiler from './TrustDNAProfiler';
import PredictionMarket from './PredictionMarket';
import CommunityValidation from './CommunityValidation';
import ThemeToggle from './ThemeToggle';
import ProductTracker from './ProductTracker';
import AlertSystem from './AlertSystem';
import EnhancedReviewAuth from './EnhancedReviewAuth';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '' },
    { id: 'analytics', name: 'TrustDNA', icon: '' },
    { id: 'product-tracker', name: 'Product Tracker', icon: '' },
    { id: 'review-auth', name: 'Review Auth', icon: '' },
    { id: 'marketplace', name: 'Marketplace', icon: '' },
    { id: 'predictions', name: 'Prediction Market', icon: '' },
    { id: 'alerts', name: 'Alert System', icon: '' },
    { id: 'community', name: 'Community Validation', icon: '' }
  ];

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      
      if (token && role === 'admin') {
        // Verify token is valid by decoding it
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          // Check if token is expired
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp && decoded.exp > now && decoded.role === 'admin') {
            setIsAuthenticated(true);
          } else {
            // Token expired
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('adminAuth');
            setIsAuthenticated(false);
          }
        } catch (e) {
          // Invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('adminAuth');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('adminAuth');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'analytics':
        return <TrustDNAProfiler />;
      case 'product-tracker':
        return <ProductTracker />;
      case 'review-auth':
        return <EnhancedReviewAuth />;
      case 'marketplace':
        return <MarketplaceSimulator />;
      case 'predictions':
        return <PredictionMarket />;
      case 'alerts':
        return <AlertSystem />;
      case 'community':
        return <CommunityValidation />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-900 dark:text-white">Verifying Admin Access...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Admin Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">TRUSTLENS Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard; 