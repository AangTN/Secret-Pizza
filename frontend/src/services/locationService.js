import axios from 'axios';

const BASE = 'https://open.oapi.vn/location';

function normalize(item) {
  // try common keys, fall back to whole object stringified id
  const code = (item?.code ?? item?.id ?? item?.province_code ?? item?.district_code ?? item?.ward_code);
  const name = item?.name ?? item?.title ?? item?.province_name ?? item?.district_name ?? item?.ward_name;
  return { code: String(code ?? ''), name: String(name ?? '') };
}

export async function getProvinces() {
  try {
    // request a reasonably large page to ensure full list is returned
    const res = await axios.get(`${BASE}/provinces?size=100`);
    const data = res.data || [];
    if (Array.isArray(data)) return data.map(normalize);
    // some endpoints wrap data inside `data` key
    if (Array.isArray(data.data)) return data.data.map(normalize);
    return [];
  } catch (err) {
    // console.warn('getProvinces failed', err);
    return [];
  }
}

export async function getDistricts(provinceId) {
  if (!provinceId) return [];
  try {
    // district lists can be large for big provinces — request larger page
    const res = await axios.get(`${BASE}/districts/${provinceId}?size=1000`);
    const data = res.data || [];
    if (Array.isArray(data)) return data.map(normalize);
    if (Array.isArray(data.data)) return data.data.map(normalize);
    return [];
  } catch (err) {
    // console.warn('getDistricts failed', err);
    return [];
  }
}

export async function getWards(districtId) {
  if (!districtId) return [];
  try {
    // wards can be many; request larger page size
    const res = await axios.get(`${BASE}/wards/${districtId}?size=1000`);
    const data = res.data || [];
    if (Array.isArray(data)) return data.map(normalize);
    if (Array.isArray(data.data)) return data.data.map(normalize);
    return [];
  } catch (err) {
    // console.warn('getWards failed', err);
    return [];
  }
}

export default {
  getProvinces,
  getDistricts,
  getWards,
};
