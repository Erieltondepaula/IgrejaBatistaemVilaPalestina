const configuredApiOrigin = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const pageProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
const pageHostname = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : 'localhost';

export const API_ORIGIN = configuredApiOrigin || `${pageProtocol}//${pageHostname}:5001`;
export const API_BASE_URL = `${API_ORIGIN}/api`;

export const apiUrl = (path: string): string =>
  `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;

export const apiAssetUrl = (path: string): string => {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};