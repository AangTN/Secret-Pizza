const { requireAdmin, requireAuth } = require('../../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrdersByBranchId,
  getOrdersByPhone,
  getAllOrderReviews,
  cancelOrder,
  updateOrderStatus,
  rateOrder,
  getOrderReview,
  cancelOrderByStaff,
} = require('./order.controller');

const {
  getBestSellingProducts,
  getBestSellingCombos,
  getRevenueByBranch,
  getOverallRevenue,
  getOrderCountByPeriod,
  getOrdersByStatus,
  getOrdersByPaymentMethod,
  getDashboardOverview,
  getRevenueComparisonByBranch,
  getReviewIssueStatistics,
} = require('./statistics.controller');

// Create order
router.post('/', createOrder);
// Order of routes matters: specific before generic :id
// Statistics routes (must come before dynamic routes)
router.use('/statistics', requireAdmin);
router.get('/statistics/best-selling-products', getBestSellingProducts);
router.get('/statistics/best-selling-combos', getBestSellingCombos);
router.get('/statistics/revenue-by-branch', getRevenueByBranch);
router.get('/statistics/overall-revenue', getOverallRevenue);
router.get('/statistics/order-count-by-period', getOrderCountByPeriod);
router.get('/statistics/by-status', getOrdersByStatus);
router.get('/statistics/by-payment-method', getOrdersByPaymentMethod);
router.get('/statistics/dashboard-overview', getDashboardOverview);
router.get('/statistics/revenue-comparison-by-branch', getRevenueComparisonByBranch);
router.get('/statistics/review-issues', getReviewIssueStatistics);
// Other specific routes
router.get('/user/:userId', getOrdersByUserId);
router.get('/branch/:branchId', getOrdersByBranchId);
router.get('/phone/:phone', getOrdersByPhone);
// Get all order reviews (joined with orders)
router.get('/reviews', requireAdmin, getAllOrderReviews);
router.get('/', requireAdmin, getAllOrders);
// Update order status (validated)
router.post('/:id/status', requireAdmin, updateOrderStatus);
// Assign shipper to order
router.patch('/:id/assign-shipper', requireAdmin, require('./order.controller').assignShipperToOrder);
// Cancel order (customer)
router.post('/:id/cancel', requireAuth, cancelOrder);
// Rate order - POST /api/orders/:id/rate
router.post('/:id/rate', requireAuth, rateOrder);
// Get order review - GET /api/orders/:id/review
router.get('/:id/review', requireAuth, getOrderReview);
router.get('/:id', getOrderById);
// Cancel order (staff)
router.post('/:id/cancel-staff', requireAdmin, cancelOrderByStaff);

module.exports = router;

