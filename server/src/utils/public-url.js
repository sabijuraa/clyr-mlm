const INVALID_PLACEHOLDERS = new Set(['${APP_URL}', '${APP_DOMAIN}']);

export function getPublicAppUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_UR,
    process.env.SERVER_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
  ];

  const rawUrl = candidates.find((value) => {
    if (!value) return false;
    const trimmed = value.trim();
    return trimmed && !INVALID_PLACEHOLDERS.has(trimmed);
  });

  const normalized = (rawUrl || 'https://clyr.shop').trim().replace(/\/+$/, '');

  try {
    const url = new URL(normalized);

    if (url.hostname === 'www.clyr.shop') {
      url.hostname = 'clyr.shop';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return 'https://clyr.shop';
  }
}
