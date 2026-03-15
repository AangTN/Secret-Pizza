import React from 'react';
import ProductCard from './ProductCard';

// Example usage data
const exampleProduct = {
  MaMonAn: 'SP001',
  TenMonAn: 'Pizza Hải Sản Đặc Biệt',
  MaLoaiMonAn: 'LM001',
  DanhMuc: [
    { TenDanhMuc: 'Pizza' },
    { TenDanhMuc: 'Hải sản' },
    { TenDanhMuc: 'Đặc biệt' }
  ],
  MoTa: 'Pizza với hải sản tươi ngon bao gồm tôm, mực, sò điệp và các loại hải sản cao cấp khác, được chế biến theo công thức đặc biệt của nhà hàng.',
  Gia: 285000,
  HinhAnh: 'https://example.com/pizza-hai-san.jpg',
  updatedAt: '2024-01-15T10:30:00Z'
};

const exampleOption = {
  id: 'OPT001',
  name: 'Kích thước Lớn',
  group: 'Size',
  priceTable: [
    { size: 'S', value: 185000 },
    { size: 'M', value: 235000 },
    { size: 'L', value: 285000 },
    { size: 'XL', value: 335000 }
  ],
  description: 'Tùy chọn kích thước cho pizza, phù hợp với số lượng người ăn khác nhau',
  updatedAt: '2024-01-15T10:30:00Z'
};

const typeMap = {
  'LM001': 'Pizza',
  'LM002': 'Món phụ',
  'LM003': 'Đồ uống'
};

// Example component demonstrating ProductCard usage
const ProductCardExample = () => {
  const handleEdit = (item) => {
    console.log('Edit:', item);
    alert(`Sửa ${item.TenMonAn || item.name}`);
  };

  const handleDelete = (item) => {
    console.log('Delete:', item);
    alert(`Xóa ${item.TenMonAn || item.name}`);
  };

  const handleView = (item) => {
    console.log('View:', item);
    alert(`Xem chi tiết ${item.TenMonAn || item.name}`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>ProductCard Examples</h2>
      
      <div style={{ marginBottom: '40px' }}>
        <h3>Product Card with Image</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={exampleProduct}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={0}
            animate={true}
            showImage={true}
            maxDescriptionLength={120}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Product Card without Image</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={exampleProduct}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={1}
            animate={true}
            showImage={false}
            maxDescriptionLength={100}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Option Card with Price Variations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={exampleOption}
            type="option"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={2}
            animate={true}
            showImage={false}
            maxDescriptionLength={150}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Loading State</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={exampleProduct}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={3}
            animate={true}
            showImage={true}
            loading={true}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Empty State</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={null}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={4}
            animate={true}
            showImage={true}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Product with No Categories</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={{
              ...exampleProduct,
              DanhMuc: []
            }}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={5}
            animate={true}
            showImage={true}
          />
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Product with Long Description</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <ProductCard
            data={{
              ...exampleProduct,
              MoTa: 'Đây là một mô tả rất dài cho sản phẩm để kiểm tra tính năng cắt ngắn và mở rộng văn bản. ' +
                    'Sản phẩm này được làm từ những nguyên liệu tươi ngon nhất, được chọn lọc kỹ lưỡng từ các nhà cung cấp uy tín. ' +
                    'Quy trình sản xuất tuân thủ các tiêu chuẩn chất lượng nghiêm ngặt, đảm bảo mang đến cho khách hàng những trải nghiệm ẩm thực tuyệt vời nhất. ' +
                    'Với hương vị đặc trưng và cách trình bày hấp dẫn, sản phẩm này chắc chắn sẽ làm hài lòng cả những thực khách khó tính nhất.'
            }}
            type="product"
            typeMap={typeMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            index={6}
            animate={true}
            showImage={true}
            maxDescriptionLength={100}
          />
        </div>
      </div>
    </div>
  );
};

// Usage in ManageProducts.jsx
export const ManageProductsUsage = () => {
  const products = [exampleProduct];
  const typeMap = { 'LM001': 'Pizza' };

  const handleEdit = (product) => {
    // Handle edit logic
    console.log('Editing product:', product);
  };

  const handleDelete = (product) => {
    // Handle delete logic
    console.log('Deleting product:', product);
  };

  const handleView = (product) => {
    // Handle view logic
    console.log('Viewing product:', product);
  };

  return (
    <div className="products-grid">
      {products.map((product, index) => (
        <ProductCard
          key={product.MaMonAn}
          data={product}
          type="product"
          typeMap={typeMap}
          onEdit={() => handleEdit(product)}
          onDelete={() => handleDelete(product)}
          onView={() => handleView(product)}
          index={index}
          animate={true}
          showImage={true}
          maxDescriptionLength={120}
        />
      ))}
    </div>
  );
};

// Usage in ManageOptions.jsx
export const ManageOptionsUsage = () => {
  const options = [exampleOption];

  const handleEdit = (option) => {
    // Handle edit logic
    console.log('Editing option:', option);
  };

  const handleDelete = (option) => {
    // Handle delete logic
    console.log('Deleting option:', option);
  };

  const handleView = (option) => {
    // Handle view logic
    console.log('Viewing option:', option);
  };

  return (
    <div className="options-grid">
      {options.map((option, index) => (
        <ProductCard
          key={option.id}
          data={option}
          type="option"
          onEdit={() => handleEdit(option)}
          onDelete={() => handleDelete(option)}
          onView={() => handleView(option)}
          index={index}
          animate={true}
          showImage={false}
          maxDescriptionLength={150}
        />
      ))}
    </div>
  );
};

export default ProductCardExample;