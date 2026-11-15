import { useEffect, useState, type RefObject } from 'react';

/** Visibility events only; animation frames stay in CSS. No observer for static bodies. */
export function useVisibleMotion(ref: RefObject<Element | null>, enabled: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const update = () => setVisible(inView && !document.hidden && !reduced.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
    };
  }, [ref, enabled]);
  return enabled && visible;
}
