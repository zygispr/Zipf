import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import styles from './Tooltip.module.scss';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface TooltipProps {
  /** Referenced by the anchor's `aria-describedby`. */
  id: string;
  open: boolean;
  /** Anchor point (bottom center of the bubble), relative to the positioned parent. */
  x: number;
  y: number;
  onDismiss: () => void;
  children: ReactNode;
}

/** A small floating label. Its owner opens it on hover and focus; Escape dismisses it. */
export function Tooltip({ id, open, x, y, onDismiss, children }: TooltipProps) {
  const reduceMotion = useReducedMotion();
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="tooltip"
          id={id}
          className={styles.anchor}
          style={{ left: x, top: y, transformOrigin: '0 0' }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <div className={styles.bubble}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
