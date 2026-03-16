import axios from 'axios';

const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || runtimeOrigin || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout for free tier DB
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest =
      originalRequest?.url === '/api/auth/refresh' || originalRequest?.url === '/api/auth/admin/refresh';

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      const isAdminArea =
        typeof window !== 'undefined' && /^\/admin(\/|$)/.test(window.location?.pathname || '');
      const refreshPath = isAdminArea ? '/api/auth/admin/refresh' : '/api/auth/refresh';
      const authExpiredEventName = isAdminArea ? 'admin-auth-expired' : 'auth-expired';

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_BASE_URL}${refreshPath}`, {}, { withCredentials: true });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Bắt buộc logout nếu refresh failed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(authExpiredEventName));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Retry helper for slow free-tier connections
async function retryRequest(fn, retries = 2, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.response?.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export function assetUrl(path) {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = String(path || '').replace(/^\//, '');
  return `${base}/${p}`;
}

export async function fetchFoods() {
  return retryRequest(async () => {
    // Public endpoint returning available foods for storefront
    const res = await api.get('/api/foods');
    return res.data;
  });
}

// Admin-specific fetch: returns all foods including hidden/inactive for admin UI
export async function fetchFoodsAdmin() {
  return retryRequest(async () => {
    const res = await api.get('/api/foods/admin/all');
    return res.data;
  });
}

export async function fetchBestSellingFoods(categoryId = null) {
  return retryRequest(async () => {
    const params = categoryId ? { categoryId } : {};
    const res = await api.get('/api/foods/best-selling/top', { params });
    return res.data;
  });
}

export async function fetchFeaturedFoods() {
  return retryRequest(async () => {
    const res = await api.get('/api/foods/featured/all');
    return res.data;
  });
}

export async function fetchTypes() {
  return retryRequest(async () => {
    const res = await api.get('/api/types');
    return res.data;
  });
}

export async function fetchCategories() {
  return retryRequest(async () => {
    const res = await api.get('/api/categories');
    return res.data;
  });
}

export async function fetchVariants() {
  return retryRequest(async () => {
    const res = await api.get('/api/variants');
    return res.data;
  });
}

export async function fetchOptionPrices() {
  return retryRequest(async () => {
    const res = await api.get('/api/variants/option-prices');
    return res.data;
  });
}

export async function fetchCrusts() {
  return retryRequest(async () => {
    const res = await api.get('/api/crusts');
    return res.data;
  });
}

export async function fetchSizes() {
  return retryRequest(async () => {
    const res = await api.get('/api/sizes');
    return res.data;
  });
}

export async function fetchOptions() {
  return retryRequest(async () => {
    const res = await api.get('/api/options');
    // API trả về mảng các loại tùy chọn, mỗi loại có mảng TuyChon
    // Flatten để lấy tất cả options
    const data = res.data;
    if (Array.isArray(data)) {
      const allOptions = [];
      data.forEach(type => {
        if (Array.isArray(type.TuyChon)) {
          allOptions.push(...type.TuyChon);
        }
      });
      return allOptions;
    }
    return [];
  });
}

export async function fetchBanners() {
  return retryRequest(async () => {
    const res = await api.get('/api/banners');
    return res.data;
  });
}

export async function fetchBranches() {
  return retryRequest(async () => {
    const res = await api.get('/api/branches');
    return res.data;
  });
}

// Uploads
export async function uploadImage(file) {
  // Accepts a File or Blob; posts multipart/form-data to /api/uploads
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

// Combos
export async function fetchCombos() {
  return retryRequest(async () => {
    const res = await api.get('/api/combos');
    return res.data;
  });
}

export async function fetchCombosAdmin() {
  return retryRequest(async () => {
    const res = await api.get('/api/combos/admin');
    return res.data;
  });
}

export async function fetchOrders() {
  return retryRequest(async () => {
    const res = await api.get('/api/orders');
    return res.data;
  });
}

export async function fetchReviews() {
  return retryRequest(async () => {
    const res = await api.get('/api/reviews');
    return res.data;
  });
}

export async function fetchOrderReviews() {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/reviews');
    return res.data;
  });
}

export async function fetchAllAccounts() {
  return retryRequest(async () => {
    const res = await api.get('/api/users/admin/all-accounts');
    return res.data;
  });
}

export async function fetchComboById(id) {
  return retryRequest(async () => {
    const res = await api.get(`/api/combos/${id}`);
    return res.data;
  });
}

// Vouchers
export async function fetchVoucherByCode(code) {
  return retryRequest(async () => {
    const res = await api.get(`/api/vouchers/${code}`);
    return res.data;
  });
}

// Gifts
export async function fetchGifts() {
  return retryRequest(async () => {
    const res = await api.get('/api/gifts');
    return res.data;
  });
}

// Statistics APIs
export async function fetchBestSellingProducts(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/best-selling-products', { params });
    return res.data;
  });
}

export async function fetchBestSellingCombos(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/best-selling-combos', { params });
    return res.data;
  });
}

export async function fetchRevenueByBranch(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/revenue-by-branch', { params });
    return res.data;
  });
}

export async function fetchOverallRevenue(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/overall-revenue', { params });
    return res.data;
  });
}

export async function fetchOrderCountByPeriod(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/order-count-by-period', { params });
    return res.data;
  });
}

export async function fetchOrdersByStatus(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/by-status', { params });
    return res.data;
  });
}

export async function fetchOrdersByPaymentMethod(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/by-payment-method', { params });
    return res.data;
  });
}

export async function fetchDashboardOverview(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/dashboard-overview', { params });
    return res.data;
  });
}

export async function fetchRevenueComparisonByBranch(params = {}) {
  return retryRequest(async () => {
    const res = await api.get('/api/orders/statistics/revenue-comparison-by-branch', { params });
    return res.data;
  });
}

export async function fetchOptionsAdmin() {
  return retryRequest(async () => {
    const res = await api.get('/api/options/admin');
    return res.data;
  });
}

export async function deleteOption(id) {
  return retryRequest(async () => {
    const res = await api.delete(`/api/options/${id}`);
    return res.data;
  });
}

export async function fetchOptionSizes() {
  return retryRequest(async () => {
    const res = await api.get('/api/options/sizes');
    return res.data;
  });
}

export async function fetchOptionTypes() {
  return retryRequest(async () => {
    const res = await api.get('/api/options/types');
    return res.data;
  });
}

export async function createOption(data) {
  return retryRequest(async () => {
    const res = await api.post('/api/options', data);
    return res.data;
  });
}

export async function fetchOptionById(id) {
  return retryRequest(async () => {
    const res = await api.get(`/api/options/${id}`);
    return res.data;
  });
}

export async function updateOption(id, data) {
  return retryRequest(async () => {
    const res = await api.put(`/api/options/${id}`, data);
    return res.data;
  });
}
