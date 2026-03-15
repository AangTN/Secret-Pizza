import React from 'react';

const EmptyState = ({ title = 'Không có dữ liệu', description = 'Hãy thử lại sau.' }) => {
  return (
    <div className="text-center text-muted py-5">
      <div style={{ fontSize: 56 }}>🍕</div>
      <h5 className="mt-3">{title}</h5>
      <p className="mb-0">{description}</p>
    </div>
  );
};

export default EmptyState;
