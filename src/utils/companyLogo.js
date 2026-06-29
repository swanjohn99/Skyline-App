const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

/** Build a URL for a company asset path returned by the API. */
export function companyAssetUrl(assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return `${API_BASE}/${String(assetPath).replace(/^\//, '')}`;
}

/** @deprecated use companyAssetUrl */
export function companyLogoUrl(logoPath) {
  return companyAssetUrl(logoPath);
}
