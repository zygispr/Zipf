import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import styles from './PrivacyNote.module.scss';

/** The privacy guarantee, stated on the upload screen (FR-005). */
export function PrivacyNote() {
  return (
    <Text className={styles.note}>
      <span className={styles.icon}>
        <Icon name="shield" />
      </span>
      Your book never leaves your device and is not saved
    </Text>
  );
}
