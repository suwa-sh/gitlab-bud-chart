/**
 * Frontend proxy configuration utilities
 */

export interface ProxyConfig {
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
}

/**
 * Get proxy configuration from environment variables
 */
export function getProxyConfig(): ProxyConfig {
  return {
    httpProxy: import.meta.env.VITE_HTTP_PROXY,
    httpsProxy: import.meta.env.VITE_HTTPS_PROXY,
    noProxy: import.meta.env.VITE_NO_PROXY,
  };
}

/**
 * Check if a URL should bypass proxy based on NO_PROXY setting
 */
export function shouldBypassProxy(url: string, noProxy?: string): boolean {
  if (!noProxy) return false;
  
  const hostname = new URL(url).hostname;
  const noProxyHosts = noProxy.split(',').map(host => host.trim());
  
  return noProxyHosts.some(noProxyHost => {
    if (noProxyHost.startsWith('.')) {
      // Domain suffix match (e.g., .example.com)
      return hostname.endsWith(noProxyHost.substring(1));
    } else {
      // Exact match
      return hostname === noProxyHost;
    }
  });
}

/**
 * Log proxy configuration for debugging
 */
export function logProxyConfig(): void {
  const config = getProxyConfig();
  
  if (config.httpProxy || config.httpsProxy) {
    console.log('Proxy configuration detected:');
    if (config.httpProxy) {
      console.log(`  HTTP_PROXY: ${config.httpProxy}`);
    }
    if (config.httpsProxy) {
      console.log(`  HTTPS_PROXY: ${config.httpsProxy}`);
    }
    if (config.noProxy) {
      console.log(`  NO_PROXY: ${config.noProxy}`);
    }
  }
}

/**
 * Get API base URL with proxy considerations
 */
export function getApiBaseUrl(): string {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const defaultUrl = 'http://localhost:8000';
  
  const baseUrl = viteApiUrl || defaultUrl;
  
  // Log proxy configuration if in development
  if (import.meta.env.DEV) {
    logProxyConfig();
    console.log(`API Base URL: ${baseUrl}`);
  }
  
  return baseUrl;
}