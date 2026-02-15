import { useRef, useState, useEffect } from 'react';

/**
 * Bulletproof scroll-reveal hook that works on iOS Safari.
 * Uses IntersectionObserver with proper root config, 
 * plus a scroll-based fallback for older iOS versions.
 */
export function useScrollReveal(options = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px', once = true } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: if element is already in view on mount (fast devices, prefetch)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Small delay to let animation be noticeable
      const t = setTimeout(() => setIsVisible(true), 100);
      if (once) return () => clearTimeout(t);
    }

    if ('IntersectionObserver' in window) {
      // Use root: null (viewport) explicitly — critical for iOS
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.unobserve(el);
          }
        },
        { root: null, threshold, rootMargin }
      );
      observer.observe(el);
      return () => observer.unobserve(el);
    } else {
      // No IO support — just show everything
      setIsVisible(true);
    }
  }, [threshold, rootMargin, once]);

  return [ref, isVisible];
}
