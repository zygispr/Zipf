import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import styles from './DropOverlay.module.css';

export interface DropOverlayProps {
  visible: boolean;
}

/** Purely visual hint while a file is dragged over the page; keyboard users use the buttons. */
export function DropOverlay({ visible }: DropOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.overlay}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className={styles.card}>
            <Icon name="upload" size={56} />
            <Text variant="lead" className={styles.text}>
              Drop your book to analyze it
            </Text>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
