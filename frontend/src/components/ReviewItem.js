import React from 'react';

const ReviewItem = ({ review }) => {
  return (
    <div className="review-item">
      <p><strong>Rating:</strong> {review.rating} / 5</p>
      <p>{review.content}</p>
      {review.isAIGenerated && (
        <span className="badge-ai-warning"> Suspected AI-generated</span>
      )}
      <p className="auth-score">Authenticity Score: {review.authenticityScore}%</p>
    </div>
  );
};

export default ReviewItem;
