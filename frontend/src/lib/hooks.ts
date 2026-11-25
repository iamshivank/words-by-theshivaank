import Lenis from 'lenis';
import { useEffect, useState } from 'react';

/** Sets the tab title while mounted. */
export function useDocumentTitle(title: string | null | undefined, siteName = 'Words') {
  useEffect(() => {
    document.title = title ? `${title} · ${siteName}` : `${siteName} · By theshivaank`;
  }, [title, siteName]);
}

/** Sets <meta name="description"> and Open Graph tags while mounted (client side). */
export function useMeta(meta: {
  description?: string | null;
  image?: string | null;
  type?: string;
}) {
  useEffect(() => {
    const set = (attr: 'name' | 'property', key: string, value: string | null | undefined) => {
      if (!value) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };
    set('name', 'description', meta.description);
    set('property', 'og:description', meta.description);
    set('property', 'og:title', document.title);
    set('property', 'og:type', meta.type ?? 'website');
    set('property', 'og:url', window.location.href);
    if (meta.image) set('property', 'og:image', new URL(meta.image, window.location.origin).href);
  }, [meta.description, meta.image, meta.type]);
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(value);
    }, ms);
    return () => {
      window.clearTimeout(t);
    };
  }, [value, ms]);
  return debounced;
}

/** Calm, weighted smooth scrolling (public pages only). Off for reduced motion. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
    });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);
}

/** True while the key combo is the platform's command key (Cmd on Mac, Ctrl elsewhere). */
export function isModKey(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return navigator.platform.toLowerCase().includes('mac') ? event.metaKey : event.ctrlKey;
}
