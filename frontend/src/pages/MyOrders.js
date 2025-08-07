import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import ReviewModal from '../components/ReviewModal';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/customer/login');
        return;
      }

      // Decode JWT to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const response = await apiService.getCustomerOrders(payload.id);
      setOrders(response.data.orders);
      setLoading(false);
    } catch (err) {
      setError('Failed to load orders');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Shipped': return 'text-blue-600 bg-blue-100';
      case 'Processing': return 'text-yellow-600 bg-yellow-100';
      case 'Confirmed': return 'text-purple-600 bg-purple-100';
      case 'Pending': return 'text-orange-600 bg-orange-100';
      case 'Cancelled': return 'text-red-600 bg-red-100';
      case 'Returned': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFraudRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleViewDetails = (order) => {
    console.log('Opening order details for:', order.orderNumber);
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCancelOrder = async (orderId, reason = 'Customer requested cancellation') => {
    setCancellingOrder(orderId);
    try {
      await apiService.cancelOrder(orderId, reason);
      // Refresh orders after cancellation
      await fetchOrders();
      setCancellingOrder(null);
    } catch (err) {
      setError('Failed to cancel order');
      setCancellingOrder(null);
    }
  };

  const canCancelOrder = (status) => {
    return ['Pending', 'Confirmed', 'Processing'].includes(status);
  };

  const handleWriteReview = (order) => {
    setReviewOrder(order);
    setShowReviewModal(true);
  };

  const handleReviewSubmitted = (reviewData) => {
    // Refresh orders to update review status
    fetchOrders();
    console.log('Review submitted:', reviewData);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
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
            onClick={() => navigate('/customer/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
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
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <span className="ml-3 text-sm text-gray-500">({orders.length} orders)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
            <button
              onClick={() => navigate('/customer/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0 flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFraudRiskColor(order.fraudRisk)}`}>
                        Risk: {order.fraudRisk}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={order.productImage}
                      alt={order.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{order.productName}</h4>
                      <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                      <p className="text-lg font-bold text-green-600">₹{order.totalAmount}</p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Vendor</p>
                      <p className="font-medium">{order.vendorName}</p>
                      <p className="text-sm text-blue-600">Trust Score: {order.vendorTrustScore !== undefined ? Number(order.vendorTrustScore).toFixed(2) : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment</p>
                      <p className="font-medium">{order.paymentMethod}</p>
                      <p className="text-sm text-gray-600">{order.paymentStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery</p>
                      <p className="font-medium">
                        {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : 'TBD'}
                      </p>
                      {order.trackingNumber && (
                        <p className="text-sm text-blue-600">Track: {order.trackingNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Trust & Security Info */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">🛡️</span>
                      <span className="text-sm text-blue-700">
                        Order Trust Score: <span className="font-bold">{order.orderTrustScore !== undefined ? Number(order.orderTrustScore).toFixed(2) : ''}/100</span>
                      </span>
                    </div>
                    <div className="text-sm text-blue-600">
                      Fraud Risk: {order.fraudRisk}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      View Details
                    </button>
                    
                    {canCancelOrder(order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        disabled={cancellingOrder === order._id}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
                      >
                        {cancellingOrder === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                    
                    {order.status === 'Delivered' && !order.reviewSubmitted && (
                      <button 
                        onClick={() => handleWriteReview(order)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                      >
                        Write Review
                      </button>
                    )}
                    
                    {order.reviewSubmitted && (
                      <button 
                        disabled
                        className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                      >
                        Review Submitted ✓
                      </button>
                    )}
                    
                    {order.trackingNumber && (
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                        Track Package
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderDetails(false)}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debug logging
  console.log('OrderDetailsModal rendered with order:', order?.orderNumber);

  if (!order) {
    console.log('No order provided to modal');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Order Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold mb-2">Order Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Order Number:</span> {order.orderNumber}</p>
              <p><span className="font-medium">Status:</span> {order.status}</p>
              <p><span className="font-medium">Order Date:</span> {formatDate(order.createdAt)}</p>
              <p><span className="font-medium">Total Amount:</span> ₹{order.totalAmount}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Shipping Address</h4>
            <div className="text-sm text-gray-600">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
              <p>{order.shippingAddress.zipCode}, {order.shippingAddress.country}</p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Product Details</h4>
          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <img
              src={order.productImage}
              alt={order.productName}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <h5 className="font-medium">{order.productName}</h5>
              <p className="text-sm text-gray-600">Price: ₹{order.productPrice}</p>
              <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
              <p className="text-sm text-gray-600">Vendor: {order.vendorName}</p>
            </div>
          </div>
        </div>

        {/* Trust & Security */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Trust & Security</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Order Trust Score</p>
              <p className="text-2xl font-bold text-blue-600">{order.orderTrustScore !== undefined ? Number(order.orderTrustScore).toFixed(2) : ''}</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">Fraud Risk</p>
              <p className="text-lg font-bold text-yellow-600">{order.fraudRisk}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Vendor Trust</p>
              <p className="text-2xl font-bold text-green-600">{order.vendorTrustScore !== undefined ? Number(order.vendorTrustScore).toFixed(2) : ''}</p>
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Order Timeline</h4>
          <div className="space-y-3">
            {order.timeline && order.timeline.length > 0 ? (
              order.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
                  <div className="flex-1">
                    <p className="font-medium">{event.status}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(event.timestamp)} • Updated by {event.updatedBy}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No timeline events available</p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 