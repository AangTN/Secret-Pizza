import React, { useState } from 'react';
import ReviewCard from './ReviewCard';
import AdminResponsiveContainer from '../../AdminResponsiveContainer/AdminResponsiveContainer';

// Example review data
const exampleReviews = [
  {
    id: 'review-001',
    orderId: 'ORD-2024-001',
    customer: 'Nguyễn Văn A',
    rating: 5,
    comment: 'Sản phẩm rất tốt, giao hàng nhanh. Pizza ngon, nhân viên thân thiện. Sẽ tiếp tục ủng hộ quán trong tương lai. Rất hài lòng với chất lượng dịch vụ!',
    date: '08/11/2024 14:30'
  },
  {
    id: 'review-002',
    orderId: 'ORD-2024-002',
    customer: 'Trần Thị B',
    rating: 4,
    comment: 'Chất lượng tốt, nhưng thời gian giao hơi lâu. Tổng thể vẫn hài lòng.',
    date: '08/11/2024 13:15'
  },
  {
    id: 'review-003',
    orderId: 'ORD-2024-003',
    customer: 'Lê Văn C',
    rating: 2,
    comment: 'Pizza bị nguội khi giao đến, chất lượng không như mong đợi. Cần cải thiện nhiều hơn.',
    date: '08/11/2024 12:00'
  },
  {
    id: 'review-004',
    orderId: 'ORD-2024-004',
    customer: 'Phạm Thị D',
    rating: 3,
    comment: 'Bình thường, không có gì đặc biệt. Giá cả hợp lý so với chất lượng.',
    date: '08/11/2024 11:45'
  }
];

// Example usage component
const ReviewCardExample = () => {
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Action handlers
  const handleReply = (reviewId) => {
    console.log('Reply to review:', reviewId);
    setSelectedReview(reviewId);
    // Implement reply logic here
  };

  const handleHide = (reviewId) => {
    console.log('Hide review:', reviewId);
    // Implement hide logic here
  };

  const handleView = (reviewId) => {
    console.log('View review details:', reviewId);
    setSelectedReview(reviewId);
    // Implement view details logic here
  };

  // Simulate loading state
  const toggleLoading = () => {
    setLoading(!loading);
  };

  return (
    <AdminResponsiveContainer>
      <div style={{ padding: 'var(--admin-space-lg)' }}>
        <div style={{ marginBottom: 'var(--admin-space-lg)' }}>
          <h2>ReviewCard Component Examples</h2>
          <p>Specialized card component for customer reviews with star ratings and expandable comments.</p>
          
          <button 
            onClick={toggleLoading}
            style={{
              padding: 'var(--admin-space-sm) var(--admin-space-md)',
              background: 'var(--admin-primary)',
              color: 'var(--admin-white)',
              border: 'none',
              borderRadius: 'var(--admin-radius-sm)',
              cursor: 'pointer',
              marginBottom: 'var(--admin-space-md)'
            }}
          >
            {loading ? 'Stop Loading' : 'Show Loading State'}
          </button>
        </div>

        {/* Grid layout for review cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 'var(--admin-space-lg)',
          marginBottom: 'var(--admin-space-lg)'
        }}>
          {exampleReviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              data={review}
              onReply={handleReply}
              onHide={handleHide}
              onView={handleView}
              loading={loading}
              animate={true}
              index={index}
              maxCommentLength={150}
            />
          ))}
        </div>

        {/* Selected review info */}
        {selectedReview && (
          <div style={{
            padding: 'var(--admin-space-md)',
            background: 'var(--admin-bg-secondary)',
            borderRadius: 'var(--admin-radius-md)',
            border: '1px solid var(--admin-border-light)'
          }}>
            <h3>Selected Review: {selectedReview}</h3>
            <p>This demonstrates how the action handlers work. Check the console for details.</p>
            <button 
              onClick={() => setSelectedReview(null)}
              style={{
                padding: 'var(--admin-space-xs) var(--admin-space-sm)',
                background: 'var(--admin-secondary)',
                color: 'var(--admin-white)',
                border: 'none',
                borderRadius: 'var(--admin-radius-sm)',
                cursor: 'pointer'
              }}
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Usage documentation */}
        <div style={{
          marginTop: 'var(--admin-space-xl)',
          padding: 'var(--admin-space-lg)',
          background: 'var(--admin-bg-secondary)',
          borderRadius: 'var(--admin-radius-lg)'
        }}>
          <h3>Usage Example</h3>
          <pre style={{
            background: 'var(--admin-bg-tertiary)',
            padding: 'var(--admin-space-md)',
            borderRadius: 'var(--admin-radius-sm)',
            overflow: 'auto',
            fontSize: 'var(--admin-font-size-sm)'
          }}>
{`import ReviewCard from './components/admin/AdminTableCard/variants/ReviewCard';

// In your ManageReviews component
<ReviewCard
  data={review}
  onReply={() => handleReply(review.id)}
  onHide={() => handleHide(review.id)}
  onView={() => handleView(review.id)}
  index={index}
  animate={true}
  maxCommentLength={150}
/>`}
          </pre>
          
          <h4>Data Structure</h4>
          <pre style={{
            background: 'var(--admin-bg-tertiary)',
            padding: 'var(--admin-space-md)',
            borderRadius: 'var(--admin-radius-sm)',
            overflow: 'auto',
            fontSize: 'var(--admin-font-size-sm)'
          }}>
{`{
  id: string,           // Review ID
  orderId: string,      // Order ID reference
  customer: string,     // Customer name
  rating: number,       // Star rating (1-5)
  comment: string,      // Review comment
  date: string          // Review date
}`}
          </pre>
        </div>
      </div>
    </AdminResponsiveContainer>
  );
};

export default ReviewCardExample;