import { useEffect } from 'react';
import { companyAssetUrl } from '../utils/companyLogo';

const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const DEFAULT_FAVICON = `${base}favicon.svg`;

export function useCompanyFavicon(faviconPath) {
  useEffect(() => {
    const href = companyAssetUrl(faviconPath) || DEFAULT_FAVICON;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
    link.type = faviconPath ? 'image/png' : 'image/svg+xml';
  }, [faviconPath]);
}
