const DEFAULT_TTL_MS = 60 * 1000;
const DEFAULT_JITTER_RATIO = 0.1;
const { markCacheEvent } = require('./requestContext');

class InMemoryCache {
  constructor({ cleanupIntervalMs = 60 * 1000 } = {}) {
    this.store = new Map();
    this.tagIndex = new Map();
    this.inflight = new Map();
    this.startedAt = Date.now();
    this.stats = this._createEmptyStats();

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, cleanupIntervalMs);

    // Do not keep Node process alive only for cache cleanup.
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  _createEmptyStats() {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      inflightWaits: 0,
      inflightLoads: 0,
      loadErrors: 0,
      evictionsExpired: 0,
      deleteCalls: 0,
      keysDeleted: 0,
      tagInvalidations: 0,
      prefixInvalidations: 0,
      clears: 0,
    };
  }

  _effectiveTtl(ttlMs, jitterRatio) {
    const base = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    const ratio = Number.isFinite(jitterRatio) && jitterRatio >= 0 ? jitterRatio : DEFAULT_JITTER_RATIO;
    if (ratio === 0) return Math.floor(base);

    const delta = base * ratio;
    const min = Math.max(1000, Math.floor(base - delta));
    const max = Math.max(min + 1, Math.floor(base + delta));
    return Math.floor(Math.random() * (max - min)) + min;
  }

  _detachFromTags(key, tags = []) {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;
      keys.delete(key);
      if (keys.size === 0) {
        this.tagIndex.delete(tag);
      }
    }
  }

  cleanupExpired() {
    const now = Date.now();
    let deleted = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expireAt <= now) {
        this.store.delete(key);
        this._detachFromTags(key, entry.tags);
        deleted += 1;
      }
    }

    if (deleted > 0) {
      this.stats.evictionsExpired += deleted;
      this.stats.keysDeleted += deleted;
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses += 1;
      markCacheEvent('miss');
      return { hit: false, value: undefined };
    }

    if (entry.expireAt <= Date.now()) {
      this.store.delete(key);
      this._detachFromTags(key, entry.tags);
      this.stats.misses += 1;
      this.stats.evictionsExpired += 1;
      this.stats.keysDeleted += 1;
      markCacheEvent('miss');
      return { hit: false, value: undefined };
    }

    this.stats.hits += 1;
    markCacheEvent('hit');
    return { hit: true, value: entry.value };
  }

  set(key, value, { ttlMs = DEFAULT_TTL_MS, tags = [], jitterRatio = DEFAULT_JITTER_RATIO } = {}) {
    const existing = this.store.get(key);
    if (existing) {
      this._detachFromTags(key, existing.tags);
    }

    const normalizedTags = Array.isArray(tags)
      ? [...new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim() !== ''))]
      : [];

    const expireAt = Date.now() + this._effectiveTtl(ttlMs, jitterRatio);

    this.store.set(key, {
      value,
      expireAt,
      tags: normalizedTags,
    });

    for (const tag of normalizedTags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(key);
    }

    this.stats.sets += 1;

    return value;
  }

  async getOrSet(
    key,
    loader,
    {
      ttlMs = DEFAULT_TTL_MS,
      tags = [],
      jitterRatio = DEFAULT_JITTER_RATIO,
      cacheNull = false,
    } = {}
  ) {
    const cached = this.get(key);
    if (cached.hit) {
      return cached.value;
    }

    if (this.inflight.has(key)) {
      this.stats.inflightWaits += 1;
      markCacheEvent('inflight-wait');
      return this.inflight.get(key);
    }

    this.stats.inflightLoads += 1;
    markCacheEvent('inflight-load');

    const pending = (async () => {
      try {
        const value = await loader();
        if (typeof value !== 'undefined' && (value !== null || cacheNull)) {
          this.set(key, value, { ttlMs, tags, jitterRatio });
        }
        return value;
      } catch (err) {
        this.stats.loadErrors += 1;
        throw err;
      }
    })();

    this.inflight.set(key, pending);

    try {
      return await pending;
    } finally {
      this.inflight.delete(key);
    }
  }

  delete(key) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    this.store.delete(key);
    this._detachFromTags(key, entry.tags);
    this.stats.deleteCalls += 1;
    this.stats.keysDeleted += 1;
    return 1;
  }

  deleteByTag(tag) {
    if (!tag) return 0;

    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) {
      return 0;
    }

    const keysToDelete = Array.from(keys);
    let deleted = 0;

    for (const key of keysToDelete) {
      deleted += this.delete(key);
    }

    this.tagIndex.delete(tag);
    this.stats.tagInvalidations += 1;
    return deleted;
  }

  deleteByTags(tags = []) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const tag of tags) {
      deleted += this.deleteByTag(tag);
    }
    return deleted;
  }

  deleteByPrefix(prefix) {
    if (!prefix) return 0;

    const keys = Array.from(this.store.keys()).filter((key) => key.startsWith(prefix));
    let deleted = 0;

    for (const key of keys) {
      deleted += this.delete(key);
    }

    if (deleted > 0) {
      this.stats.prefixInvalidations += 1;
    }

    return deleted;
  }

  clear() {
    const size = this.store.size;
    this.store.clear();
    this.tagIndex.clear();
    this.inflight.clear();
    this.stats.clears += 1;
    this.stats.keysDeleted += size;
    return size;
  }

  getStats() {
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeMs: Date.now() - this.startedAt,
      size: {
        keys: this.store.size,
        tags: this.tagIndex.size,
        inflight: this.inflight.size,
      },
      counters: { ...this.stats },
    };
  }

  resetStats({ resetStartedAt = false } = {}) {
    this.stats = this._createEmptyStats();
    if (resetStartedAt) {
      this.startedAt = Date.now();
    }
    return this.getStats();
  }
}

