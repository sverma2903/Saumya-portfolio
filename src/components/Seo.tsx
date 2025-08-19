import { useEffect } from 'react';
interface SeoProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
}
export function Seo({
  title,
  description,
  ogImage = 'https://www.saumyaverma.com/og-image.png', // A default OG image
  ogType = 'website',
}: SeoProps) {
  useEffect(() => {
    // Prevent DOM/window access during server-side rendering
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const fullTitle = `${title} | Saumya Verma`;
    document.title = fullTitle;
    const setMeta = (nameOrProperty: string, content: string) => {
      let element = document.querySelector(`meta[name="${nameOrProperty}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.querySelector(`meta[property="${nameOrProperty}"]`) as HTMLMetaElement | null;
      }
      if (element) {
        element.setAttribute('content', content);
      } else {
        element = document.createElement('meta');
        if (nameOrProperty.startsWith('og:')) {
          element.setAttribute('property', nameOrProperty);
        } else {
          element.setAttribute('name', nameOrProperty);
        }
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };
    setMeta('description', description);
    setMeta('og:title', fullTitle);
    setMeta('og:description', description);
    setMeta('og:type', ogType);
    setMeta('og:image', ogImage);
    setMeta('og:url', window.location.href);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);
  }, [title, description, ogImage, ogType]);
  return null; // This component does not render anything
}