import { useCallback } from 'react';
// A simple in-memory cache to avoid re-fetching images that have already been requested.
const prefetchCache = new Set<string>();
/**
 * Prefetches an image by creating an Image object and setting its src.
 * This prompts the browser to download the image and store it in its cache.
 * @param url The URL of the image to prefetch.
 */
export function prefetchImage(url: string): void {
  // Ensure we are in a browser environment and the URL is valid.
  if (typeof window === 'undefined' || !url || typeof url !== 'string') {
    return;
  }
  // If we've already initiated a prefetch for this URL, do nothing.
  if (prefetchCache.has(url)) {
    return;
  }
  // Add the URL to our cache to prevent duplicate fetches.
  prefetchCache.add(url);
  // Create a new Image object. This is a lightweight way to trigger an image download.
  const img = new Image();
  img.src = url;
}
/**
 * A React hook that provides a memoized `prefetchImage` function.
 * This is useful for event handlers like `onMouseEnter` to pre-warm images.
 * @returns A memoized function that takes a URL and prefetches the image.
 */
export function usePrefetchImage() {
  return useCallback((url: string) => {
    prefetchImage(url);
  }, []);
}