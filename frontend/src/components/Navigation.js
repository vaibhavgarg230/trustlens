import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show navigation on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TRUSTLENS</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">AI-Powered Trust System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
