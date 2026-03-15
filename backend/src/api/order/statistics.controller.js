const statsRepo = require('./statistics.repository');
const aiReviewService = require('../../services/aiReviewService');

/**
 * GET /api/orders/statistics/best-selling-products
 * Query params: limit, branchId, startDate, endDate
 */
async function getBestSellingProducts(req, res) {
  try {
    const { limit, branchId, startDate, endDate } = req.query;
    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getBestSellingProducts(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting best selling products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/best-selling-combos
 * Query params: limit, branchId, startDate, endDate
 */
async function getBestSellingCombos(req, res) {
  try {
    const { limit, branchId, startDate, endDate } = req.query;
    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getBestSellingCombos(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting best selling combos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/revenue-by-branch
 * Query params: startDate, endDate
 */
async function getRevenueByBranch(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getRevenueByBranch(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting revenue by branch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/overall-revenue
 * Query params: startDate, endDate, branchId
 */
async function getOverallRevenue(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;
    const options = {};
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getOverallRevenue(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting overall revenue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/order-count-by-period
 * Query params: startDate, endDate, branchId, groupBy (day|week|month|year)
 */
async function getOrderCountByPeriod(req, res) {
  try {
    const { startDate, endDate, branchId, groupBy } = req.query;
    const options = {};
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (groupBy) options.groupBy = groupBy;

    const data = await statsRepo.getOrderCountByPeriod(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting order count by period:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/by-status
 * Query params: startDate, endDate, branchId
 */
async function getOrdersByStatus(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;
    const options = {};
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getOrdersByStatus(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting orders by status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/by-payment-method
 * Query params: startDate, endDate, branchId
 */
async function getOrdersByPaymentMethod(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;
    const options = {};
    if (branchId) options.branchId = parseInt(branchId, 10);
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const data = await statsRepo.getOrdersByPaymentMethod(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting orders by payment method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/dashboard-overview
 * Query params: branchId
 */
async function getDashboardOverview(req, res) {
  try {
    const { branchId } = req.query;
    const options = {};
    if (branchId) options.branchId = parseInt(branchId, 10);

    const data = await statsRepo.getDashboardOverview(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/orders/statistics/revenue-comparison-by-branch
 * Query params: startDate, endDate, groupBy (day|week|month|year)
 */
async function getRevenueComparisonByBranch(req, res) {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (groupBy) options.groupBy = groupBy;

    const data = await statsRepo.getRevenueComparisonByBranch(options);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting revenue comparison by branch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReviewIssueStatistics(req, res) {
  try {
    const { startDate, endDate, analyze, branchId } = req.query;
    const data = await statsRepo.getReviewIssueStatistics({ startDate, endDate, branchId });
    
    if (analyze === 'true') {
      const summary = await aiReviewService.summarizeWeeklyIssues(data);
      data.aiSummary = summary;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting review issue statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
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
};
