const fs = require('fs');
const path = require('path');
const { apiCache, cacheTtls, cacheTags, buildCacheKey } = require('../../utils/cache');

// Path to banners.json
const BANNERS_JSON_PATH = path.join(__dirname, '../../data/banners.json');

function readBannersFromDisk() {
  try {
    if (!fs.existsSync(BANNERS_JSON_PATH)) {
      // Create empty array if file doesn't exist
      fs.writeFileSync(BANNERS_JSON_PATH, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(BANNERS_JSON_PATH, 'utf8');
    const banners = JSON.parse(data);
    return banners;
  } catch (err) {
    console.error('Could not read banners.json:', err.message);
    return [];
  }
}

function getBanners() {
  const cacheKey = buildCacheKey('banners', 'list');
  return apiCache.getOrSet(
    cacheKey,
    () => readBannersFromDisk(),
    {
      ttlMs: cacheTtls.BANNERS,
      tags: [cacheTags.BANNERS, cacheTags.HOME],
    }
  );
}

function writeBanners(banners) {
  try {
    fs.writeFileSync(BANNERS_JSON_PATH, JSON.stringify(banners, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Could not write banners.json:', err.message);
    return false;
  }
}

function addBanner({ AnhBanner, DuongDan }) {
  const banners = readBannersFromDisk();
  // generate new MaBanner as max existing + 1 or timestamp-based id
  const maxId = banners.reduce((m, b) => {
    const id = Number(b.MaBanner || b.id || 0);
    return isNaN(id) ? m : Math.max(m, id);
  }, 0);
  const MaBanner = maxId > 0 ? maxId + 1 : Date.now();
  const newBanner = { MaBanner, AnhBanner: AnhBanner || '', DuongDan: DuongDan || '/' };
  banners.push(newBanner);
  const ok = writeBanners(banners);
  if (!ok) throw new Error('Unable to persist banner');
  apiCache.deleteByTags([cacheTags.BANNERS, cacheTags.HOME]);
  return newBanner;
}

function updateBanner(id, { AnhBanner, DuongDan }) {
  const banners = readBannersFromDisk();
  const idx = banners.findIndex((b) => String(b.MaBanner || b.id) === String(id));
  if (idx === -1) return null;
  const existing = banners[idx];
  const updated = {
    ...existing,
    AnhBanner: typeof AnhBanner !== 'undefined' ? AnhBanner : existing.AnhBanner,
    DuongDan: typeof DuongDan !== 'undefined' ? DuongDan : existing.DuongDan,
  };
  banners[idx] = updated;
  const ok = writeBanners(banners);
  if (!ok) throw new Error('Unable to persist banner update');
  apiCache.deleteByTags([cacheTags.BANNERS, cacheTags.HOME]);
  return updated;
}

function deleteBanner(id) {
  const banners = readBannersFromDisk();
  const idx = banners.findIndex((b) => String(b.MaBanner || b.id) === String(id));
  if (idx === -1) return false;
  banners.splice(idx, 1);
  const ok = writeBanners(banners);
  if (!ok) throw new Error('Unable to persist banner deletion');
  apiCache.deleteByTags([cacheTags.BANNERS, cacheTags.HOME]);
  return true;
}

module.exports = { getBanners, addBanner, updateBanner, deleteBanner };
