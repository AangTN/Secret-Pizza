const { AsyncLocalStorage } = require('async_hooks');

const requestStore = new AsyncLocalStorage();

function runWithRequestContext(store, callback) {
  return requestStore.run(store, callback);
}

function getRequestContext() {
  return requestStore.getStore();
}

function resolveXCacheValue(cache = {}) {
  if ((cache.hits || 0) > 0) {
    return 'HIT';
  }

  if ((cache.misses || 0) > 0 || (cache.inflightLoads || 0) > 0 || (cache.inflightWaits || 0) > 0) {
    return 'MISS';
  }

  return 'BYPASS';
}

function markCacheEvent(type) {
  const store = getRequestContext();
  if (!store) return;

  if (!store.cache) {
    store.cache = {
      hits: 0,
      misses: 0,
      inflightLoads: 0,
      inflightWaits: 0,
    };
  }

  if (type === 'hit') {
    store.cache.hits += 1;
  } else if (type === 'miss') {
    store.cache.misses += 1;
  } else if (type === 'inflight-load') {
    store.cache.inflightLoads += 1;
  } else if (type === 'inflight-wait') {
    store.cache.inflightWaits += 1;
  }

  const xCacheValue = resolveXCacheValue(store.cache);
  store.xCache = xCacheValue;

  if (typeof store.setXCacheHeader === 'function') {
    store.setXCacheHeader(xCacheValue);
  }
}

module.exports = {
  runWithRequestContext,
  getRequestContext,
  markCacheEvent,
  resolveXCacheValue,
};
