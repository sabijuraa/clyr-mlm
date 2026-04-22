const INVALID_PLACEHOLDERS = new Set([
  '${APP_URL}',
  '${APP_DOMAIN}',
  '${BACKEND_URL}',
  '${SERVER_URL}',
  '${API_URL}',
]);

function normalizePublicUrl(rawUrl, fallback = 'https://clyr.shop') {
  const normalized = (rawUrl || fallback).trim().replace(/\/+$/, '');

  try {
    const url = new URL(normalized);

    if (url.hostname === 'www.clyr.shop') {
      url.hostname = 'clyr.shop';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function isValidCandidate(value) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed && !INVALID_PLACEHOLDERS.has(trimmed);
}

export function getPublicAppUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_UR,
    process.env.SERVER_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
  ];

  const rawUrl = candidates.find(isValidCandidate);
  return normalizePublicUrl(rawUrl);
}

export function getPublicApiUrl(req) {
  const candidates = [
    process.env.BACKEND_URL,
    process.env.SERVER_URL,
    process.env.API_URL,
    process.env.APP_URL,
  ];

  const envUrl = candidates.find(isValidCandidate);
  if (envUrl) {
    return normalizePublicUrl(envUrl);
  }

  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || req.get?.('host');

    if (host) {
      return normalizePublicUrl(`${proto}://${host}`);
    }
  }

  return normalizePublicUrl(null);
}
