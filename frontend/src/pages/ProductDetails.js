import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProductDetails();
    fetchProductReviews();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      const response = await apiService.getProductById(productId);
      setProduct(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load product details');
      setLoading(false);
    }
  };

  const fetchProductReviews = async () => {
    try {
      const response = await apiService.getReviewsByProduct(productId);
      setReviews(response.data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getReturnRateColor = (rate) => {
    if (rate <= 5) return 'text-green-600 bg-green-100';
    if (rate <= 15) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <button 
            onClick={() => navigate('/customer/products')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Products
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
                onClick={() => navigate('/customer/products')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Products
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex space-x-2 mt-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded border-2 overflow-hidden ${
                      selectedImage === index ? 'border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-4xl font-bold text-green-600">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xl text-gray-500 line-through">₹{product.originalPrice}</span>
              )}
            </div>

            {/* Vendor Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Vendor Information</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{product.seller?.name || 'Unknown Vendor'}</p>
                  <p className="text-sm text-gray-600">
                    Rating: {product.seller?.rating || 'N/A'} ⭐
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreColor(product.seller?.trustScore || 50)}`}>
                    Trust: {product.seller?.trustScore !== undefined ? Number(product.seller.trustScore).toFixed(2) : '50.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Authenticity Score</p>
                <p className="text-2xl font-bold text-blue-600">{product.authenticityScore || 85}%</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Return Rate</p>
                <p className={`text-lg font-bold ${getReturnRateColor(product.returnRate || 8)}`}>
                  {product.returnRate || 8}%
                </p>
              </div>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Stock:</span>
                <span className={`font-medium ${product.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.quantity > 0 ? `${product.quantity} available` : 'Out of stock'}
                </span>
              </div>
            </div>


          </div>
        </div>

        {/* Product Description */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Description</h2>
          <p className="text-gray-700 leading-relaxed">
            {product.description || 'No description available for this product.'}
          </p>
          
          {/* Category and Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {product.category}
            </span>
            {product.tags && product.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {review.reviewer?.username || 'Anonymous'}
                        </span>
                        <span className="text-yellow-500">{renderStars(review.rating)}</span>
                        <span className="text-sm text-gray-600">({review.rating}/5)</span>
                      </div>
                      <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                    </div>
                    {review.authenticityScore && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTrustScoreColor(review.authenticityScore)}`}>
                        {review.authenticityScore}% Authentic
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">{review.content}</p>
                  
                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-2">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Review Helpfulness */}
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                    <button className="hover:text-blue-600">👍 Helpful ({review.helpfulVotes || 0})</button>
                    <button className="hover:text-red-600">👎 Not helpful</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 