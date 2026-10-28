import { useEffect, useState, type RefObject } from 'react';

/** The element's content width, kept up to date with ResizeObserver; `fallback` until measured. */
export function useElementWidth(ref: RefObject<Element | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const measured = Math.round(entry?.contentRect.width ?? 0);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}
