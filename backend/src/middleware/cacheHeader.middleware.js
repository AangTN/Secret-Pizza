const { runWithRequestContext } = require('../utils/requestContext');

function cacheHeaderMiddleware(req, res, next) {
  const store = {
    cache: {
      hits: 0,
      misses: 0,
      inflightLoads: 0,
      inflightWaits: 0,
    },
    xCache: 'BYPASS',
    setXCacheHeader(value) {
      if (!res.headersSent) {
        res.setHeader('X-Cache', value);
      }
    },
  };

  runWithRequestContext(store, () => {
    res.setHeader('X-Cache', 'BYPASS');
    next();
  });
}

module.exports = cacheHeaderMiddleware;
