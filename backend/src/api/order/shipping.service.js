const { geocodeAddress } = require('../../utils/goong');
const { haversineKm, estimateEtaMinutes } = require('../../utils/geo');
const { findAllBranchesWithCoords } = require('./shipping.repository');

const quoteCache = new Map();
const QUOTE_CACHE_TTL_MS = 2 * 60 * 1000;
const QUOTE_CACHE_MAX_ENTRIES = 500;

function normalizeAddressPart(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildQuoteCacheKey({ soNhaDuong, phuongXa, quanHuyen, thanhPho }) {
  return [soNhaDuong, phuongXa, quanHuyen, thanhPho]
    .map(normalizeAddressPart)
    .join('|');
}

function getCachedQuote(cacheKey) {
  if (!cacheKey) return null;

  const entry = quoteCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() > entry.expireAt) {
    quoteCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function setCachedQuote(cacheKey, value) {
  if (!cacheKey) return;

  if (quoteCache.size >= QUOTE_CACHE_MAX_ENTRIES) {
    const firstKey = quoteCache.keys().next().value;
    if (firstKey !== undefined) {
      quoteCache.delete(firstKey);
    }
  }

  quoteCache.set(cacheKey, {
    value,
    expireAt: Date.now() + QUOTE_CACHE_TTL_MS,
  });
}

function calcShippingFee(distanceKm) {
  if (distanceKm < 3) {
    return { fee: 15000, rule: 'under_3km' };
  }
  if (distanceKm <= 7) {
    return { fee: 25000, rule: '3_to_7km' };
  }
  if (distanceKm > 20) {
    return { fee: null, rule: 'over_20km' };
  }
  // Over 7km and <= 20km: 7,000 VND per km beyond 7km
  const extraKm = Math.max(0, Math.ceil(distanceKm - 7));
  const fee = 25000 + extraKm * 7000;
  return { fee, rule: 'over_7km' };
}

function buildFullAddress({ soNhaDuong, phuongXa, quanHuyen, thanhPho }) {
  return [soNhaDuong, phuongXa, quanHuyen, thanhPho].filter(Boolean).join(', ');
}

async function quoteShipping({ soNhaDuong, phuongXa, quanHuyen, thanhPho }) {
  const apiKey = process.env.MAPS_API_KEY;
  const cacheKey = buildQuoteCacheKey({ soNhaDuong, phuongXa, quanHuyen, thanhPho });
  const cachedQuote = getCachedQuote(cacheKey);
  if (cachedQuote) {
    return cachedQuote;
  }

  const address = buildFullAddress({ soNhaDuong, phuongXa, quanHuyen, thanhPho });

  // 1) Geocode customer address
  const geo = await geocodeAddress(address, apiKey);
  if (!geo) {
    const err = new Error('Địa chỉ không hợp lệ hoặc không tìm thấy trên bản đồ');
    err.status = 400;
    throw err;
  }

  // 2) Load branches and compute nearest
  const branches = await findAllBranchesWithCoords();
  if (!branches || branches.length === 0) {
    const err = new Error('Không có chi nhánh nào khả dụng');
    err.status = 500;
    throw err;
  }

  let nearest = null;
  let minDistance = Infinity;
  for (const b of branches) {
    const d = haversineKm(geo.lat, geo.lng, Number(b.ViDo), Number(b.KinhDo));
    if (d < minDistance) {
      minDistance = d;
      nearest = { ...b };
    }
  }

  const distanceKm = Number(minDistance.toFixed(2));

  // 3) Apply fee rules
  const { fee, rule } = calcShippingFee(distanceKm);

  if (rule === 'over_20km') {
    const result = {
      canShip: false,
      message: 'Khoảng cách > 20km, hiện không hỗ trợ giao hàng',
      distanceKm,
      fee: null,
      etaMinutes: null,
      currency: 'VND',
      branch: nearest,
      customerLocation: { lat: geo.lat, lng: geo.lng, address },
      rule,
    };

    setCachedQuote(cacheKey, result);
    return result;
  }

  // Base travel time (no prep) + extra 15 minutes buffer
  const travelMinutes = estimateEtaMinutes(distanceKm, 30, 0);
  const etaMinutes = Math.max(0, Math.round(travelMinutes + 15));

  const result = {
    canShip: true,
    distanceKm,
    fee,
    travelMinutes,
    etaMinutes,
    currency: 'VND',
    branch: nearest,
    customerLocation: { lat: geo.lat, lng: geo.lng, address },
    rule,
  };

  setCachedQuote(cacheKey, result);
  return result;
}

module.exports = { quoteShipping };
