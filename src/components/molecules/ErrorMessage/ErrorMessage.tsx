import { motion } from 'motion/react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { ERROR_MESSAGES } from '../../../lib/errorMessages';
import type { AnalysisErrorCode } from '../../../lib/types';
import styles from './ErrorMessage.module.scss';

export interface ErrorMessageProps {
  code: AnalysisErrorCode;
  onRetry: () => void;
}

/** Plain-language error with a way to try again (FR-025). */
export function ErrorMessage({ code, onRetry }: ErrorMessageProps) {
  return (
    <motion.div
      role="alert"
      className={styles.error}
      // A short shake; MotionConfig turns transform animations off under reduced motion.
      animate={{ x: [0, -8, 8, -5, 5, 0] }}
      transition={{ duration: 0.4 }}
    >
      <span className={styles.icon}>
        <Icon name="alert" size={24} />
      </span>
      <Text className={styles.message}>{ERROR_MESSAGES[code]}</Text>
      <Button variant="secondary" leadingIcon={<Icon name="refresh" />} onClick={onRetry}>
        Choose another book
      </Button>
    </motion.div>
  );
}
