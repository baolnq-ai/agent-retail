const localApiHosts = new Set(['127.0.0.1', 'localhost', '0.0.0.0']);

export function resolveBrowserApiBaseUrl(configuredApiBaseUrl: string): string {
  const trimmedUrl = configuredApiBaseUrl.replace(/\/$/, '');
  if (typeof window === 'undefined') return trimmedUrl;

  try {
    const apiUrl = new URL(trimmedUrl);
    if (!localApiHosts.has(apiUrl.hostname)) return apiUrl.toString().replace(/\/$/, '');

    if (!localApiHosts.has(window.location.hostname)) {
      return window.location.origin.replace(/\/$/, '');
    }

    if (apiUrl.port === window.location.port) {
      return window.location.origin.replace(/\/$/, '');
    }

    apiUrl.hostname = window.location.hostname;
    if (window.location.protocol === 'https:') apiUrl.protocol = 'https:';
    return apiUrl.toString().replace(/\/$/, '');
  } catch {
    return trimmedUrl;
  }
}
