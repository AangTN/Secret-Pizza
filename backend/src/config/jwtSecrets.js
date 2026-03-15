const DEFAULT_USER_JWT_SECRET = 'secret-pizza-user-jwt-secret';
const DEFAULT_ADMIN_JWT_SECRET = 'secret-pizza-admin-jwt-secret';

function normalizeAuthScope(scope) {
  return scope === 'admin' ? 'admin' : 'user';
}

function readEnvOrDefault(name, fallbackValue) {
  const value = String(process.env[name] || '').trim();
  return value || fallbackValue;
}

let cachedSecrets = null;

function getJwtSecrets() {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const userSecret = readEnvOrDefault('USER_JWT_SECRET', DEFAULT_USER_JWT_SECRET);
  const adminSecret = readEnvOrDefault('ADMIN_JWT_SECRET', DEFAULT_ADMIN_JWT_SECRET);

  if (userSecret === adminSecret) {
    const error = new Error('USER_JWT_SECRET và ADMIN_JWT_SECRET phải khác nhau');
    error.status = 500;
    throw error;
  }

  cachedSecrets = {
    userSecret,
    adminSecret,
  };

  return cachedSecrets;
}

function getJwtSecretByScope(scope = 'user') {
  const normalizedScope = normalizeAuthScope(scope);
  const { userSecret, adminSecret } = getJwtSecrets();
  return normalizedScope === 'admin' ? adminSecret : userSecret;
}

module.exports = {
  normalizeAuthScope,
  getJwtSecrets,
  getJwtSecretByScope,
};