const cacheTtls = {
  HOME: 2 * 60 * 1000,
  BANNERS: 24 * 60 * 60 * 1000,
  CATALOG: 7 * 24 * 60 * 60 * 1000,
  BRANCHES: 24 * 60 * 60 * 1000,
  GIFTS: 30 * 60 * 1000,
  FOODS_LIST: 5 * 60 * 1000,
  FOOD_DETAIL: 10 * 60 * 1000,
  BEST_SELLING: 10 * 60 * 1000,
  FEATURED_FOODS: 5 * 60 * 1000,
  COMBO_LIST: 10 * 60 * 1000,
  COMBO_DETAIL: 10 * 60 * 1000,
  PROMOTIONS: 5 * 60 * 1000,
  VOUCHER_LIST: 60 * 1000,
  VOUCHER_DETAIL: 30 * 1000,
  REVIEWS_BY_FOOD: 2 * 60 * 1000,
  USER_ORDER_LIST: 15 * 1000,
  USER_ORDER_DETAIL: 10 * 1000,
  USER_PROFILE: 60 * 1000,
  AUTH_ME: 60 * 1000,
};

const cacheTags = {
  HOME: 'home',
  BANNERS: 'banners',
  CATALOG: 'catalog',
  CATEGORIES: 'catalog:categories',
  TYPES: 'catalog:types',
  SIZES: 'catalog:sizes',
  CRUSTS: 'catalog:crusts',
  OPTION_TYPES: 'catalog:option-types',
  OPTIONS: 'options',
  VARIANTS: 'variants',
  BRANCHES: 'branches',
  GIFTS: 'gifts',
  FOODS_LIST: 'food:list',
  FOOD_DETAIL: 'food:detail',
  BEST_SELLING: 'food:best-selling',
  FEATURED_FOODS: 'food:featured',
  COMBO_LIST: 'combo:list',
  COMBO_DETAIL: 'combo:detail',
  PROMOTION_LIST: 'promotion:list',
  PROMOTION_DISCOUNTED: 'promotion:discounted',
  PROMOTION_DETAIL: 'promotion:detail',
  VOUCHER_LIST: 'voucher:list',
  VOUCHER_BY_CODE: 'voucher:code',
  REVIEWS_BY_FOOD: 'reviews:food',
  USER_ORDER_LIST: 'order:user-list',
  USER_ORDER_DETAIL: 'order:detail',
  AUTH_ME: 'auth:me',
  USER_PROFILE: 'user:profile',
};

function buildCacheKey(...parts) {
  return parts
    .filter((part) => part !== null && typeof part !== 'undefined')
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0)
    .join(':');
}

const apiCache = new InMemoryCache();

module.exports = {
  apiCache,
  cacheTtls,
  cacheTags,
  buildCacheKey,
};
