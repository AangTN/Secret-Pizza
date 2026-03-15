// Integration Example for SimpleEntityCard
// This file demonstrates how to use the SimpleEntityCard component

import React, { useState } from 'react';
import { SimpleEntityCard } from './index';

// Example usage in ManageCategories component
export const CategoryExample = () => {
  const [categories] = useState([
    { MaDanhMuc: 'DM001', TenDanhMuc: 'Món chính' },
    { MaDanhMuc: 'DM002', TenDanhMuc: 'Món phụ' },
    { MaDanhMuc: 'DM003', TenDanhMuc: 'Tráng miệng' },
    { MaDanhMuc: 'DM004', TenDanhMuc: 'Đồ uống' }
  ]);

  const handleEditCategory = (category) => {
    console.log('Edit category:', category);
    // Implementation for edit functionality
  };

  const handleDeleteCategory = (category) => {
    console.log('Delete category:', category);
    // Implementation for delete functionality
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {categories.map((category, index) => (
        <SimpleEntityCard
          key={category.MaDanhMuc}
          data={category}
          type="category"
          onEdit={() => handleEditCategory(category)}
          onDelete={() => handleDeleteCategory(category)}
          index={index}
          animate={true}
        />
      ))}
    </div>
  );
};

// Example usage in ManageTypes component
export const TypeExample = () => {
  const [types] = useState([
    { MaLoaiMonAn: 'LMA001', TenLoaiMonAn: 'Pizza' },
    { MaLoaiMonAn: 'LMA002', TenLoaiMonAn: 'Burger' },
    { MaLoaiMonAn: 'LMA003', TenLoaiMonAn: 'Pasta' },
    { MaLoaiMonAn: 'LMA004', TenLoaiMonAn: 'Salad' }
  ]);

  const handleEditType = (type) => {
    console.log('Edit type:', type);
    // Implementation for edit functionality
  };

  const handleDeleteType = (type) => {
    console.log('Delete type:', type);
    // Implementation for delete functionality
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {types.map((type, index) => (
        <SimpleEntityCard
          key={type.MaLoaiMonAn}
          data={type}
          type="type"
          onEdit={() => handleEditType(type)}
          onDelete={() => handleDeleteType(type)}
          index={index}
          animate={true}
        />
      ))}
    </div>
  );
};

// Complete example with loading states and empty state
export const CompleteExample = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('category');

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      if (entityType === 'category') {
        setData([
          { MaDanhMuc: 'DM001', TenDanhMuc: 'Món chính' },
          { MaDanhMuc: 'DM002', TenDanhMuc: 'Món phụ' }
        ]);
      } else {
        setData([
          { MaLoaiMonAn: 'LMA001', TenLoaiMonAn: 'Pizza' },
          { MaLoaiMonAn: 'LMA002', TenLoaiMonAn: 'Burger' }
        ]);
      }
      setLoading(false);
    }, 2000);
  };

  const handleEdit = (item) => {
    alert(`Edit: ${item.TenDanhMuc || item.TenLoaiMonAn}`);
  };

  const handleDelete = (item) => {
    alert(`Delete: ${item.TenDanhMuc || item.TenLoaiMonAn}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setEntityType('category')}>
          Categories
        </button>
        <button onClick={() => setEntityType('type')}>
          Types
        </button>
        <button onClick={simulateLoading}>
          Load Data
        </button>
        <button onClick={() => setData([])}>
          Clear Data
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {loading ? (
          // Show loading cards
          [1, 2, 3].map((i) => (
            <SimpleEntityCard
              key={`loading-${i}`}
              data={null}
              type={entityType}
              loading={true}
              index={i}
            />
          ))
        ) : data.length > 0 ? (
          // Show data cards
          data.map((item, index) => (
            <SimpleEntityCard
              key={item.MaDanhMuc || item.MaLoaiMonAn}
              data={item}
              type={entityType}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
              index={index}
              animate={true}
            />
          ))
        ) : (
          // Show empty state
          <SimpleEntityCard
            data={null}
            type={entityType}
          />
        )}
      </div>
    </div>
  );
};

// Usage in AdminResponsiveContainer
export const ResponsiveExample = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h3>Responsive SimpleEntityCard Example</h3>
      <p>Resize the window to see responsive behavior</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <SimpleEntityCard
          data={{ MaDanhMuc: 'DM001', TenDanhMuc: 'Món chính' }}
          type="category"
          onEdit={() => console.log('Edit category')}
          onDelete={() => console.log('Delete category')}
          animate={true}
        />
        
        <SimpleEntityCard
          data={{ MaLoaiMonAn: 'LMA001', TenLoaiMonAn: 'Pizza' }}
          type="type"
          onEdit={() => console.log('Edit type')}
          onDelete={() => console.log('Delete type')}
          animate={true}
        />
      </div>
    </div>
  );
};

export default {
  CategoryExample,
  TypeExample,
  CompleteExample,
  ResponsiveExample
};