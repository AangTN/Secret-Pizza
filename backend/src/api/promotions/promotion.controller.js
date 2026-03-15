const promotionService = require('./promotion.service');

const getAllPromotions = async (req, res) => {
  try {
    const promotions = await promotionService.getAllPromotions();
    res.status(200).json(promotions);
  } catch (error) {
    console.error('Error in getAllPromotions controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getDiscountedFoods = async (req, res) => {
  try {
    const foods = await promotionService.getDiscountedFoods();
    res.status(200).json(foods);
  } catch (error) {
    console.error('Error in getDiscountedFoods controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const getPromotionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const promotion = await promotionService.getPromotionById(id);
    res.status(200).json(promotion);
  } catch (error) {
    console.error('Error in getPromotionById controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const createPromotion = async (req, res) => {
  try {
    const promotion = await promotionService.createPromotion(req.body);
    res.status(201).json(promotion);
  } catch (error) {
    console.error('Error in createPromotion controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const updatePromotion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const promotion = await promotionService.updatePromotion(id, req.body);
    res.status(200).json(promotion);
  } catch (error) {
    console.error('Error in updatePromotion controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const togglePromotionStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { TrangThai } = req.body;
    const promotion = await promotionService.togglePromotionStatus(id, TrangThai);
    res.status(200).json(promotion);
  } catch (error) {
    console.error('Error in togglePromotionStatus controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const updatePromotionFoods = async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const { foodIds } = req.body;
    const result = await promotionService.updatePromotionFoods(promotionId, foodIds);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updatePromotionFoods controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

const deletePromotion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await promotionService.deletePromotion(id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in deletePromotion controller:', error);
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

module.exports = {
  getAllPromotions,
  getDiscountedFoods,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  updatePromotionFoods,
  deletePromotion,
};
