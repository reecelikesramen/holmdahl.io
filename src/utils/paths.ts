/**
 * Utility functions for handling base URLs and paths in Astro
 */

/**
 * Get the base URL from environment variables
 * This works in both server and client contexts
 */
export function getBaseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

/**
 * Get the full site URL from environment variables
 * Only available during build time in Astro
 */
export function getSiteUrl(): string {
  return import.meta.env.SITE || 'http://localhost:4321';
}

/**
 * Create a path relative to the base URL
 */
export function withBase(path: string): string {
  const base = getBaseUrl();
  // Remove leading slash from path if base already has trailing slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Ensure base ends with slash
  const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
  return `${baseWithSlash}${cleanPath}`;
}

/**
 * Create an absolute URL with site + base + path
 */
export function createAbsoluteUrl(path: string): string {
  const site = getSiteUrl().replace(/\/$/, ''); // Remove trailing slash from site
  const pathWithBase = withBase(path);
  return `${site}${pathWithBase}`;
}

/**
 * Check if a URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.origin !== getSiteUrl().replace(/\/$/, '');
  } catch {
    // If URL() throws, it's likely a relative path
    return false;
  }
} 