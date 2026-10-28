import { MotionConfigContext } from 'motion/react';
import { useContext, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof matchMedia === 'undefined') return () => undefined;
  const query = matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;

/**
 * Whether to skip animations (FR-017). Unlike motion's `useReducedMotionConfig`, which reads the
 * preference once on mount, this follows changes to the OS setting while the page is open.
 * `<MotionConfig reducedMotion="always" | "never">` still overrides the preference.
 */
export function useReducedMotion(): boolean {
  const { reducedMotion } = useContext(MotionConfigContext);
  const preference = useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
  if (reducedMotion === 'always') return true;
  if (reducedMotion === 'never') return false;
  return preference;
}
