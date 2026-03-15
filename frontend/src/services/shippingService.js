import { api } from './api';

/**
 * Request a shipping quote from backend shipping service.
 * The backend expected path is POST /api/shipping/quote (proxied by API_BASE_URL in ./api)
 *
 * @param {{ soNhaDuong: string, phuongXa: string, quanHuyen: string, thanhPho: string }} address
 * @returns {Promise<Object>} response data from the shipping service
 */
export async function getShippingQuote(address) {
  try {
    const res = await api.post('/api/shipping/quote', address);
    return res.data;
  } catch (err) {
    // normalize error to throw a clear message for calling code
    if (err?.response?.data) throw err.response.data;
    throw err;
  }
}

export default {
  getShippingQuote,
};
