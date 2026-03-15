const foodService = require('./food.service');

const getFoods = async (req, res) => {
  try {
    const foods = await foodService.getAllFoods();
    res.status(200).json(foods);
  } catch (error) {
    console.error('Error in getFoods controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getFoodById = async (req, res) => {
  try {
    const id = req.params.id;
    const food = await foodService.getFoodDetail(id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.status(200).json(food);
  } catch (error) {
    console.error('Error in getFoodById controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getBestSelling = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const foods = await foodService.getBestSellingFoods(categoryId);
    res.status(200).json(foods);
  } catch (error) {
    console.error('Error in getBestSelling controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getFeaturedFoods = async (req, res) => {
  try {
    const foods = await foodService.getFeaturedFoods();
    res.status(200).json(foods);
  } catch (error) {
    console.error('Error in getFeaturedFoods controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const createFood = async (req, res) => {
  try {
    // Parse JSON data from multipart form
    const data = JSON.parse(req.body.data);
    
    // Get uploaded file path (relative path for storage in DB)
    const hinhAnh = req.file ? `/images/AnhMonAn/${req.file.filename}` : null;
    
    const foodData = {
      tenMonAn: data.tenMonAn,
      moTa: data.moTa,
      hinhAnh: hinhAnh,
      maLoaiMonAn: data.maLoaiMonAn,
      trangThai: data.trangThai,
      deXuat: data.deXuat,
      bienThe: data.bienThe,
      danhSachMaDanhMuc: data.danhSachMaDanhMuc,
      danhSachMaDeBanh: data.danhSachMaDeBanh,
      danhSachMaTuyChon: data.danhSachMaTuyChon,
    };

    const newFood = await foodService.createFood(foodData);
    res.status(201).json({ 
      message: 'Thêm món ăn thành công', 
      food: newFood 
    });
  } catch (error) {
    console.error('Error in createFood controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const updateFood = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Parse JSON data from multipart form
    const data = JSON.parse(req.body.data);
    
    // Get uploaded file path if new image provided (otherwise keep existing)
    const hinhAnh = req.file ? `/images/AnhMonAn/${req.file.filename}` : data.hinhAnh;
    
    const foodData = {
      moTa: data.moTa,
      hinhAnh: hinhAnh,
      maLoaiMonAn: data.maLoaiMonAn,
      trangThai: data.trangThai,
      deXuat: data.deXuat,
      bienThe: data.bienThe,
      danhSachMaDanhMuc: data.danhSachMaDanhMuc,
      danhSachMaDeBanh: data.danhSachMaDeBanh,
      danhSachMaTuyChon: data.danhSachMaTuyChon,
    };

    const updatedFood = await foodService.updateFood(id, foodData);
    res.status(200).json({ 
      message: 'Cập nhật món ăn thành công', 
      food: updatedFood 
    });
  } catch (error) {
    console.error('Error in updateFood controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const getFoodsAdmin = async (req, res) => {
  try {
    const foods = await foodService.getAllFoodsAdmin();
    res.status(200).json(foods);
  } catch (error) {
    console.error('Error in getFoodsAdmin controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const deleteFood = async (req, res) => {
  try {
    const id = req.params.id;
    await foodService.deleteFood(id);
    res.status(200).json({ message: 'Xóa món ăn thành công' });
  } catch (error) {
    console.error('Error in deleteFood controller:', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { getFoods, getFoodsAdmin, getFoodById, getBestSelling, getFeaturedFoods, createFood, updateFood, deleteFood };
