import React, { useState } from 'react';
import apiService from '../services/api';
import ReviewAnalysisResults from './ReviewAnalysisResults';

export default function ReviewModal({ order, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          file,
          preview: e.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Review submission started for order:', order.orderNumber);
    
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }
    
    if (reviewText.trim().length < 10) {
      setError('Review must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Get user info from token
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));

      const reviewData = {
        product: order.product._id || order.product,
        reviewer: payload.id,
        rating,
        content: reviewText,
        images: images.map(img => img.preview),
        orderId: order._id,
        vendorId: order.vendor,
        purchaseVerified: true,
        behaviorMetrics: {
          writingTime: Date.now() - startTime,
          textLength: reviewText.length,
          revisionsCount: revisionsCount,
          imageCount: images.length,
          sessionDuration: Date.now() - sessionStartTime
        }
      };

      console.log('Submitting review data:', reviewData);
      const response = await apiService.createReview(reviewData);
      console.log('Review response:', response.data);
      
      // Check if it was an update or new submission
      if (response.data.isUpdate) {
        console.log('✅ Review updated successfully');
      } else {
        console.log('✅ Review submitted successfully');
      }
      
      // Update order to mark review as submitted
      // Remove this block to avoid sending invalid status
      // await apiService.updateOrderStatus(order._id, {
      //   reviewSubmitted: true,
      //   customerRating: rating
      // });

      // Show analysis results
      setAnalysisData(response.data);
      setShowAnalysisResults(true);
      
      onReviewSubmitted(response.data);
      
    } catch (err) {
      console.error('Review submission error:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Behavioral tracking variables
  const [startTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [revisionsCount, setRevisionsCount] = useState(0);

  const handleTextChange = (e) => {
    setReviewText(e.target.value);
    setRevisionsCount(prev => prev + 1);
  };

  const StarRating = ({ rating, onRatingChange, hoverRating, onHover, onLeave }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={onLeave}
            className={`text-2xl transition-colors ${
              star <= (hoverRating || rating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (!order) return null;

  // Show analysis results if available
  if (showAnalysisResults && analysisData) {
    return (
      <ReviewAnalysisResults
        analysisData={analysisData}
        onClose={() => {
          setShowAnalysisResults(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Write Review</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Product Info */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <img
            src={order.productImage}
            alt={order.productName}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{order.productName}</h4>
            <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
            <p className="text-sm text-gray-600">Vendor: {order.vendorName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating *
            </label>
            <div className="flex items-center space-x-4">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                hoverRating={hoverRating}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
              />
              <span className="text-sm text-gray-600">
                {rating > 0 && (
                  rating === 1 ? 'Poor' :
                  rating === 2 ? 'Fair' :
                  rating === 3 ? 'Good' :
                  rating === 4 ? 'Very Good' : 'Excellent'
                )}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Write your review * (minimum 10 characters)
            </label>
            <textarea
              value={reviewText}
              onChange={handleTextChange}
              placeholder="Share your experience with this product. What did you like or dislike? How was the quality, delivery, and overall experience?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              required
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{reviewText.length} characters</span>
              <span>{revisionsCount} revisions</span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photos (Optional - Max 3 images, 5MB each)
            </label>
            <div className="space-y-4">
              {images.length < 3 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <div className="text-4xl text-gray-400 mb-2">📷</div>
                    <p className="text-sm text-gray-600">Click to upload images</p>
                  </label>
                </div>
              )}
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.preview}
                        alt={`Review ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trust & Authenticity Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-xl">🛡️</div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Trust & Authenticity</h4>
                <p className="text-sm text-blue-700">
                  Your review will be analyzed using AI for authenticity and linguistic fingerprinting. 
                  This helps maintain trust in our review ecosystem and detect fake reviews.
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  • Purchase verified ✓ • IP tracking enabled ✓ • Behavioral analysis active ✓
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 